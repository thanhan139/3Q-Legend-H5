import { describe, expect, it, vi } from 'vitest';
import { RELEASE, parseDeploymentUrl, publishIfCurrent, validateContext, validatePreview } from '../scripts/deploy-staging-preview.mjs';
import { STAGING_ORIGIN } from '../src/config/staging.ts';

const sha = 'a'.repeat(40);
const deployment = () => ({ id: 'dpl_test123', projectId: RELEASE.project, readyState: 'READY', target: null,
  meta: { releaseCommit: sha, releaseBranch: 'main', releasePipeline: RELEASE.pipeline } });
const env = () => ({ GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: RELEASE.repository, GITHUB_SHA: sha,
  VERCEL_ORG_ID: RELEASE.team, VERCEL_PROJECT_ID: RELEASE.project, VERCEL_TOKEN: 'unit-test-placeholder' });

describe('Main Preview release boundary', () => {
  it('publishes to the same canonical origin accepted by both staging APIs', () => {
    expect(`https://${RELEASE.alias}`).toBe(STAGING_ORIGIN);
  });
  it('accepts only the configured main checkout', () => expect(() => validateContext(env(), sha)).not.toThrow());
  it.each([
    ['GITHUB_REF', 'refs/heads/staging'], ['GITHUB_REPOSITORY', 'other/repo'],
    ['GITHUB_SHA', 'bad'], ['VERCEL_ORG_ID', 'other'], ['VERCEL_PROJECT_ID', 'other'], ['VERCEL_TOKEN', ''],
  ])('rejects invalid context %s', (key, value) => expect(() => validateContext({ ...env(), [key]: value }, sha)).toThrow());
  it('rejects a checkout different from the triggering commit', () => expect(() => validateContext(env(), 'b'.repeat(40))).toThrow());
  it('parses only a single safe CLI deployment URL', () => {
    expect(parseDeploymentUrl('https://test.vercel.app\n')).toBe('https://test.vercel.app');
    for (const output of ['https://evil.example', 'https://user:pass@test.vercel.app', 'https://test.vercel.app/path',
      'https://test.vercel.app/?token=example', 'https://a.vercel.app\nhttps://b.vercel.app', ''])
      expect(() => parseDeploymentUrl(output)).toThrow();
  });
  it('accepts the project object shape used by the deployment API', () => {
    const d = deployment(); delete d.projectId; d.project = { id: RELEASE.project };
    expect(() => validatePreview(d, sha)).not.toThrow();
  });
  it.each(['production', 'staging', undefined])('rejects a non-Preview target: %s', target => {
    expect(() => validatePreview({ ...deployment(), target }, sha)).toThrow();
  });
  it.each(['BUILDING', 'ERROR', 'CANCELED', 'BLOCKED'])('does not publish state %s', readyState => {
    expect(() => validatePreview({ ...deployment(), readyState }, sha)).toThrow();
  });
  it('rejects other projects, custom environments and mismatched release metadata', () => {
    for (const d of [{ ...deployment(), projectId: 'other' }, { ...deployment(), customEnvironmentId: 'env_other' },
      { ...deployment(), meta: { ...deployment().meta, releaseCommit: 'b'.repeat(40) } },
      { ...deployment(), meta: { ...deployment().meta, releaseBranch: 'staging' } },
      { ...deployment(), meta: {} }]) expect(() => validatePreview(d, sha)).toThrow();
  });
  it('keeps the live alias when main advanced during the build', async () => {
    const assignAlias = vi.fn();
    expect(await publishIfCurrent({ deployment: deployment(), sha, getMainSha: async () => 'b'.repeat(40), assignAlias }))
      .toEqual({ published: false, reason: 'superseded' });
    expect(assignAlias).not.toHaveBeenCalled();
  });
  it('publishes only the verified current commit to the fixed alias', async () => {
    const assignAlias = vi.fn();
    expect(await publishIfCurrent({ deployment: deployment(), sha, getMainSha: async () => sha, assignAlias }))
      .toEqual({ published: true });
    expect(assignAlias).toHaveBeenCalledExactlyOnceWith('dpl_test123', RELEASE.alias);
  });
  it('never changes an alias when validation or head lookup fails', async () => {
    const assignAlias = vi.fn();
    await expect(publishIfCurrent({ deployment: { ...deployment(), target: 'production' }, sha,
      getMainSha: async () => sha, assignAlias })).rejects.toThrow();
    await expect(publishIfCurrent({ deployment: deployment(), sha,
      getMainSha: async () => { throw new Error('unavailable'); }, assignAlias })).rejects.toThrow();
    expect(assignAlias).not.toHaveBeenCalled();
  });
});
