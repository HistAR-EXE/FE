# Personal photo frames implementation plan

Approved design: choose personal photo, choose one of three supplied Cu Chi frames, optionally remove background, adjust placement, preview, save to account, download/share. Retain TimeLens visual language and mobile usability.

1. Inspect supplied PNG alpha; prepare transparent window assets without removing decorative dark areas. Bundle these app assets so CDN migration does not omit them.
2. Add a local frame catalog and integrate selection with existing original-photo export. Preserve server frame authorization; local artwork IDs must not be sent as database UUIDs.
3. Implement optional local person segmentation and bounded positioning/zoom. Preview and saved output must use the same compositor and frame window geometry.
4. Diagnose saved creations: authenticated image endpoint, ownership, object URL lifetime, reload and error/retry behavior. Never expose private storage URLs as a substitute for authorization.
5. Add meaningful compositor and browser regressions, run existing photo/profile checks, TypeScript/lint and production build. Verify mobile layouts and saved/downloaded image pixels.

Execution: independent implementation workers may own frame/compositor integration and saved-photo retrieval, with the main worker handling shared page integration and final verification. Preserve unrelated existing workspace changes.
