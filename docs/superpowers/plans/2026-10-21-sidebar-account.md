# Sidebar account implementation

User-approved scope: replace journey CTA with persistent account footer in expanded/collapsed desktop and tablet sidenavs. Reuse auth/avatar/logout and existing routes. Account disclosure provides profile, settings, journey summary, groups/squad, photo frame/share, pricing and role-specific portals. Close on outside pointer, Escape and link selection; restore keyboard focus on Escape. Keep mobile top account UI unchanged. Unify every sidebar selection with a yellow left border and left-to-right tint. Render full logo with object-contain; slogan wraps naturally without ellipsis. Preserve compatibility with existing AppLayout props while no longer forwarding per-page active direction/CTA settings.

Verify: browser expanded/collapsed/tablet/short viewport; real demo profile/settings navigation; Escape/outside close; logo contain, slogan fits, no CTA, consistent left border. Run ESLint, TypeScript and production build.

## Verification completed
- ESLint and TypeScript: passed.
- Production build and PWA generation: passed (existing large chunk warning remains).
- Real demo session in Edge: account footer, profile/settings navigation, existing personal links, absence of admin portal for regular Premium user, outside/Escape close and focus return passed.
- Expanded/collapsed/tablet/520px-high viewport passed; panel remains below header and within viewport, navigation scrolls independently of fixed account footer.
- Full logo object-contain/no circular border and complete non-ellipsis slogan verified.
- Independent review: no important findings.
- Browser regression command (requires local FE/BE and seeded demo): node scripts/sidenav-account-smoke.mjs.
- Logout from sidebar verified: session token removed and app returns to /login (may include returnTo query from protected route).
