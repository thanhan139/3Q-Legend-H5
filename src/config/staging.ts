// Public deployment identity. These values grant no account or database privileges.
export const STAGING_SUPABASE_URL = 'https://ovvlhcpwothevvoblybx.supabase.co';
export const STAGING_ORIGIN = 'https://3q-legend-h5-staging-git-staging-duongthanhan139-2454.vercel.app';

export function isStagingProject(url: string) {
  return url.trim().replace(/\/$/, '') === STAGING_SUPABASE_URL;
}

/** Canonicalize only this project's HTTPS deployment URLs, before Auth starts. */
export function canonicalPreviewUrl(href: string, projectUrl: string): string | undefined {
  if (!isStagingProject(projectUrl)) return;
  const current = new URL(href);
  if (current.origin === STAGING_ORIGIN || current.protocol !== 'https:' || current.port ||
    current.username || current.password) return;
  if (!/^3q-legend-h5-staging-[a-z0-9]+-duongthanhan139-2454\.vercel\.app$/.test(current.hostname)) return;
  const destination = new URL(STAGING_ORIGIN);
  destination.pathname = current.pathname;
  destination.search = current.search;
  // Vercel share links are scoped to a deployment/alias, unlike Supabase callbacks.
  destination.searchParams.delete('_vercel_share');
  destination.hash = current.hash;
  return destination.href;
}
