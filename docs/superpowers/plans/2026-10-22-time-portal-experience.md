# Time Portal Experience Implementation Plan

> Execute approved spec in this session using subagent-driven-development; audio controller is isolated from presentation edits.

**Goal:** Bright TimeLens historical storytelling with synchronized Vietnamese narration and user-provided epic background music.
**Architecture:** Separate narration/audio lifecycle from timeline rendering. Maintain premium/quiz/discovery flows. Use existing HTML audio and Web Speech, no new API or dependency.
**Tech Stack:** React19, TypeScript, Tailwind, Playwright, Node test.

- [x] Audio: replace useNarration with cancellation-safe controller; add usePortalAudio controller and PortalAudioControls. Defaults narration/music on unless persisted off. Pass key/text/paused/next callback. Narrate introduction once, date/title/body/dyk, wait for end. Pause/resume without replay, no stale completion; errors/autoplay/no vi voice handled visibly. Music new /audio/time-portal/war-epic-v1.mp3, volume .24, duck to .07 while speaking. Stop on hidden/modal/mode change/unmount. Add meaningful controller tests with fake speech/media and test blocked/latevoice/cancel.
- [x] Asset: copy Downloads/paulyudin-war-epic-182501.mp3 unchanged to public/audio/time-portal/war-epic-v1.mp3; verify SHA256 and decode; no LFS needed for3MB.
- [x] UI: TimelineExplorerView bright blue-white-gold exhibition, top title+audio panel, roomy responsive grid. StoryCard/EraInsights/ChapterRail/NetworkMap adapt readable light colors, preserve historical data and image semantics. Scoped portal CSS only when appropriate; image lightbox remains dark. No global palette replacements.
- [x] Integration: connect audio callback to pending story progress; same pause sources except hover only freezes visual countdown. Auto narration waits voice load and blocked session; quiz waits answer. Preserve lock and callbacks. Remove duplicate narration controls from StoryCard if consolidated.
- [x] Verification: Node audio tests red then green; tsc+target ESLint+build. Playwright mocked speech tests auto text/duck/pause/late voices/cancel/blocked fallback/storage; actual MP3 decode/play; desktop1440/1920, mobile390, smallheight600 no overflow. Verify premium gating, quiz and XuaNay/3D navigation cleanup. Independent spec and quality review. Record real-vs-simulated audio verification limits.
