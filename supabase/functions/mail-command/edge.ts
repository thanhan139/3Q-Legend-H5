import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { parseMailRequest } from '../../../src/cloud/mailProtocol';
import { corsHeaders, createAllowedOrigins } from '../_shared/cors';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession:false, autoRefreshToken:false },
});
const origins = createAllowedOrigins(Deno.env.get('GAME_ALLOWED_ORIGINS') ?? '', url);

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (origin && !origins.has(origin)) return new Response(null, {status:403});
  const headers = corsHeaders(origin);
  const reply = (status: string, code = 200) => Response.json({status}, {status:code,headers});
  if (request.method === 'OPTIONS') return new Response(null, {status:204,headers});
  if (request.method !== 'POST') return reply('invalid',405);
  const bearer = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!bearer) return reply('unauthorized',401);
  try {
    const {data,error} = await admin.auth.getUser(bearer);
    const user = data?.user;
    if (error || !user || user.is_anonymous || !user.email_confirmed_at) return reply('unauthorized',401);
    const reader = request.body?.getReader();
    if (!reader) return reply('invalid',400);
    const decoder = new TextDecoder();
    let body = '', bytes = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 24_000) { await reader.cancel(); return reply('invalid',413); }
      body += decoder.decode(chunk.value,{stream:true});
    }
    let raw: unknown;
    try { raw = JSON.parse(body + decoder.decode()); } catch { return reply('invalid',400); }
    const input = parseMailRequest(raw);
    if (!input) return reply('invalid',400);
    const {action,...args} = input;
    const result = await admin.rpc('mail_command',{p_uid:user.id,p_action:action,p_args:args});
    if (result.error) throw result.error;
    return Response.json(result.data,{headers});
  } catch {
    console.error('mail-command failed');
    return reply('temporary',503);
  }
});
