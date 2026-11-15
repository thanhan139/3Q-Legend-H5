# M8.1 staging release and QA

## Release state

The release is pending. The local branch is `staging`; HEAD remains `73130a8d6cb4458470c7ec9f6f8e7b46a3acc999`. Avatar/VIP/Lobby changes are still uncommitted. An explicit Git add attempt failed because this agent session cannot create `.git/index.lock`. Native Git also cannot reach GitHub through the configured proxy. Neither restriction was bypassed.

Vercel Git integration is connected to `thanhan139/3Q-Legend-H5`. The latest observed deployment is Preview `dpl_4Pj7dRjdha9ntZBrDUBr5pGPYnxU`, Ready, built from the old commit above. It does **not** contain M8.1.

Stable staging URL: https://3q-legend-h5-staging-git-staging-duongthanhan139-2454.vercel.app

No production deployment or Supabase schema change was performed.

## Diff and credential review

- Reviewed the Lobby scene, profile/VIP modal, scoped CSS, shared UI logout handler and polish documentation.
- No changes to GameStore, Battle Core, SaveV2, game configuration or Supabase backend/schema.
- `.env` is ignored and not tracked; only the empty `.env.example` is tracked. `.env.qa.local` is also excluded by the existing `.env*` rule. Temporary archives, browser state and `.vercel` are ignored.
- Reviewed files contain no detected private key, Supabase secret key, GitHub token, JWT or actual key from the local `.env`. A password-assignment pattern matched the existing Vietnamese password-screen heading; manual inspection confirmed it is UI text, not a credential. Pattern scans are supplemented by source review, not a guarantee against every possible secret format.
- `git diff --check` passed. No files were staged or committed by this session.

## Verification evidence

| Check | Result |
| --- | --- |
| Standard typecheck, regression suite, frontend build | Previously passed for this M8.1 source in Linux Node 22.23.5/npm 10.9.10; 120/120 tests |
| UI at 1280×720 and 844×390 | Previously passed in Chromium using the isolated source render harness; see LOBBY_POLISH.md |
| Real login and profile UID | Pending staging QA credentials and deployment of M8.1 |
| Real logout, reload and session restoration | Pending |
| Relogin preserves roster, resources and progression | Pending |
| VIP cannot grant unconfigured rewards | Source review and isolated UI passed; live-account verification pending |
| Campaign, Welfare and Arena on deployed M8.1 | Pending |
| Deployed M8.1 desktop/mobile UI | Pending |

No isolated harness result is reported as real-account QA. The real-account tests must use the deployed game without bypassing Boot/auth. Keep passwords, verification tokens, auth storage and session recordings out of this report and Git. Do not delete QA accounts.

## Resume release

Run Git outside this restricted agent session, on the current `staging` branch. Stage the five implementation/documentation files plus this report; review the staged file list and diff before committing. Commit message: `Polish M8.1 lobby, player profile and VIP UI`. Push `staging` without force. If rejected due to remote commits, fetch and reconcile them before retrying.

After the push, record the new SHA and verify the Vercel deployment's branch and SHA match, its environment is Preview, and standard typecheck/tests/build pass. Keep using the stable staging URL above and confirm the alias points to the new deployment. If auto-deployment does not start, explicitly create a Git-source Preview from that exact SHA in the existing project.

For real-account QA, supply `QA_EMAIL` and `QA_PASSWORD` via the ignored local `.env.qa.local`, never chat. Confirm any email verification in the account's mailbox. Check `GAME_ALLOWED_ORIGINS` permits the stable staging origin before testing. Baseline roster, wallet, inventory, formation, campaign and tutorial data by UID; compare them after profile/VIP viewing and after logout/relogin. Do not claim an old deployment or a copied browser fixture proves the release passed.
