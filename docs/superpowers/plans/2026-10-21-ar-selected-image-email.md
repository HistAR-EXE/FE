# Email AR theo hiện vật đang chọn

User approved refinement: each artifact email action sends only its own full-color recognition photo, artifact name and matching print/camera links. Keep guest AR/downloads public and mail sent only to the authenticated verified account.

- Pass the selected artifact to the email form, show one-photo summary and reset state when artifact/account changes. POST only requestId + artifactId; validate accepted artifact matches selection.
- Resolve artifact against the server-owned ten-card manifest. Compose one inline color image, a direct photo link, print-card link and camera link; no unrelated cards.
- Append V89 adding nullable artifact_id to existing mail attempts; preserve historical bulk rows as NULL. Bind new request IDs to artifact IDs, rejecting changed-artifact or legacy-key reuse rather than claiming success or resending. Keep per-account cooldown/daily quota and UNKNOWN handling.
- Return a non-sensitive unavailableReason and explain mail disabled, test mode or missing public URL in UX. Do not enable external delivery just because the page is on localhost or production.
- Verify failing single-card regression, all ten selections, controller strict payloads, persistence/concurrency, frontend selection change, unavailable reasons, provider uncertainty, lint/build and actual local startup/migration/auth. No external mail sent by automated tests.
