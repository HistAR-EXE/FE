# Tour music implementation plan

Approved behavior: loop technological-symphony_88314.mp3 at 25% volume throughout the 360 tour. Offer a music toggle; blocked autoplay requires a button click. Stop on leaving the page.

Use a page-owned audio component rendered in the HUD so iframe navigation cannot restart playback. Bundle the MP3 through a source import so production media rewrites cannot intercept it.

- [x] Copy the supplied MP3 to src/assets/audio (SHA-256 matches original).
- [x] Add the audio component and optional HUD control slot, then connect Tour360Page.
- [x] Focused ESLint passed. Browser verification attempted but sandbox denied localhost access (ERR_NETWORK_ACCESS_DENIED).
