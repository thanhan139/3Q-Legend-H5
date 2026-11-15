import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { makeArenaBattle, type ArenaSquad } from '../../../src/domain/battle';
import { formationPower } from '../../../src/domain/progression';
import type { SaveV2 } from '../../../src/domain/types';
import type { ArenaRequest } from '../../../src/cloud/arenaProtocol';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const origins = new Set((Deno.env.get('GAME_ALLOWED_ORIGINS') ?? '').split(',').map(origin => origin.trim()));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function squad(save: SaveV2): ArenaSquad {
  return {
    formation: save.formation, heroExp: save.heroExp, heroStars: save.heroStars,
    equipment: save.equipment?.filter(item => item.heroId && save.formation.includes(item.heroId)),
  };
}

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
  const attacker = squad(save.state as SaveV2);
  if (!attacker.formation.some(Boolean)) return { status: 'formation' };
  if (input.action === 'publish') return rpc('publish', {
    revision: save.revision, defense: attacker, power: formationPower(save.state as SaveV2),
  });
  const view = await rpc('view');
  if (!view.enrolled || !view.season) return { status: 'unavailable' };
  const { data: target, error: targetError } = await admin.from('arena_players').select('defense,defense_revision')
    .eq('season', view.season).eq('uid', input.opponent).maybeSingle();
  if (targetError) throw targetError;
  if (!target) return { status: 'unavailable' };
  const engine = makeArenaBattle(attacker, target.defense as ArenaSquad);
  const replay = structuredClone(engine.units);
  return rpc('settle', {
    opponent: input.opponent, requestId: input.requestId, season: view.season,
    defenseRevision: target.defense_revision, attackRevision: save.revision,
    won: engine.finish() === 'player', replay,
  });
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (origin && !origins.has(origin)) return new Response(null, { status: 403 });
  const headers = { Vary: 'Origin', 'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
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
