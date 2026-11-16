import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const RELEASE = Object.freeze({
  repository: 'thanhan139/3Q-Legend-H5',
  team: 'team_uRMVLalRh6cpjp1xUMeAZBa3',
  scope: 'duongthanhan139-2454',
  project: 'prj_AOwTnSeNbtGviWj7DdZ1PTB7GYRx',
  alias: '3q-legend-h5-staging-git-staging-duongthanhan139-2454.vercel.app',
  pipeline: 'main-staging-preview',
});

export function validateContext(env, checkoutSha) {
  if (env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_REPOSITORY !== RELEASE.repository)
    throw new Error('This release runs only on the main branch of the configured repository.');
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || checkoutSha !== env.GITHUB_SHA)
    throw new Error('The checkout does not match the workflow commit.');
  if (env.VERCEL_ORG_ID !== RELEASE.team || env.VERCEL_PROJECT_ID !== RELEASE.project)
    throw new Error('Unexpected Vercel team or project.');
  if (!env.VERCEL_TOKEN?.trim())
    throw new Error('Add VERCEL_TOKEN to the repository GitHub Actions Secrets; never put it in source.');
}

export function parseDeploymentUrl(output) {
  const candidates = output.trim().split(/\r?\n/).filter(line => line.startsWith('https://'));
  if (candidates.length !== 1) throw new Error('Vercel did not return exactly one deployment URL.');
  const url = new URL(candidates[0]);
  if (!url.hostname.endsWith('.vercel.app') || url.username || url.password || url.port ||
    url.pathname !== '/' || url.search || url.hash)
    throw new Error('Unexpected deployment URL.');
  return url.origin;
}

export function validatePreview(deployment, sha, requireReady = true) {
  if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id ?? '')) throw new Error('Missing deployment ID.');
  if (deployment.target !== null || deployment.customEnvironmentId || deployment.customEnvironment)
    throw new Error('Refusing to publish a non-Preview deployment.');
  if ((deployment.projectId ?? deployment.project?.id) !== RELEASE.project)
    throw new Error('Deployment belongs to another project.');
  if (deployment.meta?.releaseCommit !== sha || deployment.meta?.releaseBranch !== 'main' ||
    deployment.meta?.releasePipeline !== RELEASE.pipeline)
    throw new Error('Deployment release metadata does not match this workflow commit.');
  const state = deployment.readyState ?? deployment.state;
  if (['ERROR', 'CANCELED', 'BLOCKED'].includes(state)) throw new Error('Deployment did not succeed.');
  if (requireReady && state !== 'READY') throw new Error('Deployment is not Ready.');
}

export async function publishIfCurrent({ deployment, sha, getMainSha, assignAlias }) {
  validatePreview(deployment, sha);
  if (await getMainSha() !== sha) return { published: false, reason: 'superseded' };
  await assignAlias(deployment.id, RELEASE.alias);
  return { published: true };
}

function cli(args, capture = false) {
  return execFileSync('vercel', [...args, '--scope', RELEASE.scope], {
    encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    maxBuffer: 1024 * 1024,
  });
}

async function vercelApi(path, options = {}) {
  const response = await fetch(`https://api.vercel.com${path}?teamId=${RELEASE.team}`, {
    method: options.method ?? 'GET',
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Vercel ${options.method ?? 'GET'} failed: HTTP ${response.status}.`);
  return response.json();
}

async function mainSha() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GitHub read token is missing.');
  const response = await fetch(`https://api.github.com/repos/${RELEASE.repository}/git/ref/heads/main`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Cannot verify current main: HTTP ${response.status}.`);
  const data = await response.json();
  if (!/^[a-f0-9]{40}$/.test(data.object?.sha ?? '')) throw new Error('Invalid main branch response.');
  return data.object.sha;
}

export async function run(mode) {
  if (!['pull', 'publish'].includes(mode)) throw new Error('Usage: deploy-staging-preview.mjs pull|publish');
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  validateContext(process.env, sha);
  try { execFileSync('git', ['diff', '--quiet', 'HEAD', '--'], { stdio: 'ignore' }); }
  catch { throw new Error('Tracked source changed after checkout; refusing to label it with the workflow SHA.'); }
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  if (config.git?.deploymentEnabled !== false) throw new Error('Disable native Git deployments before using this pipeline.');

  if (mode === 'pull') {
    cli(['pull', '--yes', '--environment=preview', '--git-branch=main']);
    const link = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
    if (link.orgId !== RELEASE.team || link.projectId !== RELEASE.project)
      throw new Error('Vercel pull resolved an unexpected project.');
    return;
  }

  if (!existsSync('.vercel/output/config.json')) throw new Error('Preview build output is missing.');
  if (await mainSha() !== sha) { console.log('Newer main commit exists; keeping the current staging alias.'); return; }
  const url = parseDeploymentUrl(cli(['deploy', '--prebuilt', '--yes', '--environment=preview',
    '--meta', `releaseCommit=${sha}`, '--meta', 'releaseBranch=main',
    '--meta', `releasePipeline=${RELEASE.pipeline}`], true));
  const hostname = new URL(url).hostname;
  let deployment;
  for (let attempt = 0; attempt < 120; attempt++) {
    deployment = await vercelApi(`/v13/deployments/${encodeURIComponent(hostname)}`);
    validatePreview(deployment, sha, false);
    if ((deployment.readyState ?? deployment.state) === 'READY') break;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  const result = await publishIfCurrent({ deployment, sha, getMainSha: mainSha,
    assignAlias: (id, alias) => vercelApi(`/v2/deployments/${id}/aliases`, { method: 'POST', body: { alias } }) });
  if (!result.published) { console.log('Build superseded by a newer main commit; alias unchanged.'); return; }
  let confirmed = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const live = await vercelApi(`/v13/deployments/${RELEASE.alias}`);
    if (live.id === deployment.id) { validatePreview(live, sha); confirmed = true; break; }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!confirmed) throw new Error('The stable staging alias did not resolve to the new deployment.');
  console.log(`Staging Preview updated: https://${RELEASE.alias} (commit ${sha})`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Staging Preview: https://${RELEASE.alias}\n\nCommit: ${sha}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
