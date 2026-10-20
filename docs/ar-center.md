# Hybrid AR center

Approved scope: option A, desktop 3D + image-tracked AR at home + existing onsite QR.

## Entry points

- `/ar-experience`: public, guest-friendly center, also available from desktop/tablet/mobile navigation in both app modes.
- `?artifact=<catalog-id>&view=home`: printable target plus local QR encoding the matching camera URL. No authentication tokens or user identity are shared.
- `?artifact=<catalog-id>&view=camera`: explicit camera start, tracking status, size/rotation/motion controls, errors and stop. No camera prompt on page load. Hiding the tab stops the experience.
- `?artifact=<catalog-id>&view=target`: uncluttered target page with print styles.
- Exactly ten official models; the legacy `?review=1` flag reveals no additional entries. Removed artifact bookmarks fall back to the helmet.
- `?view=onsite`: explanation and links to existing authenticated `/scan` and onsite quests.
- Legacy `/time-portal/:locationId/ar` and `?view=ar` links lead to the new center.

Remote AR does not record discoveries, grant XP or call onsite check-in. The previous ScanPage AR message → location check-in bridge was removed. QR and GPS check-in behavior remains in ScanPage.

## Assets and attribution

`hat.glb` metadata identifies a **pith helmet / mũ cối**, not a boonie hat. The UI uses the correct name. Author: Long Nguyễn, CC BY 4.0, https://sketchfab.com/3d-models/nva-pith-helmet-mu-coi-sao-vang-7ccc0bdff4ba4af8afcde410758e017d.

`lamp.glb`: Old Oil Lamp, YSIR, CC BY 4.0, https://sketchfab.com/3d-models/old-oil-lamp-46c8a25584664f4cbba0e6b8d63bea57. `lamp-web.glb` retains geometry and metadata while resizing embedded textures to at most 1024 pixels. Size: 27,032,216 → 3,253,264 bytes.

The current runtime uses ten unique color field photographs supplied by the team, indexed 0–9 in `cu-chi-targets.mind`. Original JPEGs are preserved byte for byte; full-frame web copies apply EXIF orientation and resize only. See [photo mapping and reproduction](./ar-photo-targets.md) and [photo audit](./ar-photos-audit.json). Legacy grayscale recovered cards are no longer referenced by the active catalog or camera.

For model texture optimization the legacy `prepare-ar-assets.mjs` remains available. To regenerate current photo targets, use `prepare-ar-photos.mjs` followed by `compile-ar-photos.mjs`; retain original inputs.

Runtime libraries are local fixed copies: A-Frame 1.5.0 and MindAR 1.2.5 in `public/vendor/ar/`, with upstream MIT licenses. Standalone `ar.html` and its runtime are exempt from the SPA fallback. Three.js and the selected model load on demand in desktop mode; camera mode loads only the selected model.

## Validation

- `node --test scripts/ar-experience.test.mjs`: selection, handoff and strict message origin/source/artifact validation.
- `npx playwright test -c playwright.ar.config.ts`: real desktop models, handoff/print, camera consent/messages/errors, mobile layout and real MindAR recognition from a synthetic camera stream using each selected color field photograph.
- `npm run build`, lint, `git diff --check`.

Browser tests simulate camera pixels and permissions; they do not replace real iOS/Android camera checks. Before publishing, test HTTPS on actual phones, printed cards and laptop screens at several angles and lighting levels. Verify stop/restart and denied permission recovery. Localhost QR is intentionally explained as unusable from another device; use a reachable HTTPS deployment for phone handoff.

The models illustrate history education and are not presented as authenticated scans of specific Cu Chi museum artifacts. AR recognition does not submit check-ins or mutate quest rewards. Selected-photo email uses the separately versioned BE AR mail tables (V89/V90); see [the current home/email guide](./ar-home-ux-email.md).

## Initial two-model verification record — 2026-10-20

- `npm run test:ar`: 2 unit tests + 9 browser tests passed. Includes real MindAR recognition and finite rendered model bounds for both recovered targets, plus ended video tracks after stop and target-download failure.
- Changed TypeScript/TSX files and AR browser tests: ESLint passed with no diagnostics.
- Independent review identified asynchronous engine startup failures; resolved with startup watchdog, rejection handling, explicit stream stop and parent frame cleanup.
- Visual inspection confirmed the actual pith helmet and oil-lamp models render over the synthetic camera images. This remains a desktop synthetic-camera check, not physical-phone acceptance.
- Final production build passed, including PWA generation. Static AR HTML/runtime in dist match the final source files. Existing large JavaScript chunk warnings remain.

## Collection expansion — 2026-10-20

The official catalog contains ten models after removing backpack, vintage radio and camping cookset. Flashlight and first-aid box are now published alongside the other eight; there are no review candidates. See [testing and content review](./ar-collection-testing.md), [asset hashes/credits](./ar-assets-audit.json) and [rendered contact sheet](./ar-collection-contact-sheet.png). The initial expansion used a shared hat card; this was superseded by the unique color photo targets described above.

Canonical metadata lives in `src/features/ar/ar-catalog.json`; `predev` and `prebuild` copy it to the standalone runtime's public catalog. Desktop framing uses the projected bounding box and an animation envelope, with pause/resume, reduced motion and fullscreen. AR uses a centered presentation pivot below its tracking anchor; default normalization increased from 0.48 to 0.65 and the user can scale it between 0.5 and 2 times.

On first recognition, AR calibrates that base size against the actual camera projection, reducing it when necessary to keep the model/animation envelope within the viewport. Calibration runs once; subsequent phone movement keeps the anchored scale, while the user's size control remains relative to the fitted base.

Historical validation before final selection: 17 Node tests passed; the complete 22-browser-test suite passed. After adding first-recognition fitting, all 13 real-model camera cases and the engine-failure cleanup case passed again (14 focused browser tests), including projected bounds inside the camera and ended video tracks. All thirteen desktop models were also rendered to create the previews. Physical-phone acceptance remains outstanding.

Final expansion build and PWA generation passed after camera-fit calibration; public runtime/catalog match dist byte for byte. Existing large-chunk warnings remain. Targeted ESLint and git diff whitespace checks passed.

## Official ten-model selection — 2026-10-20

Removed backpack, vintage radio and camping cookset from the canonical/public catalogs and deployable GLB/thumbnail assets. Flashlight and first-aid box are published; the empty review toggle is hidden. The contact sheet and testing guide now describe the official ten.

Verification after selection: all 17 Node tests and targeted ESLint passed. Five browser tests passed: loading all ten real models with motion controls, removed bookmarks and the legacy review flag, QR/print handoff, and real MindAR recognition/rendering/cleanup for flashlight and first-aid box using a synthetic camera. Physical phones remain untested.

## Color field-photo targets — 2026-10-20

Ten distinct team photographs now map one-to-one to ten official models. Originals remain byte-identical to Downloads; color web copies preserve full framing and correct EXIF orientation. See docs/ar-photo-targets.md for the mapping and reproduction guide.

Verification: 19 Node tests, complete 21-browser-test suite including all ten real synthetic-camera recognitions, then three focused card/QR/print cases after correcting portrait A4 height, targeted ESLint, production/PWA build and source/public/dist hash parity all passed. Localhost 5175 serves the new catalog and compiled bundle. Physical phone testing remains outstanding.
