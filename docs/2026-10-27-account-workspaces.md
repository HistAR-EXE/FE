# Teacher, Profile and Settings workspaces (2026-10-27)

Bright blue/white account workspaces share accessible controls, responsive layouts and independent API loading/error states. Profile has overview, per-location journey/achievements, entitlement sources and personal information. Settings has account editing, real authentication/security links, personal/organization plans and history, classroom membership, local consent preferences and current-session logout. Quests no longer show the redundant top Explore button.

Server capabilities govern teacher actions. Micro does not expose Standard/Premium assignment, Live Board/report or group actions. Organization Premium never implies a personal purchase. Join/leave/cancel refresh the full server profile before synchronizing auth. Cancelling B2C ends personal rights immediately; active organization rights remain. Autojoin is limited to one attempt per identity/code. Failed metrics/history requests show unavailable states, never invented zero/empty values.

Profile preserves upstream Heritage creation metadata, share links, returnTo navigation and confirmed deletion. Media follows the upstream R2 proxy/manifest configuration. Settings camera/GPS choices describe application preferences and do not claim to grant/revoke browser permissions.

## Verification

npm ci
npm run test:teacher
npm run test:profile
npm run test:settings
npm run test:heritage-studio
npm run lint
npm run build

Local browser checks: scripts/b2b-fullstack-smoke.mjs, scripts/profile-fullstack-smoke.mjs, scripts/settings-fullstack-smoke.mjs. They require a local backend/database, MAIL_ENABLED=false and the documented synthetic local B2B fixtures; they are not production tests. Some checks create disposable accounts/organization/DEMO subscriptions through local PostgreSQL to verify real permission transitions. Never target a shared database.

Vite defaults to backend http://127.0.0.1:8080. If occupied, set HISTAR_LOCAL_API_TARGET=http://127.0.0.1:18080 before npm run dev. Local smoke scripts use localhost:5173. Keep .env, authentication tokens, screenshots/logs/database backups and real account credentials out of Git. Synthetic passwords in local smoke scripts are test fixtures only.
