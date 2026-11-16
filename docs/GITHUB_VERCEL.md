# Main automatically updates Staging Preview

Repository: https://github.com/thanhan139/3Q-Legend-H5

Stable game URL: https://3q-legend-h5-staging-git-staging-duongthanhan139-2454.vercel.app

Keep the existing Vercel project `3q-legend-h5-staging`, team `duongthanhan139-2454`. This pipeline publishes the frontend only. Supabase source stays in this repo but functions/migrations are deployed separately.

## One-time setup

1. Create a Vercel access token scoped to the owning team, with permission to deploy this project and assign its staging alias. Choose an expiry suitable for QA.
2. Open [GitHub Actions Secrets](https://github.com/thanhan139/3Q-Legend-H5/settings/secrets/actions), choose **New repository secret**, name it **VERCEL_TOKEN**, and enter the value directly there. Never paste the token into chat or source.
3. Commit/push these changes to staging, review them and merge into main. Enable GitHub Actions for the repository. Use reviewed main changes; protect main with required PR review if collaborators contribute.
4. Keep the existing public VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY variables in Vercel's **Preview** environment. The pipeline pulls Preview settings for main. No service-role key is needed or allowed in frontend/workflow source.

Team/project IDs are public constants in the workflow and script. Do not create another project or change the Production branch for this setup.

## Daily workflow

Prepare changes on staging and merge into main. Each main push (including a merge) runs **Main to Staging Preview** in GitHub Actions. You can rerun it manually with main selected under **Run workflow**. Other branches do not publish the shared staging URL.

The workflow uses SHA-pinned checkout/setup-node actions, Node 22 and Vercel CLI 65.14.0. It installs dependencies, pulls Preview settings and executes the normal Vercel build command: typecheck, regression tests and Vite build. The deployment token is absent from game install/build steps.

It uploads prebuilt output with `--environment=preview`. The release script validates project ID, Preview target, Ready state and release SHA. It rechecks GitHub's current main SHA immediately before assigning the fixed alias. Failed/superseded builds leave the old alias intact. Job concurrency serializes publication so an older job cannot overwrite a newer completed release.

Native Vercel Git auto-deployment is disabled by `git.deploymentEnabled: false`. GitHub Actions is the single release mechanism; this avoids duplicate builds or main becoming a Production deployment through Git Integration. Do not add --prod or use Promote.

## First-run acceptance and troubleshooting

- After the files reach main and the secret exists, check Actions for a successful run with the correct SHA. The summary prints only the stable URL and SHA.
- Vercel must show Preview/Ready with metadata releaseCommit, releaseBranch=main and releasePipeline=main-staging-preview. The fixed alias must resolve to that deployment.
- If VERCEL_TOKEN is absent/expired, update the GitHub secret and rerun main. The old working game remains live.
- Runs on other branches are skipped. If main advances while building, the superseded job skips publication and the latest queued main job handles the alias.
- If a build, lookup or validation fails, inspect the error before retrying. Do not use Production as a workaround.
- Automation is not active until these files reach main and the secret is configured. A local build or manual alias change does not prove a real Actions run passed.

## Auth, saves and QA

Use the stable game URL above. Both staging functions allow this origin; individual deployment URLs canonicalize before Auth starts. See [stable connection](STAGING_CONNECTION.md). Supabase Auth Site URL/Redirect URLs should use that origin (root and /?auth=recovery).

M8 migration 20261115130220 is already applied; the connection fix deployed game-command v7 and arena-command v3. Do not reapply migrations, reset data, or deploy Supabase from this frontend workflow.

Keep Deployment Protection enabled. QA must check real login/profile UID, logout/relogin, save/resource retention, unavailable VIP and normal routes after release. UI harness checks are separate from account E2E. Keep .env files (except the empty .env.example), .vercel, tokens and browser state out of Git/artifacts. Never delete QA accounts without confirmation.

## Implementation verification

The pinned action SHAs were checked against their upstream Git tags. In a temporary Linux environment with Node 22.23.5, Vercel CLI 65.14.0 successfully built Preview output without a deployment token available to the build. The final standard regression run passed 169/169 tests, including 22 release guard tests. Actionlint 1.7.7 and YAML branch/concurrency/permission checks passed. Authenticated pull/deploy/alias through GitHub Actions still requires the user's secret and first main workflow run.
