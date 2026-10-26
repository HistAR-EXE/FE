# Portable Vietnamese portal narration

## Cause
The previous portal used Web Speech `speechSynthesis.getVoices()` and required a Vietnamese (`vi-*`) browser/OS voice. These voices are installed or provided per device and are not Git assets. Music was already an MP3, explaining why teammates could hear music but not narration.

## Fix
29 generated Vietnamese MP3 segments now ship under `public/audio/time-portal/narration-v1/` (about 4 MB). The controller prefers the matching recording and falls back to native Vietnamese speech only if the recording cannot be loaded. Recorded playback supports pause/resume, stale-callback cancellation, music ducking, autoplay recovery, and teardown. No AI server, API key, Python installation or system Vietnamese voice is needed to play the checked-in files.

`portalNarrationManifest.ts` maps segment keys and exact text to immutable, text-hashed filenames. A test checks every current story and quiz against its recording to prevent silently stale narration.

## Regeneration (developer only)
1. `npm run export:portal-narration`
2. In an isolated Python environment: `python -m pip install -r scripts/requirements-portal-narration.txt`
3. `python scripts/generate-portal-narration.py` (requires internet for generation only).
4. `npm run test:portal`
5. Commit the updated manifest AND generated MP3s. Runtime only serves those static files.

The generator uses the vi-VN-HoaiMyNeural voice and reads the public historical text. No credentials or private user data are sent.

## Verification
- 19 portal tests pass, including no-system-voice playback, stale completions, pause/resume, autoplay rejection/retry and complete asset/text coverage.
- Browser test removes both speechSynthesis and SpeechSynthesisUtterance. Actual MP3 narration plays, music ducks, switching stops the old clip, lightbox pauses/resumes and leaving the portal stops audio.
- Browser autoplay restrictions still apply; a required first interaction is surfaced by the existing recovery button.

- Native fallback browser regression passes with recordings intentionally returning 404.
- Timeline progress holds while autoplay is blocked, so the first segment is not skipped before the user gesture.
- Xua & Nay retains the same music element when separate narration clips are created.
- Resume playback rejections are guarded by session/clip identity, preventing stale promises from blocking a newer segment.
