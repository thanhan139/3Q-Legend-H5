# GitHub and Vercel Preview

Repository: https://github.com/thanhan139/3Q-Legend-H5

Keep frontend, assets, tests, migrations and Edge Function source in this repository. Vercel builds only the frontend. It does not apply migrations or deploy Supabase functions.

## Publish with GitHub Desktop

1. Sign in to GitHub Desktop on this machine. Choose **File → Add local repository** and select this project folder. The local repository has an `origin` pointing to the repository above.
2. **Fetch origin** before pushing. If GitHub already contains commits (including a README or license), preserve them and reconcile the histories before pushing. Do not force push or overwrite remote history.
3. Review the changes and create the initial commit on `main` (for example, `Prepare M8 source and staging Preview deployment`). Push `main`, then choose **Branch → New branch**, create `staging` from `main`, and publish that branch. Both branches must contain `vercel.json` before connecting Vercel. Keep `main` as the GitHub default branch. Future Preview changes are committed and pushed to `staging`.

Preparation status on 2026-11-15: local Git was initialized on `main` and `origin` configured. This agent session could not write `.git/index.lock`, so it did not stage files, create a commit or create `staging`. Native Git could not reach GitHub because its connection was blocked; the remote history has not been inspected. Vercel's connected GitHub namespace list was empty, so the existing Vercel project has not been linked to GitHub. Complete the steps above in GitHub Desktop and Vercel Dashboard; do not assume a push or Git deployment has happened.

Do not publish environment files, `.vite`, `.vercel`, generated function bundles or browser authentication state. `.env.example` intentionally contains empty configuration values. Current assets fit normal Git; Git LFS is not required.

## Connect the existing Vercel project

1. Open the existing project **3q-legend-h5-staging** in team **duongthanhan139-2454**. Do not import a second project.
2. Under **Settings → Git**, connect `thanhan139/3Q-Legend-H5`. If unavailable, configure the Vercel GitHub App and grant access to this repository only.
3. Keep the production branch `main`. The committed `git.deploymentEnabled` configuration disables automatic deployments for all branches except `staging`, including `main`. This does not prevent a manual production deployment: do not select **Deploy to Production**, **Promote**, or run `vercel --prod`.
4. Use repository root, Vite, Node.js **22.x**, install `npm ci`, build `npm run typecheck && npm run test && npm run build`, output `dist`. The project configuration is committed in `vercel.json`; `.nvmrc` records the local Node major version.
5. Keep `VITE_SUPABASE_URL=https://ovvlhcpwothevvoblybx.supabase.co` and the staging `VITE_SUPABASE_PUBLISHABLE_KEY` configured for **Preview**. Never use a service-role/secret key in any `VITE_` variable.
6. Push a staging change to trigger the first Git Preview. Confirm its environment is **Preview**, branch is `staging`, commit matches GitHub, and build/typecheck/regression tests pass. Main pushes must not create production deployments.

The branch configuration follows [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration). The earlier upload-based Preview is separate from this Git integration; its temporary archive upload scripts are not needed for Git builds.

## Supabase staging compatibility

Staging project: `ovvlhcpwothevvoblybx`. Its recorded M8 migration version is `20261115130220`; the matching local file is `20261115130220_m8_onboarding.sql`. The filename was aligned with remote migration history without changing its SQL. Do not apply M8 again or reset the database.

M8 was deployed with `game-command` v5; `arena-command` v1 was retained. Backend changes require separate review and deployment. Frontend Git pushes do not change player data or Supabase secrets.

## Preview authentication and QA

After obtaining the actual Git Preview URL, add its exact origin to `GAME_ALLOWED_ORIGINS` alongside existing localhost entries (comma separated, no trailing slash). Configure the Supabase Site URL to the chosen QA Preview URL, and allow its root and `/?auth=recovery` under Redirect URLs. Update these when the QA URL changes; keep allowed origins scoped to this game.

Keep Vercel Deployment Protection enabled. QA testers need authorized Preview access or an approved temporary share link before testing the game.

Validate real email registration/verification, new-account tutorial, existing-account entry, reload, logout/login, wrong password, expired session, network retry, idempotent rewards and separation of two QA UIDs. Check 1280×720 and 844×390. Do not report these as passed until exercised on the Git Preview. Do not record passwords, verification tokens or browser sessions in the repository, and do not delete QA accounts without confirmation.
