# TimeLens landing implementation — approved 2026-10-23

1. Build a scoped exhibition landing shell, responsive authenticated navigation, interactive depth hero and real product entry routes. Preserve landing analytics and all existing local work.
2. Build the product showcase and narrative sections: remote/onsite journeys, verified technology, Cu Chi pilot, audiences, real HistAR team, FAQ. All claims follow the approved design spec.
3. Convert the supplied TVC to versioned H264/AAC 1440p/1080p MP4 with faststart, extract its poster, add deferred player and extend the LFS asset verification manifest.
4. Integrate and verify TypeScript, scoped lint, build and browser interactions. Check 390/768/1280/1920 widths, reduced motion, media lazy loading, quality changes, playback and range requests. Review specification compliance then code quality and resolve findings.

Ownership: root shell/hero/integration/testing; delegated implementer narrative components first, then media task. No commits/push or changes outside landing/media pipeline needed.

Completed: implementation, spec/quality reviews, full lint/build, regression tests and production-preview browser acceptance. See docs/landing-page-verification.md. No push/deploy.
