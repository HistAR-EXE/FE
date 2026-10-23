# Public experience and navigation release — 2026-10-24

## Scope
- Refresh landing, About HistAR and pricing; preserve original public footer and live pricing/trial behavior.
- Add TVC and Cu Chi intro video, branded feature illustrations, team posters, FAQ Chrono and interactive tunnel preview.
- Refresh portal narration/music and Xua & Nay; keep explicit era links and default 1948.
- Remove quest topnav, retain sidenav, add explicit parent back links.
- Delete retired heritage-detail and secret-story pages. Legacy URLs redirect safely; map quest context is preserved on Explore.
- Direct Cu Chi marketing actions open the actual 360 tour; generic discovery/back actions open Explore.

## Verification
- Production build passes, including SHA256 verification of all five MP4 files.
- ESLint: zero errors; existing repository warnings remain.
- Portal unit tests: 13 passed. History/media tests: 5 passed.
- Station journey and admin source suites passed (admin: 42 tests).
- Landing browser checks: 390/768/1280/1920, real TVC playback, HTTP range, optional WebGL, failure/retry and reduced-motion fallback passed.
- Public pages browser checks: four widths, eight product panels, original footer, mocked live prices, checkout context, trial errors/retry/double-submit/member guards passed; no real payments created.
- Quest navigation browser checks: list/detail/minigame, mobile/desktop, back links and sidebar retained with API failure.
- Portal browser checks: MP3 playback, narration sequencing (speech simulated), quiz/3D music continuity, leaving page stops audio.
- Xua & Nay: pointer/keyboard, spot navigation, snap/reset and responsive layouts passed.
- Retired secret URL redirects to onsite quests while retaining location ID.

## Delivery notes
- MP4 assets are stored using the existing Git LFS rule, not ordinary Git blobs.
- Vercel prebuild can restore LFS pointers from the immutable deployment commit and verifies SHA256; Cu Chi intro was added to that manifest.
- Production payment/AI backends and actual device speech voice availability were not mutated or certified by mock UI checks.
- Existing large-bundle build warnings remain; public 3D modules are lazy-loaded.
