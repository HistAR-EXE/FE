# About and commercial solutions pages — 2026-10-23

Continuation of the approved landing design. Reuses the current landing header/tokens, adds route-aware homepage anchors and active-page state, and keeps the original PublicFooter unchanged on the landing, About and Pricing pages.

## Content and UI

- About: editorial six-person portrait collage, HistAR/TimeLens distinction, mission/vision/values, development stages without invented milestone dates, all six existing team members and roles, interactive capability selector, Cu Chi pilot and contact.
- Pricing: personal plans and comparison, organization plans, classroom trial, heritage-operator proposal route, B2C/B2B/B2B2C value model and FAQ. Existing site/next/plan checkout context is retained. Standard no longer preselects three licenses without a user choice.
- Removed unsupported testimonials, user/partner counts, review scores, claims of eliminating AI hallucinations and universal future-content access.
- Prices, free daily AI quota, organization account/CCU/query limits come from billing public API. Loading, failure/retry and partial Journey-price states are explicit. A paid Journey checkout is unavailable without a validated price; the existing checkout route itself is unchanged.
- Classroom trial retains explicit user action, authorization redirect, pending/error/retry, synchronous duplicate-submit lock and membership guard. UI tests use mocked trial responses and create no real payment.
- Shared responsive shell, keyboard focus, reduced-motion handling, CSS depth/motion and section reveals. No new heavy runtime library.

## Source and local API cross-check

Read-only `/api/billing/public-pricing` local response confirmed Premium 49,000 VND/month, Journey Pass 29,000 VND, free quota **10** AI questions/day, and organization prices/limits. These numbers are not hardcoded into the new page. Old copy said five free questions/day and could drift from the configured API.

Code sources: `features/billing/api.ts`, backend BillingService and UsageQuotaService, existing About team data, actual local public assets and checkout routes.

## Verification commands

`node scripts/public-pages-smoke.mjs` expects the dev server at http://127.0.0.1:5191; override `PUBLIC_PAGES_URL` to use another dev/preview URL. Checks four widths, About capability images, original footer, route-aware navigation, API prices/limits, checkout context, error/retry, partial quotes and mock-only trial states. The API fixture uses the actual `{success:true,data:...}` response contract.

Final command results and runtime limitations are recorded below after verification.

- Scoped ESLint passed for the public shell, header and both pages.
- `npm run build` completed with exit 0, including TypeScript, film size/hash checks, Vite and PWA generation. Existing large-chunk advisories remain. This local machine ran the final PWA hook unusually slowly; no bundler configuration was changed to hide the delay.
- Static compliance/quality review completed; partial Journey-price handling was fixed and re-reviewed with no open findings.
- About capability images, original footer, six team members and four viewport widths were verified in isolated Edge; hero/team screenshots were inspected. Breadcrumb separation and shared scroll reveals were refined afterward.
- Production-preview browser checks verified About and Pricing at 390/768/1280/1920, navigation, six members, capability images, original footer, API-driven prices/quotas, checkout query context, no forced license count, comparison disclosure and unauthenticated trial redirect. Screenshots of both heroes, team, individual plans and organization plans were inspected.
- The separate `--flows-only` run passed HTTP failure/retry, partial Journey-price response/recovery, mocked trial failure/success, synchronous double-submit protection, existing membership protection and reduced-motion behavior; zero payment requests. These are UI tests with mocked API responses, not new live payment or Google authentication tests.
- A final mobile-only CSS spacing refinement moves the education orbit card away from the central brand mark. No business logic changed in that refinement.
- Final state: local implementation only, no commit/push/deployment. Existing local backend public-pricing endpoint was checked read-only. Real trial creation and payment were deliberately not performed.
