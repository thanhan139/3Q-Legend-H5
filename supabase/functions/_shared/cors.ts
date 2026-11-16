import { isStagingProject, STAGING_ORIGIN } from '../../../src/config/staging';

export function createAllowedOrigins(configured: string, projectUrl: string): Set<string> {
  const allowed = new Set<string>();
  for (const value of configured.split(',').map(item => item.trim()).filter(Boolean)) {
    try {
      const url = new URL(value);
      // Accept a trailing slash in configuration, but never paths, globs or credentials.
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*')) continue;
      allowed.add(url.origin);
    } catch { /* Invalid configuration entries do not grant access. */ }
  }
  if (isStagingProject(projectUrl)) allowed.add(STAGING_ORIGIN);
  return allowed;
}

export function corsHeaders(origin: string | null) {
  return { Vary: 'Origin', 'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
}
