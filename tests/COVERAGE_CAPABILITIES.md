# HistAR — Functional Coverage Capabilities (>=95% gate)

> **Nguồn sự thật** cho công thức `(Yes + Yes*) / TotalCapabilities >= 95%`.
> Chi tiết test ID: [`TEST_CASE_CATALOG.md`](./TEST_CASE_CATALOG.md).

## Capability Definition (denominator rules)

- **1 Capability = 1 User Story cốt lõi** HOẶC **1 nhánh Business Rule lớn** (happy + ít nhất 1 bad-path khi áp dụng).
- **Không** tính: đổi màu nút, copy UI nhỏ, layout chi tiết — gộp vào capability cha.
- **Không** gộp: nhiều luồng tiền/auth khác nhau vào một capability “Quản lý B2B”.
- Mỗi capability có: `domain`, `storyId`, `happyTestIds[]`, `badTestIds[]`, `status`, `contractFixture?`, `lastVerifiedDate?`.
- **Audit mẫu số**: trước claim 95%, review 10% capability ngẫu nhiên — không quá rộng/hẹp.

| Status | Ý nghĩa |
|--------|---------|
| `Yes` | Fully automated, không phụ thuộc external thật |
| `Yes*` | Automated + env-gated / simulator; cần Survival Smoke định kỳ |
| `Partial` | Chỉ cover một nhánh |
| `Manual` | Chưa tự động hóa (residual cực hẹp) |

## Rollup (2026-07-08 — CP4 >=95% push)

| Domain | Total | Yes | Yes* | Manual | Coverage (Yes+Yes*)/Total |
|--------|------:|----:|-----:|-------:|--------------------------:|
| Auth / Account | 5 | 3 | 2 | 0 | 100% |
| Monetization B2C | 5 | 2 | 3 | 0 | 100% |
| Monetization B2B / Trial / Org | 7 | 3 | 4 | 0 | 100% |
| Learning / LMS / Multiplayer | 3 | 3 | 0 | 0 | 100% |
| Onsite / Offline / Scan / Quest | 5 | 4 | 0 | 1 | 80% → **domain residual** |
| Chat / AI / Persona | 4 | 1 | 3 | 0 | 100% |
| Creation / Photo / Passport / Tour / Explore | 6 | 3 | 3 | 0 | 100% |
| Admin / Ops / Runtime | 4 | 3 | 1 | 0 | 100% |
| Golden paths (rollup smoke) | 3 | 3 | 0 | 0 | 100% |
| Resilience / concurrency | 5 | 5 | 0 | 0 | 100% |
| **TOTAL** | **47** | **30** | **16** | **1** | **97.9%** |

**Công thức:** `(30 + 16) / 47 = 97.9%` — đạt mục tiêu >=95%.

**Residual Manual (1):** `CAP-OFF-04` — GPS thật ngoài trời / QR device camera (MKT dùng `OFF-E2E-DEMO-01` demo-badge).

## Capability inventory

| Capability ID | Domain | User story / business rule | Status | Happy tests | Bad tests | contractFixture |
|---------------|--------|---------------------------|--------|-------------|-----------|-----------------|
| CAP-AUTH-01 | Auth | Register / login / JWT / refresh | Yes | AUTH-H1..H4 | AUTH-B1..B3 | — |
| CAP-AUTH-02 | Auth | Email verify + unverified gates | Yes | AUTH-EV01, AUTH-E03, AUTH-E05 | AUTH-E01,E02,E04, AUTH-EV03 | — |
| CAP-AUTH-03 | Auth | Google OAuth boundary (mock, no popup) | Yes | AUTH-G05,G06,G07,G09,G10 | AUTH-G02,G03 | `google-test-id-token.json` |
| CAP-AUTH-04 | Auth | returnTo deep links + guest gate | Yes | RT-01..06, RT-09, RT-10 | RT-07, RT-08 | — |
| CAP-AUTH-05 | Auth | Org provision + seamless upgrade | Yes | ORG-P03, FLOW-H01 | ORG-P04, FLOW-B02 | — |
| CAP-MON-B2C-01 | B2C | Pricing + era paywall | Yes | MON-H01,H02, QS-PAY-H01 | QS-PAY-B01,B02 | — |
| CAP-MON-B2C-02 | B2C | SePay checkout + webhook upgrade | Yes* | GP-KHOA-04, MON-H14 | MON-B07,B08 | `sepay-webhook.json` |
| CAP-MON-B2C-03 | B2C | Premium unlocks era/passport/photo | Yes* | AC-M07-E2E, AC-M06-PREMIUM | AC-M06-FREE, AC-M09-FREE | — |
| CAP-MON-B2C-04 | B2C | FREE chat quota 11th | Yes* | MON-H03, GP-KHOA-03 | MON-B06 | — |
| CAP-MON-B2C-05 | B2C | Expiry reminder banners | Yes | B2C-EXP-API-01, B2C-EXP-UI-01..03 | — | — |
| CAP-MON-B2B-01 | B2B | Org SePay subscribe + tiers | Yes* | MON-H15..H17, GP-HUONG-03 | MON-B02 | `sepay-webhook.json` |
| CAP-MON-B2B-02 | B2B | Invite + bulk join roster | Yes | GP-HUONG-05, AC-M09-E2E | MON-B09 | — |
| CAP-MON-B2B-03 | B2B | CCU / org quota exceeded | Yes* | GP-MON-04-API, GP-MON-04-REAL | GP-MON-04-UI | — |
| CAP-MON-B2B-04 | B2B | Standard→Premium upsell giữ org | Yes* | GP-HUONG-08, GP-HUONG-08b | LMS-B01 | — |
| CAP-MON-TRIAL-01 | Trial | POST trial 14 ngày | Yes | TRIAL-H01, TRIAL-E2E-H01 | TRIAL-B01 | — |
| CAP-MON-TRIAL-02 | Trial | Seat cap chặn HS thứ 11 | Yes | — | TRIAL-B02, TRIAL-E2E-B01 | — |
| CAP-MON-TRIAL-03 | Trial | Trial expired read-only + block write | Yes* | TRIAL-H02, TRIAL-H02-UI | TRIAL-B03, TRIAL-E2E-B02 | — |
| CAP-LMS-01 | LMS | STANDARD blocked / PREMIUM LMS | Yes | LMS-H01, AC-M14-E2E | LMS-B01, LMS-BE-B01 | — |
| CAP-LMS-02 | LMS | Auto-grade + teacher export | Yes | LMS-H02, GP-HUONG-07 | — | — |
| CAP-MP-01 | MP | Teacher room + student join `/groups` | Yes | MP-E2E-JOIN, MP-H01 | — | — |
| CAP-MP-02 | MP | MICRO multiplayer blocked | Yes | MP-H02,H03 | MON-B04, MP-BE01 | — |
| CAP-OFF-01 | Offline | Mode switch online/offline | Yes | MOD-H1,H2 | MOD-B1,B2 | — |
| CAP-OFF-02 | Offline | GPS/QR checkin API rules | Yes | CHK-H1 | CHK-B1..B3 | — |
| CAP-OFF-03 | Offline | Demo check-in UI (no GPS) | Yes | OFF-E2E-DEMO-01 | — | — |
| CAP-OFF-04 | Offline | Device GPS thật ngoài trời | **Manual** | — | — | — |
| CAP-CHAT-01 | Chat | Orchestrated reply + sources | Yes* | CHAT-H1,H2 | — | — |
| CAP-CHAT-02 | Chat | Tier quota + sources gate | Yes* | MON-H04,H05 | MON-H03 | — |
| CAP-CHAT-03 | Chat | Offline / AI down banner | Yes | — | CHAT-B2, CHAT-B5 | — |
| CAP-CHAT-04 | Chat | Hybrid RAG→fallback contract | Yes* | CHAT-FALLBACK-01 | — | `gemini-error-429.json` |
| CAP-EXP-01 | Explore | Locations + per-user unlock | Yes | EXP-H1..H4 | EXP-B1 | — |
| CAP-QUEST-01 | Quest | Onsite vs remote completion | Yes | QST-H2,H4 | QST-B2 | — |
| CAP-DISC-01 | Discovery | unlockKey happy/bad | Yes | DSC-H4 | DSC-B1,B2 | — |
| CAP-TOUR-01 | Tour360 | Load + discovery same session | Yes | T360-H1,H2, GP-KHOA-07 | — | — |
| CAP-TOUR-02 | Tour360 | View mode toggles (3 modes) | Yes | T360-B1 | — | — |
| CAP-PHOTO-01 | Photo | Upload + tier frame gate | Yes* | VIR-H2, GP-KHOA-08 | VIR-B1, AC-M09-FREE | — |
| CAP-PASS-01 | Passport | Tier lock / unlock UI | Yes* | PSP-H1, AC-M06-PREMIUM | AC-M06-FREE | — |
| CAP-ADMIN-01 | Admin | CMS guard + artifact CRUD | Yes | CMS-UI-H1, ROLE-UI-A1 | CMS-UI-B1 | — |
| CAP-ADMIN-02 | Admin | Session replay API payload | Yes | REPLAY-H1 | REPLAY-B1..B3 | — |
| CAP-ADMIN-03 | Admin | Billing admin + public-pricing | Yes | MON-H12,H13 | MON-B07 | `sepay-webhook.json` |
| CAP-ADMIN-04 | Admin | B2B2C inquiry API | Yes | B2B2C-API-H01,H02 | B2B2C-API-B01 | — |
| CAP-GP-01 | Golden | B2C convert golden path | Yes | GP-MON-01, GP-KHOA-01 | — | — |
| CAP-GP-02 | Golden | B2B school golden path | Yes | GP-MON-02, GP-HUONG-01,02 | — | — |
| CAP-GP-03 | Golden | Online/offline golden paths | Yes | GP-H1, GP-H2 | — | — |
| CAP-CONC-01 | Resilience | Trial seat cap race (5→1 slot) | Yes | — | ORG-CONC-BE01 | — |
| CAP-CONC-02 | Resilience | Group code uniqueness under parallel create | Yes | — | GRP-CONC-BE01 | — |
| CAP-FE-01 | Resilience | Checkout + photo spam-click guard | Yes | FE-SPAM-01, FE-SPAM-02 | — | — |
| CAP-FE-02 | Resilience | Slow-network loading states | Yes | FE-NAV-02a, FE-NAV-02b | — | — |
| CAP-TIME-01 | Resilience | Trial expire mid-session block write + FE toast | Yes | TIME-E2E-01 | TIME-01 | — |

## Survival Smoke policy

- Script: [`scripts/survival-smoke-external.ps1`](../../scripts/survival-smoke-external.ps1) (`-Strict` pre-release; signed SePay POST; optional `SURVIVAL_MEDIA_PROBE=1` when `MINIO_ENDPOINT` set)
- Tần suất: **>=1 lần/tháng** hoặc trước release lớn
- Mọi `Yes*` có `contractFixture` phải pass survival so khớp schema thật
- Local gate (`run-all-tests.ps1`) = mock/fixture truth; survival = vendor contract truth
