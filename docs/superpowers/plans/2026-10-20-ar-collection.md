# AR collection and presentation implementation plan

> For agentic workers: use subagent-driven-development for independent viewer work, with root integration and review.

Goal: expand the approved hybrid AR center to ten real GLB assets plus up to three review candidates, enlarge presentation and add controllable motion.

Architecture: keep metadata in a shared public JSON catalog imported by React and fetched by the standalone AR frame. The viewer and runtime load only one selected asset. Reserve entries are opt-in review candidates, never counted in the default public collection.

Tech stack: React, TypeScript, Three.js, MindAR/A-Frame, Playwright, Node tests.

## Tasks

- [x] Acquire eight approved assets through Sketchfab's official download UI. Copy GLB files into public/assets/artifacts, retain creator attribution and verify GLB headers/JSON. Acquire three relevant alternatives when available, record review status and actual hashes/sizes. No viewer extraction.
- [x] Add failing Node tests for catalog IDs, exact ten published entries, reserve isolation, model existence, embedded image bytes and finite buffer ranges. Run `node --test scripts/ar-experience.test.mjs` before implementation.
- [x] Implement public/ar-catalog.json and typed catalog adapter in src/features/ar/arExperience.ts. Keep hat/lamp IDs and existing target indices; new entries explicitly use a shared compiled recognition card. Add per-entry author/source/license/description and status, hash metadata in an audit manifest.
- [x] Improve ArtifactModelViewer.tsx: fit camera to aspect ratio and bounding box, center pivot, stable close zoom, optional auto rotation/AnimationMixer, pause/reset/fullscreen, reduced-motion and tab visibility handling. Validate actual rendered model bounds and movement, not static text alone.
- [x] Update public/ar-runtime.js to fetch/validate catalog, choose exact entry, preserve tracking cleanup/security, scale/rotate via a child pivot and add accessible camera controls. Larger default with bounded adjustable scale; optional motion remains off in AR initially.
- [x] Update ArExperiencePage.tsx and arExperience.css: responsive scrollable collection, dynamic counts/indices, explicit review-candidate toggle, source attribution. Preserve QR/print/current model across modes.
- [x] Extend Playwright cases for all ten assets, three reserve entries, responsive collection, desktop movement/pause/reset/fullscreen and camera scaling/stop. Run test:ar, lint changed files and production build. Inspect screenshots for selected assets.
- [x] Document asset source/license/transforms, reserve status, local URLs and user test instructions. Report actual completed checks and physical-device limits.

User approved the design on 2026-10-20 and authorized 2–3 additional reserve candidates. Execute in the existing local checkout to preserve the running localhost environment and prior uncommitted AR work; create a feature branch without resetting files.
