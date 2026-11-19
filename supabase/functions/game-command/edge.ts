import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { handleGameRequest, type GameBackend } from './handler';
import type { GameIntent } from '../../../src/cloud/gameProtocol';
import { createAllowedOrigins, corsHeaders } from '../_shared/cors';
import { isStagingProject } from '../../../src/config/staging';

const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing environment variable ${key}`);
  return value;
};
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const encoder = new TextEncoder();
const secret = env('GAME_TICKET_SECRET');
if (secret.length < 32) throw new Error('GAME_TICKET_SECRET must contain at least 32 characters');
const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
const allowed = createAllowedOrigins(Deno.env.get('GAME_ALLOWED_ORIGINS') ?? '', env('SUPABASE_URL'));
const legacyApprovals: Record<string, string> = JSON.parse(Deno.env.get('GAME_LEGACY_APPROVALS') ?? '{}');
const legacyAllowed = Object.keys(legacyApprovals).length
  ? (uid: string, digest: string) => Object.hasOwn(legacyApprovals, uid) && legacyApprovals[uid] === digest
  : undefined;

const backend: GameBackend = {
  economyTestEnabled(uid) {
    return isStagingProject(env('SUPABASE_URL')) &&
      (Deno.env.get('SHOP_STAGING_QA_UIDS') ?? '').split(',').some(testUid => testUid.trim() === uid);
  },
  async hasRankedWin(uid, dayStart, dayEnd) {
    const { data, error } = await admin.from('arena_matches').select('request_id')
      .eq('attacker', uid).eq('won', true).gte('played_at', new Date(dayStart).toISOString())
      .lt('played_at', new Date(dayEnd).toISOString()).limit(1);
    if (error) throw error;
    return data.length === 1;
  },
  async claimVip(uid, requestId, revision, command) {
    const {data,error} = await admin.rpc('game_claim_vip', {p_uid:uid,p_request_id:requestId,
      p_expected_revision:revision,p_tier:command.tier,p_kind:command.kind,p_period:command.period});
    if (error) throw error;
    return data;
  },
  async user(token) {
    const { data, error } = await admin.auth.getUser(token);
    return error ? null : data.user;
  },
  async read(uid) {
    const { data, error } = await admin.rpc('game_load_online', { p_uid: uid });
    if (error) throw error;
    return data;
  },
  async receipt(uid, requestId) {
    const { data, error } = await admin.from('economy_ledger').select('request_id')
      .eq('uid', uid).eq('request_id', requestId).maybeSingle();
    if (error) throw error;
    return data !== null;
  },
  async create(uid, state, fingerprint) {
    const { data, error } = await admin.rpc('game_create_online', {
      p_uid: uid, p_state: state, p_fingerprint: fingerprint ?? null,
    });
    if (error) throw error;
    if (data?.status !== 'ok') return data;
    const snapshot = await admin.rpc('game_load_online', { p_uid: uid });
    if (snapshot.error) throw snapshot.error;
    return { ...data, vip: snapshot.data?.vip };
  },
  async commit(uid, requestId, revision, command, state, receipt, tutorial) {
    const { data, error } = await admin.rpc('game_commit_online', { p_uid: uid, p_request_id: requestId,
      p_expected_revision: revision, p_command: command, p_state: state, p_receipt: receipt,
      p_tutorial: tutorial ?? null });
    if (error) throw error;
    return data;
  },
  async sign(message) {
    const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  },
  async verify(message, signature) {
    const bytes = Uint8Array.from(signature.match(/../g) ?? [], byte => parseInt(byte, 16));
    return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(message));
  },
};

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (origin && !allowed.has(origin)) return new Response(null, { status: 403 });
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  const reply = (body: object, status = 200) => Response.json(body, { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ status: 'invalid' }, 405);
  const match = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '');
  if (!match) return reply({ status: 'unauthorized' }, 401);
  try {
    const chunks = request.body?.getReader();
    if (!chunks) return reply({ status: 'invalid' }, 400);
    const decoder = new TextDecoder();
    let body = '', size = 0;
    for (;;) {
      const { done, value } = await chunks.read();
      if (done) break;
      size += value.byteLength;
      if (size > 300_000) {
        await chunks.cancel();
        return reply({ status: 'invalid' }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    let intent: GameIntent;
    try { intent = JSON.parse(body + decoder.decode()); } catch { return reply({ status: 'invalid' }, 400); }
    return reply(await handleGameRequest(intent, match[1], backend, legacyAllowed));
  } catch {
    console.error('game-command transaction failed');
    return reply({ status: 'temporary' }, 503);
  }
});
