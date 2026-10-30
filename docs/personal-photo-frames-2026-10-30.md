# Personal photo frames and saved creations

Approved flow implemented: upload personal image, choose any supplied Cu Chi frame, optionally remove the background locally, drag or adjust zoom/horizontal/vertical placement, review, save, download/share. Existing original-photo and heritage modes remain.

Three PNGs retain their original transparent windows and are bundled under `src/assets/photo-frames/`. Story exports center the square artwork on parchment without stretching or photo bleed. Person cutouts initially contain-fit; normal photos cover-fit. MediaPipe uses a bundled model and the existing vendor runtime. Segmentation is cached per File; no-person and tool failures report an actionable error instead of saving an empty portrait. Original source images are not uploaded for segmentation.

Composed output drives both preview and upload. Local artwork IDs never enter the backend UUID frame field, including queued uploads. Return-to-editor drafts preserve composition options. Stable-stage pointer capture supports dragging across preview refreshes. Editor state resets when ownership changes, and save checks the stored session before upload, queued work and navigation.

Saved creations now read image bytes using the owner-checked authenticated endpoint instead of loading storage URLs directly. Profile and review/share screens support loading/error/retry; object URLs and requests are cleaned up. Sharing sends an image file when supported, otherwise downloads; private storage links are not offered as public share links.

Backend: historic stored URLs are resolved to a validated `creations/...` object key in the configured bucket, regardless of the old public hostname. The old host is never fetched. Existing creation ownership checks remain. Foreign buckets, traversal, encoded path escapes and non-creation paths are rejected.

## Verification

- 12 Node checks passed for geometry, alpha, output/share formats and integration.
- Three editor browser cases passed: all three frames and pixel output, multipart save without local UUID, mobile 320/390px overflow.
- Continuous drag regression passed after moving capture to a stable element.
- Two saved-photo browser cases passed: owner API preview failure/retry and review/share/download.
- Actual MediaPipe browser verification passed: supplied frame compositing, story margins, person foreground/background pixels, cache reuse and no-person rejection.
- 17 backend tests passed: creation media download (2), creation application service (11), heritage context (4). The historical-host regression failed before the backend fix.
- TypeScript, changed-file ESLint and production Vite/PWA build passed. Existing bundle-size warnings remain.

Commands: `npm run test:photo-flow`, `npm run test:photo-editor`, `npm run test:saved-photos`, `npm run test:photo-segmentation`. Backend: `mvn -o -Dtest=CreationMediaDownloadTest,UserCreationAppServiceImplTest,HeritageCreationContextTest test`.

No production deployment or real account writes/external sharing occurred. Browser writes used isolated fixtures. Deploy both FE and BE to apply the fixes on the live website. Missing/deleted storage objects cannot be reconstructed by the URL migration fix. Native share sheet acceptance and photo quality under real mobile conditions remain device checks.
