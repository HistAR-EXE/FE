# HistAR (TimeLens) — E2E Test Matrix

Bộ kiểm thử end-to-end bằng **Playwright**, chia 3 tầng theo yêu cầu: **BE → FE → FE+BE**.
Spec traceability: [`HISTAR_MASTER_SPEC_v2.md`](../../HISTAR_MASTER_SPEC_v2.md) · Catalog: [`TEST_CASE_CATALOG.md`](TEST_CASE_CATALOG.md).

## Điều kiện chạy

| Thành phần | Yêu cầu |
|---|---|
| BE Spring Boot | Chạy sẵn tại `http://localhost:8080` (`cd BE && mvn spring-boot:run`) |
| FE Vite | Playwright tự khởi động (`npm run dev`, cổng 5173) |
| Docker | postgres (+ minio cho photo upload) |
| AI service | Tuỳ chọn (`:8100`) — chat tests skip nếu AI down |

## Cách chạy

```bash
# Tầng 0 — BE unit/integration (JUnit):
cd BE && mvn test

# Tầng 1 — BE API contract (Playwright request):
cd FE && npm run test:e2e:api

# Tầng 2 — FE UI (routing/guard/render):
cd FE && npm run test:e2e:ui

# Tầng 3 — FE + BE E2E (luồng người dùng thật):
cd FE && npm run test:e2e:full

# Toàn bộ 4 tầng tuần tự:
cd FE && npm run test:all

# Hoặc:
powershell -ExecutionPolicy Bypass -File scripts/run-all-tests.ps1
```

---

## Tầng 0 — BE JUnit (`BE/src/test`)

| File | Type | Kiểm chứng |
|---|---|---|
| CheckinValidationTest | Happy/Bad | GPS trong/xa, QR mismatch |
| AdminQuestEraValidationTest | Bad | BR-24 create quest <3 era |
| VisitSessionServiceTest | Happy | start closes prior; end CLOSED |
| ChatSourcesResolutionTest | Happy | RAG sources ưu tiên; fallback metadata |
| RecommendationControllerTest | Bad | 401 no JWT |
| **EmailVerificationServiceTest** | Happy/Bad | MAIL on/off, confirm once/twice, expiry, cooldown (AUTH-EV-BE10..15) |
| **EmailVerifiedGuardTest** | Happy/Bad | Guard billing/chat |
| **TrialEntitlementGuardTest** | Happy/Bad | Student write blocked on TRIAL_EXPIRED |
| **BillingServiceTest** | Happy/Bad | Org member B2C reject + `reconcileExpiredTrials` |
| **MultiplayerAccessServiceTest** | Happy/Bad | MICRO blocked; STANDARD/PREMIUM allowed |
| **TierAccessServiceTest** / **PhotoFrameAccessServiceTest** | Happy/Bad | FREE vs PREMIUM/org; free frame ids |
| **LeaderboardServiceTest** | Happy | Archived org member read `scope=all` |
| (+ suite legacy ~100 cases) | Mixed | Gamification, quest, unlock, SePay, quota, LMS, auth Google |

**Tổng (2026-07-08):** **117 passed / 0 skipped**

---

## Tầng 1 — BE API (`tests/api/`)

| File | Type | Automated |
|---|---|---|
| auth | Happy/Bad | Yes |
| explore | Happy/Bad | Yes |
| quest | Happy/Bad | Yes |
| discovery | Happy/Bad | Yes |
| gamification | Happy | Yes |
| analytics | Happy/Bad | Yes |
| location-unlock | Happy | Yes |
| **checkin** | Happy/Bad | Yes |
| **visit-session** | Happy/Bad | Yes |
| **recommendations** | Happy/Bad | Yes |
| **chat-api** | Happy/Bad | Yes (AI skip) |
| **email-verification** | Happy/Bad AUTH-E01..05 | Yes |
| **email-verify-flow** | Happy/Bad AUTH-EV01..07 | Yes* (EV04..06 cần MAIL off hoặc skip) |
| **org-trial** | Happy/Bad TRIAL-H01/H02/B01..B03 | Yes* |
| **b2c-expiry-reminder** | Happy B2C-EXP-API-01 | Yes |
| **admin-gaps** | REPLAY-H1/Happy + REPLAY-B*, PANO-H1/B1, CREATIONS | Yes |
| **google-auth-boundary** | AUTH-G01 mock (fixture) | Yes* |
| **chat-fallback** | CHAT-FALLBACK-01 contract + hybrid | Yes* |
| **tour360-modes** | T360-B1 view toggles | Yes |
| **profile-creations-gallery** | CREATIONS-UI-H1 | Yes* |
| **google-auth** | Bad AUTH-G02/G03; optional G10 | Yes |
| **org-provision-student** | Happy ORG-P*; Bad P04/B02 | Yes |
| **org-invite** | Happy/Bad B2B + MON-B09 expired invite | Yes |
| **admin-billing-pricing** | MON-H12..17, MON-B07/B08 | Yes* |
| **admin-era** | Happy/Bad | Yes |
| **photo-viral** | Happy/Bad | Yes (MinIO skip) |
| monetization-billing / quota / helper | Happy/Bad MON-* | Yes* |
| org-join-limit / org-quota-exhaust / ccu-heartbeat | Bad MON-B05/B07, GP-MON-04 | Yes |

**Tổng (2026-07-08):** **102 passed / 4 skipped**

---

## Tầng 2 — FE UI (`tests/ui/`)

| File | Type | Automated |
|---|---|---|
| routing | Happy/Bad | Yes |
| profile-passport | Happy | Yes |
| **heritage-tabs** | Happy FR-03 | Yes |
| **scan-page** | Bad AC-8 | Yes |
| **mode-cta** | Happy | Yes |
| **photo-frame** | Happy AC-9 | Yes |
| **quests-nav** | Happy | Yes |
| **google-login-button** | Happy AUTH-G07 | Yes |
| **routing-guest-gate** | Happy/Bad RT-00/01..04/08/10 | Yes |
| **verify-email** | Happy AUTH-EV-UI01..03, UI07 | Yes |
| mode-nav | Happy | Yes |
| **resilience/checkout-spam** | Happy FE-SPAM-01 | Yes |
| **resilience/photo-frame-spam** | Happy FE-SPAM-02 | Yes |
| **resilience/slow-network-loading** | Happy FE-NAV-02 | Yes |
| **resilience/reload-returnTo** | Happy/Gap FE-RELOAD-01 | Yes |

**Tổng (2026-07-09):** **37 passed / 0 skipped** (target)

---

## Tầng 3 — FE+BE E2E (`tests/e2e/`)

| File | Type | Automated |
|---|---|---|
| auth-login | Happy/Bad | Yes |
| explore | Happy | Yes |
| quest-onsite | Happy AC-4 | Yes |
| profile | Happy | Yes |
| mode-guard | Bad | Yes |
| location-unlock | Happy | Yes |
| tour360-smoke | Happy | Yes |
| time-portal-era | Happy | Yes |
| time-portal-ar-smoke | Happy | Yes |
| chat-sources | Happy | Yes (AI skip) |
| secret-story | Happy | Yes |
| artifacts-locked | Happy | Yes |
| **online-golden-path** | Happy | Yes |
| **offline-golden-path** | Happy | Yes |
| **heritage-remote-quest** | Happy AC-5 | Yes |
| **tour360-dwell** | Happy AC-3 | Yes |
| **photo-frame-upload** | Happy AC-14 | Yes |
| **explore-recommendations** | Happy | Yes |
| **chat-sources-rag** | Happy AC-2 | Yes (AI skip) |
| **monetization-pricing** | Happy/Bad MON | Yes |
| **monetization-gaps** | Happy MON-H10/H14 | Yes |
| **monetization-quota** | MON-H03 real (API) | Yes (AI skip) |
| **ccu-heartbeat** | MON-B05 API | Yes |
| **ccu-limit** | MON-B05 E2E modal | Yes |
| **golden-paths-monetization** | GP-MON-01/02/03 | Yes (AI skip GP-03) |
| **email-verification-checkout** | AUTH-E05 | Yes |
| **email-verify-continue** | AUTH-EV-E2E02..05 | Yes |
| **return-to-deep-link** | RT-05..07/09, AUTH-EV-E2E01 | Yes* |
| **b2c-expiry-banner** | B2C-EXP-UI-01..03 | Yes |
| **quest-stepper-era-paywall** | QS-PAY-* | Yes |
| **classroom-trial** | TRIAL-E2E-H01 | Yes |
| **return-to-deep-link** | RT-05..07/09, AUTH-EV-E2E01 | Yes* |
| **b2c-expiry-banner** | B2C-EXP-UI-01..03 | Yes |
| **quest-stepper-era-paywall** | QS-PAY-* | Yes |
| **classroom-trial** | TRIAL-E2E-H01 | Yes |
| **google-checkout** | AUTH-G09 | Yes |
| **chat-sources-tier** | AC-M04 | Yes |
| **profile-passport-tier** | AC-M06 | Yes |
| **photo-frame-tier** | AC-M09 | Yes |
| **lms-premium** | LMS + GP-HUONG-07 + AC-M14 | Yes |
| **multiplayer-standard** | MP-H01..03 + MP-E2E-JOIN | Yes |
| **classroom-trial-badpaths** | TRIAL-E2E-B01/B02 | Yes |
| **trial-expire-mid-action** | Bad TIME-E2E-01 | Yes* |
| **offline-demo-checkin** | OFF-E2E-DEMO-01 | Yes |
| **chat-ai-offline** | CHAT-B5 | Yes |
| **b2b2c-inquiry** | B2B2C-API-H01/B01/H02 | Yes |
| **assumption-analytics** | ASSUMP-01..03 | Yes |

---

## Tầng 4 — FE + BE + AI (`tests/e2e/` + `tests/api/`)

| File | Type | Prereq |
|---|---|---|
| chat-fullstack | GP-CHAT-01 | AI :8100 + Ollama |
| chat-api / monetization-billing MON-H04/H05 | API + RAG | AI :8100 |
| monetization-quota MON-H03 / golden-paths GP-MON-03 | API quota real | AI :8100 |
| ccu-heartbeat / ccu-limit MON-B05 | CCU full stack | BE + Postgres |
| `scripts/diagnose-chat.ps1` | Smoke | BE + AI + Ollama |

Ma trận monetization: [`docs/MONETIZATION_TEST_MATRIX_v3.md`](../../docs/MONETIZATION_TEST_MATRIX_v3.md)

---

## Auth verify + Guest gate (2026-07-08)

| ID | Layer | Spec | Case |
|----|-------|------|------|
| RT-00 | UI | `routing-guest-gate.spec.ts` | Login page không còn CTA guest-explore |
| RT-01..04 | UI | `routing-guest-gate.spec.ts` | Guest chỉ `/`; protected → `/login?returnTo=` |
| RT-05..06 | E2E | `return-to-deep-link.spec.ts` | returnTo join + explore sau login |
| RT-07 | E2E | `return-to-deep-link.spec.ts` | Join invite expired → toast + /home |
| RT-08 | UI | `routing-guest-gate.spec.ts` | Logged-in `/login?returnTo=/login` không loop |
| RT-09 | E2E | `return-to-deep-link.spec.ts` | Google stash returnTo pre-popup |
| RT-10 | UI | `routing-guest-gate.spec.ts` | Logout clear stashed returnTo |
| AUTH-EV01..07 | API | `email-verify-flow.spec.ts` | register/confirm/resend/cooldown (+ double confirm) |
| AUTH-EV-UI01..03,07 | UI | `verify-email.spec.ts` | Free copy, dedupe, debugToken, cross-tab |
| AUTH-EV-E2E01 | E2E | `return-to-deep-link.spec.ts` | register → pending → verify → explore |
| AUTH-EV-E2E02..05 | E2E | `email-verify-continue.spec.ts` | Continue + unverified gates |
| AUTH-E05 | E2E | `email-verification-checkout.spec.ts` | Unverified checkout → verify |
| MON-PAY-UI01..03 | E2E | `monetization-pricing.spec.ts` | Checkout CTA + silent poll |
| TRIAL-H02-UI | E2E | `monetization-pricing.spec.ts` | Leaderboard archive banner |
| GP-KHOA-00..08 | E2E | `persona-khoa.spec.ts` | Persona Khoa (guest gate, era, SePay, tour360, AC-M07) |
| AC-M13 | API+E2E | `teacher-dashboard-standard.spec.ts` | Teacher roster quest completion % |
| AC-M14 | E2E | `lms-premium.spec.ts` | Premium teacher LMS link + export |
| SEPAY-E2E-04/05 | E2E | `sepay-checkout-real.spec.ts` | B2B PREMIUM 25M / MICRO 8M QR |
| AC-M04/06/09 | E2E | `chat-sources-tier`, `profile-passport-tier`, `photo-frame-tier` | Tier lock hints |
| GP-HUONG-07 | E2E | `lms-premium.spec.ts` | LMS Premium teacher flow |
| MP-H01 | E2E | `multiplayer-standard.spec.ts` | STANDARD multiplayer happy |
| MP-E2E-JOIN | E2E | `multiplayer-standard.spec.ts` | Student join quest room via `/groups` |
| TRIAL-E2E-B01/B02 | E2E | `classroom-trial-badpaths.spec.ts` | Seat-full toast + trial archive copy |
| OFF-E2E-DEMO-01 | E2E | `offline-demo-checkin.spec.ts` | Demo badge + demo check-in |
| CHAT-B5 | UI | `chat-ai-offline.spec.ts` | AI offline banner mock+unroute |
| B2B2C-API-H01/B01/H02 | API | `b2b2c-inquiry.spec.ts` | Inquiry submit/validate/admin list |
| GRP-BE-B01 | JUnit | `GroupServiceTest` | Join expired/invalid group code |
| LMS-BE-B01 | JUnit | `LmsAssignmentServiceTest` | STANDARD → LMS_PREMIUM_REQUIRED |
| ASSUMP-01..03 | E2E | `assumption-analytics.spec.ts` | Paywall CTR instrumentation |
| GP-MON-04-REAL | E2E | `org-quota-stress.spec.ts` | Real org quota (test hook) |
| GP-HUONG-01..06,08 | E2E | `persona-huong.spec.ts` | Persona Cô Hương B2B SePay + roster + Premium upsell |
| MON-HELPER-B01 | API | `monetization-helper.spec.ts` | Helper fail rõ ràng nếu remote quest không complete |
| AC-M09-E2E | E2E | `persona-huong.spec.ts` | Teacher invite copy + expiry UI |
| GP-MON-04 | E2E | `org-quota-stress.spec.ts` | Org quota modal + teacher alert |
| MON-H11-real | API+BE | `org-quota-exhaust.spec.ts` + `OrgMonthlyQuotaExhaustTest` | Org pool exhausted |
| GP-MON-05 | E2E | `org-quota-stress.spec.ts` | Tour/portal vẫn mở khi org member |
| SEPAY-E2E-01..05 | E2E | `sepay-checkout-real.spec.ts` | Real checkout QR dynamic amount |
| MON-H12..17 | API | `admin-billing-pricing.spec.ts` | Admin runtime pricing |
| MON-B09 | API | `org-invite.spec.ts` | Expired invite join rejected |
| QS-PAY-H01/B01/B02 | E2E | `quest-stepper-era-paywall.spec.ts` | Stepper era paywall copy + gating theo tier |
| GP-HUONG-08b | E2E | `persona-huong.spec.ts` | Standard→Premium preserve roster/progress |
| TRIAL-H01/B01/B02/B03/H02 | API | `org-trial.spec.ts` | Classroom trial 14 ngày + cap + expiry freeze + leaderboard read-only |
| TRIAL-E2E-H01 | E2E | `classroom-trial.spec.ts` | Pricing CTA tạo trial và mở teacher dashboard |
| B2C-EXP-API-01 | API | `b2c-expiry-reminder.spec.ts` | `daysUntilExpiry` từ B2C status |
| B2C-EXP-UI-01..03 | E2E | `b2c-expiry-banner.spec.ts` | Banner nhắc gia hạn 7 / 3 / 1 ngày |

---

**Tổng (2026-07-08 full gate):** JUnit **125** · API **113/1 skip** · UI **32** · E2E **137/1 skip** · Coverage **97.6%**

## Phạm vi không tự động hóa (residual Manual)

- **CAP-OFF-04:** GPS/QR trên thiết bị thật ngoài trời (dùng `OFF-E2E-DEMO-01` demo-badge cho demo)
- Chất lượng câu trả lời LLM (subjective)
- AC-13 animation mượt Tour360 (đã có T360-B1 state toggle; không đo FPS)

**Đã chuyển sang automation (2026-07-08 >=95% push):**
- AUTH-G01 → Yes* mock boundary (`google-auth-boundary.spec.ts` + fixture)
- REPLAY-H1 → Yes (`admin-gaps.spec.ts`)
- T360-B1 → Yes (`tour360-modes.spec.ts`)
- CREATIONS-UI-H1 → Yes* (`profile-creations-gallery.spec.ts`)
- CHAT-FALLBACK-01 → Yes* contract (`chat-fallback.spec.ts` + `gemini-error-429.json`)

**Coverage rollup:** [`COVERAGE_CAPABILITIES.md`](./COVERAGE_CAPABILITIES.md) — **97.6%** `(Yes+Yes*)/42`

## Kết quả mục tiêu

- `scripts/run-all-tests.ps1` xanh khi BE :8080 + postgres (+ minio/AI optional)
- Checklist: `HISTAR_RELEASE_SIGNOFF_CP4.md`

**Guest gate (2026-07-08):** BR-M16 “explore public” bị **override** bởi BR-AUTH-EV + ProtectedRoute — guest `/explore` → `/login?returnTo=` (RT-01, GP-KHOA-00).
