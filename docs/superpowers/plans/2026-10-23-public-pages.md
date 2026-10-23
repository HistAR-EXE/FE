# HistAR Public Pages Implementation Plan

Goal: extend the approved landing brand into accurate, polished About and Solutions/Pricing pages while retaining existing checkout/auth behavior and original footer.
Architecture: shared public-page shell/hooks/styles; existing LandingHeader and PublicFooter; separate about content and pricing state/components. React/TypeScript/CSS, current billing API. Preserve concurrent local landing/portal changes.

- [x] Update shared navigation to route-aware homepage anchors/current-page state; add scoped public shell, reveal/title lifecycle and responsive UI.
- [x] Rebuild AboutPage and about-specific CSS using verified team/assets, mission, stages, interactive capability showcase and contact links.
- [x] Replace PricingPage presentation with live API prices/limits, personal comparison, organization/trial and operator solution; preserve checkout context.
- [x] Add browser acceptance covering content/overflow/navigation/pricing/trial states using mocked API responses; correct the API fixture envelope and verify recovery/partial quote handling.
- [x] Run lint/build, static review, browser checks at 390/768/1280/1920 and reduced-motion; inspect screenshots, document limitations. No push or deploy.

Evidence and scope: docs/public-pages-verification.md. Layout checks and isolated flow checks were completed separately against the production preview. Payment and trial responses are mocked.
