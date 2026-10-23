# Landing page verification — 2026-10-23

Implemented the approved digital heritage exhibition design at `/`. Existing sidebar/time-portal work remains intact.

## Delivered
- Scoped blue/yellow/light landing with responsive public/authenticated header, temporal image layers and pointer depth.
- Optional real Three.js GLB viewer; model requested only after opening, static fallback, reduced-motion support, viewport/tab rendering pause, resource cleanup and catalog attribution.
- Six keyboard-accessible feature tabs, remote/onsite journeys, interactive technology section, Cu Chi pilot, audience groups, six verified team members, eight FAQs and real route/contact links.
- Early TVC with manual play, native fullscreen, hidden download control, quality selection, position/playback preservation, error/retry. No TVC request before clicking, including after scrolling through the page.
- Hero illustration converted from 3,121,889-byte PNG to 357,718-byte WebP for landing only; original retained.

## TVC delivery
Original Downloads file remains unchanged. Source HEVC 2560×1440, 30 fps, duration 158.08 seconds; delivered H264/AAC MP4 with faststart:

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| timelens-tvc-1080-v1.mp4 | 75070076 | 768121dbccb9331bc0a3f91426ff84c1f1f57e6f9844f49629551a73c40d174e |
| timelens-tvc-1440-v1.mp4 | 162173395 | d985daa75f8a20fd5d729f967a5eab59b74bd31e0e0bb92fc09adb8018e174fb |

Versioned assets match the existing Git LFS MP4 rule. Both added to prebuild verification/restoration manifest. Poster extracted from the supplied TVC, not the historical film. Re-encoding is lossy; 1440p preserves source resolution rather than claiming new source detail.

## Verification performed
- `npm run lint`: exit 0, no errors; 16 existing warnings elsewhere in the application.
- `npm run build`: exit 0, including TypeScript, MP4 size/hash checks, Vite/PWA. Existing large-chunk advisory remains; no claim that the entire application bundle was optimized.
- `npm run test:history`: 5/5 passed.
- `npm run test:portal`: 13/13 passed.
- `LANDING_URL=http://127.0.0.1:5192 npm run test:landing:browser`: passed against production build in isolated headless Microsoft Edge.
- Widths 390/768/1280/1920: no document horizontal overflow; mobile menu/Escape, six tab images and keyboard navigation, FAQ.
- Real GLB rendered; video playback advances, seeking works, quality preserves position; 1440p reports 2560px video width; byte range returns 206 with real MP4 ftyp bytes.
- Authenticated header UI uses a mocked profile/session, not a new real Google authentication test. Escape restores the correct trigger; billing link targets existing `/settings`.
- Rapid repeated quality changes preserve playing intent and time.
- Simulated missing WebGL and context loss during delayed GLB load preserve fallback. Simulated video 404 recovers after Retry.
- Screenshots inspected: `test-results/landing/desktop-hero.png`, mobile hero, 3D model, technology, showcase, TVC and fallback.
- Static specification review approved; independent quality findings fixed and re-reviewed with no open findings.

## Scope and run instructions
Local implementation only; no new commit, push or production deployment performed. Public production playback still needs verification after deployment.
Run `npm run dev -- --host 127.0.0.1 --port 5191`, then `npm run test:landing:browser`; override LANDING_URL to use another server/preview. Browser tests mock API responses for UI checks. Native audio listening and real phone camera AR are outside these landing tests.
