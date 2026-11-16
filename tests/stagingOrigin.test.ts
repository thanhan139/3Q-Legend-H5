import { describe, expect, it } from 'vitest';
import { canonicalPreviewUrl, STAGING_ORIGIN, STAGING_SUPABASE_URL } from '../src/config/staging';
import { createAllowedOrigins, corsHeaders } from '../supabase/functions/_shared/cors';

describe('Staging origin boundary', () => {
  it('allows the permanent staging URL even when secrets still list localhost only', () => {
    const origins = createAllowedOrigins('http://localhost:5173', STAGING_SUPABASE_URL);
    expect([...origins]).toEqual(['http://localhost:5173', STAGING_ORIGIN]);
  });
  it('never grants the staging exception to another project', () => {
    expect(createAllowedOrigins('', 'https://other.supabase.co').size).toBe(0);
  });
  it('normalizes whitespace and trailing slashes in existing configuration', () => {
    expect([...createAllowedOrigins(' https://example.com/ , http://localhost:5173/ ', '')])
      .toEqual(['https://example.com', 'http://localhost:5173']);
  });
  it.each(['null', '*', 'https://*.vercel.app', 'https://user:pass@example.com',
    'https://example.com/path', 'https://example.com?key=value', 'https://example.com#hash', 'file:///tmp'])
  ('rejects invalid origin configuration: %s', value => {
    expect(createAllowedOrigins(value, '').size).toBe(0);
  });
  it('does not allow lookalikes, arbitrary previews or the old deployment origin by default', () => {
    const origins = createAllowedOrigins('', STAGING_SUPABASE_URL);
    for (const origin of [STAGING_ORIGIN + '.evil.test', 'https://evil.vercel.app',
      'https://3q-legend-h5-staging-aa4pt8w8c-duongthanhan139-2454.vercel.app']) expect(origins.has(origin)).toBe(false);
  });
  it('echoes only the approved origin when the caller constructs CORS headers', () => {
    expect(corsHeaders(STAGING_ORIGIN)['Access-Control-Allow-Origin']).toBe(STAGING_ORIGIN);
    expect(corsHeaders(null)['Access-Control-Allow-Origin']).toBeUndefined();
    expect(corsHeaders(STAGING_ORIGIN).Vary).toBe('Origin');
  });
});

describe('Preview bootstrap canonicalization', () => {
  const preview = 'https://3q-legend-h5-staging-aa4pt8w8c-duongthanhan139-2454.vercel.app';
  it('retains path, auth query and fragment on the trusted canonical destination', () => {
    expect(canonicalPreviewUrl(preview + '/?auth=recovery&code=test#section', STAGING_SUPABASE_URL))
      .toBe(STAGING_ORIGIN + '/?auth=recovery&code=test#section');
  });
  it('does not loop on the permanent staging URL', () => {
    expect(canonicalPreviewUrl(STAGING_ORIGIN + '/', STAGING_SUPABASE_URL)).toBeUndefined();
  });
  it('cannot turn a double-slash path into an external redirect', () => {
    const result = canonicalPreviewUrl(preview + '//evil.test/path', STAGING_SUPABASE_URL)!;
    expect(new URL(result).origin).toBe(STAGING_ORIGIN);
  });
  it('does not forward a deployment-scoped Vercel share token', () => {
    expect(canonicalPreviewUrl(preview + '/?code=test&_vercel_share=test-share', STAGING_SUPABASE_URL))
      .toBe(STAGING_ORIGIN + '/?code=test');
  });
  it('leaves other Supabase environments unchanged', () => {
    expect(canonicalPreviewUrl(preview, 'https://other.supabase.co')).toBeUndefined();
  });
  it.each(['http://localhost:5173', 'https://example.com', preview + '.evil.test',
    preview.replace('https:', 'http:'), preview + ':8443', preview.replace('https://', 'https://user:pass@')])
  ('does not redirect unrelated or noncanonical origins: %s', href => {
    expect(canonicalPreviewUrl(href, STAGING_SUPABASE_URL)).toBeUndefined();
  });
});
