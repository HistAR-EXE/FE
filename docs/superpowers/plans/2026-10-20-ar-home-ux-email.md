# AR home UX and card email implementation

Approved design: explain QR navigation versus photo recognition; offer full-color image download; distinguish desktop webcam and mobile camera; add optional email pack. Keep current visual system and ten photo/model bindings.

1. Add browser checks for desktop instructions, download bytes, webcam hint, mobile camera, production/local notice, email states. Implement a focused ArHomeExperience component and device-aware guidance.
2. Add authenticated verified-account card-pack email via existing provider, server-owned ten-card manifest and configured HTTPS frontend origin. Use durable per-user request IDs, a 60-second cooldown and three attempts per rolling day; disabled/test mail cannot report success. Email contains ten color-card/open-image/AR links and instructions rather than heavy attachments.
3. Test backend rejection/idempotency/quota/provider failure and controller authentication/body validation. Add frontend states for login, verification, unavailable, pending and provider acceptance. Never auto-send or auto-retry.
4. Run focused browser tests, existing AR regressions, backend tests, build, migrate isolated local DB and restart only the local AR backend. Document environment/test limits and leave external delivery to the user-triggered button.
