# AR release verification — 2026-10-21

Integrated onto FE master `836f13d` and BE master `a2937ba`, preserving the team's latest changes.

- ScanPage keeps the new AR styling and the team's optional Lite-pack workflow. Station QR/check-in and offline queue remain separate from remote AR. The team's cache name `histar-media-v2` is unchanged.
- Ten published 3D models and ten unique full-color recognition photographs. Original photos retain their recorded hashes. Removed backpack/radio/cookset bookmarks fall back safely.
- Catalog-based descriptions, author, source, license and illustrative-model notes are visible; flashlight no longer inherits oil-lamp content.
- Email sends one selected photo to the verified account, with matching print/camera links, durable request binding and quota protection.
- Team V88 Vietnamese repair is unchanged. AR migrations are V89/V90. Production defaults to Flyway enabled before Hibernate validation. Hosts explicitly setting FLYWAY_ENABLED=false must enable it or apply migrations before restart.

## Verification

- 20 AR Node tests passed.
- 33 AR browser cases passed across the full run and two focused rechecks, including all ten real MindAR recognizers using synthetic camera pixels. Rechecks restored the onsite quest link and corrected a test selector.
- Full FE lint: zero errors, 17 existing warnings. Final changed-file lint passed. Production build/PWA passed; existing large-chunk warnings remain.
- 42 admin source tests passed.
- Full BE suite: 588 tests, zero failures/errors, three opt-in tests skipped. Then AR mail and Vietnamese repair PostgreSQL tests passed separately.
- Bootstrap/QR scripts: seven passed, one optional workspace-only test skipped because that external convenience script is absent from the standalone BE repo.
- JAR includes ten-card manifest, unchanged team V88, AR V89/V90 and Flyway production configuration. No prototype V88 AR migration is packaged.
- No external emails sent. Physical iOS/Android camera and production inbox acceptance remain manual checks.

Local test database: `timelens_ar_release`. Previous `timelens_ar_local` data and prototype Flyway history were retained. No shared/production database was reset or repaired. Git safety stashes remain local. Environment files, logs and temporary build artifacts are excluded from commits.

Packaged production-profile local smoke also passed: Flyway validation, server startup, demo login HTTP 200, email status MAIL_DISABLED, selected-photo POST HTTP 503, baseline V90 and no leftover integration-test schemas. Local MinIO settings were supplied explicitly for this profile; no uploads or external emails were performed.
