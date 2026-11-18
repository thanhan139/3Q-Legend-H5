import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { makeArenaBattle, type ArenaSquad } from '../../../src/domain/battle';
import { arenaDefense, arenaSquad } from './squad';
import { formationPower } from '../../../src/domain/progression';
import type { SaveV2 } from '../../../src/domain/types';
import type { ArenaRequest } from '../../../src/cloud/arenaProtocol';
import { createAllowedOrigins, corsHeaders } from '../_shared/cors';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const origins = createAllowedOrigins(Deno.env.get('GAME_ALLOWED_ORIGINS') ?? '', Deno.env.get('SUPABASE_URL') ?? '');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function command(uid: string, input: ArenaRequest) {
  const rpc = async (action: string, args: object = {}) => {
    const { data, error } = await admin.rpc('arena_command', { p_uid: uid, p_action: action, p_args: args });
    if (error) throw error;
    return data;
  };
  if (input.action === 'view') return rpc('view');
  if (input.action === 'claim' && Number.isSafeInteger(input.season)) return rpc('claim', { season: input.season });
  if (input.action !== 'challenge' && input.action !== 'publish') return { status: 'invalid' };
  if (input.action === 'challenge') {
    if (!uuid.test(input.opponent) || !uuid.test(input.requestId) || input.opponent === uid) return { status: 'invalid' };
    const { data, error } = await admin.from('arena_matches').select('defender,won,points,delta,replay')
      .eq('attacker', uid).eq('request_id', input.requestId).maybeSingle();
    if (error) throw error;
    if (data) return data.defender === input.opponent
      ? { status: 'ok', won: data.won, points: data.points, delta: data.delta, replay: data.replay }
      : { status: 'invalid' };
  }

  const { data: save, error } = await admin.from('player_saves').select('state,revision').eq('uid', uid).maybeSingle();
  if (error) throw error;
  if (!save) return { status: 'missing' };
  const attacker = arenaSquad(save.state as SaveV2);
  if (!attacker.formation.some(Boolean)) return { status: 'formation' };
  if (input.action === 'publish') return rpc('publish', {
    revision: save.revision, defense: attacker, power: formationPower(save.state as SaveV2),
  });
  const view = await rpc('view');
  if (!view.enrolled || !view.season) return { status: 'unavailable' };
  const [published, current] = await Promise.all([
    admin.from('arena_players').select('defense,defense_revision').eq('season', view.season).eq('uid', input.opponent).maybeSingle(),
    admin.from('player_saves').select('state,revision').eq('uid', input.opponent).maybeSingle(),
  ]);
  if (published.error || current.error) throw published.error ?? current.error;
  if (!published.data || !current.data) return { status: 'unavailable' };
  const engine = makeArenaBattle(attacker, arenaDefense(published.data.defense as ArenaSquad, current.data.state as SaveV2));
  const replay = structuredClone(engine.units);
  const { data, error: settleError } = await admin.rpc('arena_settle_jewelry', {p_uid: uid, p_args: {
    opponent: input.opponent, requestId: input.requestId, season: view.season,
    defenseRevision: published.data.defense_revision, defenderSaveRevision: current.data.revision, attackRevision: save.revision,
    won: engine.finish() === 'player', replay,
  }});
  if (settleError) throw settleError;
  return data;
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (origin && !origins.has(origin)) return new Response(null, { status: 403 });
  const headers = corsHeaders(origin);
  const reply = (status: string, code = 200) => Response.json({ status }, { headers, status: code });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply('invalid', 405);
  try {
    const jwt = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!jwt) return reply('unauthorized', 401);
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data.user) return reply('unauthorized', 401);
    if (data.user.is_anonymous || !data.user.email_confirmed_at) return reply('unavailable');
    const reader = request.body?.getReader();
    if (!reader) return reply('invalid', 400);
    let bytes = 0, body = '';
    const decoder = new TextDecoder();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return reply('invalid', 413); }
      body += decoder.decode(chunk.value, { stream: true });
    }
    let input: ArenaRequest;
    try { input = JSON.parse(body + decoder.decode()); } catch { return reply('invalid', 400); }
    if (!input || typeof input !== 'object') return reply('invalid', 400);
    return Response.json(await command(data.user.id, input), { headers });
  } catch {
    console.error('arena-command failed');
    return reply('temporary', 503);
  }
});
