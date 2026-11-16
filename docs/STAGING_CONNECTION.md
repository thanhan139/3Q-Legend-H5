# Stable staging connection

Use this URL for staging QA and authentication:

https://3q-legend-h5-staging-git-staging-duongthanhan139-2454.vercel.app

The browser bootstrap redirects this project's individual HTTPS deployment URLs to that canonical origin before importing the game or initializing Supabase Auth. It preserves the path, query and fragment on the trusted destination. Localhost, unrelated hosts and other Supabase projects are unchanged. A user switching browser origins may need to sign in again; no server save or old local data is deleted or migrated.

Both Edge Functions now share `createAllowedOrigins` and the same CORS headers. Existing explicit `GAME_ALLOWED_ORIGINS` entries are retained, with whitespace/trailing-slash normalization. Invalid entries and wildcards are ignored. The canonical origin is additionally allowed only when the backend's `SUPABASE_URL` identifies staging project `ovvlhcpwothevvoblybx`. Other Supabase projects receive no built-in staging exception. JWT verification inside each handler, UID authorization and transaction logic are unchanged.

## Deployment evidence

- `game-command` v7 and `arena-command` v3 are ACTIVE on staging. Their existing gateway JWT settings were retained; both handlers still validate bearer tokens with Supabase Auth.
- Live HTTP checks: canonical origin gets OPTIONS 204 and the exact allow-origin header from both functions. An unrelated origin gets 403 without allow-origin. Missing/invalid JWTs return unauthorized, with no gameplay write. The individual M8.1 deployment origin remains denied unless explicitly configured: use the canonical URL instead.
- Node 22.23.5: standard typecheck, both cloud bundles and frontend build passed. The final Vercel build passed 144 regression tests: 24 origin/canonicalization cases and the existing 120 tests. Deployment-scoped Vercel share parameters are removed during canonicalization; Supabase callback parameters are retained.
- Native Git staging remains blocked by this agent session's `.git/index.lock` permissions. The frontend can be deployed from the reviewed working tree using the API, with its source archive fingerprint and base commit recorded separately. It must not be represented as a new Git commit.
- The frontend was deployed from the reviewed working tree as Preview `dpl_A4zFDeVV7EFW9tF9deYvywvRuotf` (Ready). The stable staging alias was assigned to this deployment. The Git base is `4f39f70f91ae91f4bc06ecb8596ed4b902a4ce83`; the source fixes still need a Git commit/push to persist in future Git builds. Project defaults were restored to the standard Git install/build commands after the source upload deployment.
- Frontend source archive SHA256: `af026b339a124bd5bac4328b7c659e0eccd3b863e80cde7708e9f0368ad86c16`. This identifies the uploaded source archive, not a Git commit.
- Chromium on the deployed Preview passed: canonical login screen at 1280×720; browser POST to both real functions returned readable 401/unauthorized rather than a CORS exception; the individual deployment URL redirected to the canonical URL and still showed the login screen; the login card fit 844×390. Vercel access used a temporary deployment-scoped share link, without disabling protection. The share value and browser state are not included in source or this report.
- Browser network recovery check passed: an API request failed while offline; after restoring connectivity the real endpoint returned readable 401/unauthorized, and reloading the deployed page returned HTTP 200. This checks transport recovery without a signed-in account, not preservation of a real account's session/save.

## Auth settings and future pushes

Supabase Auth Site URL and Redirect URLs should use the canonical staging URL (root and `/?auth=recovery`), not a per-deployment hash. The connected tooling does not provide Auth URL configuration, so those Dashboard settings require a project administrator if not already configured. Ordinary password login and Cloud Save CORS do not depend on changing the Auth redirect list.

Commit the bootstrap, shared origin policy, both function entrypoints, tests, HTML entry change and this document to `staging`. Future Git builds then preserve canonicalization. No production deployment or schema change is required. Keep QA passwords/tokens and `.env` files out of Git.

Real-account login/relogin and reward QA remain pending QA credentials; anonymous HTTP checks and isolated UI tests do not prove those flows passed.
