# HistAR — Test Case Catalog (Happy + Bad)

> Traceability: BR/AC/LUỐNG từ **`HISTAR_MASTER_SPEC_v2.md`** (§4–§5, §7–§23).
> Automated = có test JUnit hoặc Playwright (api/ui/e2e).

## Capability coverage (>=95%)

- **Rollup & quy ước mẫu số:** [`COVERAGE_CAPABILITIES.md`](./COVERAGE_CAPABILITIES.md)
- **Công thức:** `(Yes + Yes*) / TotalCapabilities >= 95%` — baseline **97.6%** (42 capabilities, 1 residual Manual GPS device)
- **Contract fixtures:** `fixtures/contracts/` — dùng chung mock + JUnit/API; `Yes*` map `contractFixture` + survival smoke

## Auth (BR-01, BR-02)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| AUTH-H1 | Happy | Register mở → USER + token | Yes | api |
| AUTH-H2 | Happy | Login demo → accessToken + role | Yes | api, e2e |
| AUTH-H3 | Happy | GET /api/profile/me với JWT | Yes | api |
| AUTH-H4 | Happy | Refresh token rotate | Yes | api, junit |
| AUTH-B1 | Bad | Sai password → 401 | Yes | api, e2e |
| AUTH-B2 | Bad | Thiếu JWT → 401 | Yes | api |
| AUTH-B3 | Bad | Email trùng register → 409 | Yes | api |
| AUTH-E01 | Bad | Unverified → B2B subscribe 422 | Yes | api |
| AUTH-E02 | Bad | Unverified → SePay B2C payment 422 | Yes | api |
| AUTH-E03 | Happy | Resend → confirm → B2C subscribe | Yes | api |
| AUTH-E04 | Bad | Unverified org SePay | Yes | api |
| AUTH-E05 | Happy | Unverified checkout disabled → verify → enabled (E2E) | Yes | e2e |
| AUTH-G01 | Happy* | Google OAuth boundary (mock G02/G03/G07 — no popup) | Yes* | api, ui + `smoke-google-auth.ps1` |
| AUTH-G02 | Bad | Empty idToken | Yes | api |
| AUTH-G03 | Bad | Invalid idToken | Yes | api |
| AUTH-G05 | Happy | New Google profile emailVerified | Yes | junit |
| AUTH-G06 | Happy | Link local → verify | Yes | junit |
| AUTH-G07 | Happy | Google button on login | Yes | ui |
| AUTH-G09 | Happy | Verified checkout enabled | Yes | e2e |
| AUTH-G10 | Happy* | Real token (env) | CI-skip | api |
| AUTH-EV01 | Happy | Register → emailVerified=false + debugToken | Yes | api |
| AUTH-EV02 | Happy | Login unverified → emailVerified=false | Yes | api, junit |
| AUTH-EV03 | Bad | Chat API EMAIL_NOT_VERIFIED | Yes | api |
| AUTH-EV04 | Happy | Register debugToken/resend → confirm → verified | Yes* | api |
| AUTH-EV05 | Bad | Double confirm same token → used/invalid | Yes* | api |
| AUTH-EV06 | Happy | Resend returns debugToken (MAIL off) | Yes* | api |
| AUTH-EV07 | Bad | Resend cooldown | Yes | api |
| AUTH-EV-BE05 | Happy | EmailVerifiedGuard + register sync send | Yes | junit |
| AUTH-EV-BE10..15 | Happy/Bad | MAIL on/off, confirm once/twice, expiry, cooldown | Yes | junit |
| AUTH-EV-UI01 | Happy | Verify success Free copy (không thanh toán) | Yes | ui |
| AUTH-EV-UI02 | Happy | Confirm dedupe under remount | Yes | ui |
| AUTH-EV-UI03 | Happy | Pending resend debugToken local link | Yes | ui |
| AUTH-EV-UI07 | Happy | Pending cross-tab verify sync | Yes | ui |
| AUTH-EV-E2E01 | Happy | Register → pending → verify → explore | Yes | e2e |
| AUTH-EV-E2E02 | Happy | Continue → mode-select không bounce pending | Yes | e2e |
| AUTH-EV-E2E03..04 | Bad | Unverified gate mode-select/home/explore | Yes | e2e |
| AUTH-EV-E2E05 | Happy | Verified giữ mode-select/home | Yes | e2e |
| RT-00 | Happy | Login page không còn CTA guest-explore | Yes | ui |
| RT-01..04 | Happy | Guest gate: chỉ `/`, protected → login?returnTo= | Yes | ui |
| RT-05..06 | Happy | returnTo join + explore sau login | Yes | e2e |
| RT-07 | Bad | Join invite expired → toast + /home | Yes* | e2e |
| RT-08 | Bad | Logged-in `/login?returnTo=/login` không loop | Yes | ui |
| RT-09 | Happy | Google login stashes returnTo (pre-popup) | Yes | e2e |
| RT-10 | Happy | Logout clear stashed returnTo | Yes | ui |
| ORG-P03 | Happy | Teacher provision E2E | Yes | e2e |
| ORG-P04 | Bad | Cross-org provision | Yes | api |
| ORG-I01 | Happy/Bad | Join page deep link | Yes | e2e |
| FLOW-H01 | Happy | Seamless upgrade | Yes | e2e |
| FLOW-B02 | Bad | Student provision denied | Yes | api |

## Explore (LUỐNG 2)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| EXP-H1 | Happy | GET /api/locations public | Yes | api |
| EXP-H2 | Happy | GET location detail Củ Chi | Yes | api |
| EXP-H3 | Happy | GET characters by-location | Yes | api |
| EXP-H4 | Happy | isUnlocked per user JWT | Yes | api, e2e |
| EXP-B1 | Bad | Location UUID không tồn tại → 404 | Yes | api |

## Quest (BR-10/11/12, AC-4/5)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| QST-H1 | Happy | requireOnsiteCheckin field trên mọi quest | Yes | api |
| QST-H2 | Happy | Củ Chi onsite quest flag true | Yes | api, e2e |
| QST-H3 | Happy | Remote quest tồn tại (requireOnsite=false) | Yes | api |
| QST-H4 | Happy | Heritage remote complete qua discovery | Yes | e2e |
| QST-B1 | Bad | /api/me/quests no JWT → 401 | Yes | api |
| QST-B2 | Bad | Onsite quest không complete chỉ discovery | Yes | junit |

## Check-in (AC-7/8)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| CHK-H1 | Happy | GPS trong 100m + QR → success | Yes | api, e2e |
| CHK-H2 | Happy | Quest complete + unlock location | Yes | e2e |
| CHK-B1 | Bad | GPS xa >100m → 4xx | Yes | api, junit |
| CHK-B2 | Bad | QR locationId mismatch | Yes | junit |
| CHK-B3 | Bad | No JWT → 401 | Yes | api |
| CHK-B4 | Bad | GPS denied UI copy (AC-8) | Yes | ui |

## Discovery (BR-08/09)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| DSC-H1 | Happy | visited-locations + count | Yes | api |
| DSC-H2 | Happy | summary by location | Yes | api |
| DSC-H3 | Happy | discovery-bindings dynamic | Yes | api |
| DSC-H4 | Happy | POST valid unlockKey | Yes | api, e2e |
| DSC-B1 | Bad | invalid unlockKey → 4xx | Yes | api, junit |
| DSC-B2 | Bad | artifacts/unlock disabled C-05 | Yes | api |

## Artifacts (AC-11)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| ART-H1 | Happy | Locked hint trên UI | Yes | e2e |
| ART-B1 | Bad | POST /me/artifacts/unlock not 2xx | Yes | api |

## Chat (AC-2)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| CHAT-H1 | Happy | Orchestrated reply + sources[] | Yes | api, e2e |
| CHAT-B1 | Bad | No JWT → 401 | Yes | api |
| CHAT-B2 | Bad | Offline mode redirect /scan | Yes | e2e |

## Mode Online/Offline

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| MOD-H1 | Happy | Online → /explore | Yes | e2e |
| MOD-H2 | Happy | Offline → /scan | Yes | e2e |
| MOD-H3 | Happy | CTA offline→/scan, online→/explore | Yes | ui |
| MOD-B1 | Bad | Online /scan redirect | Yes | e2e |
| MOD-B2 | Bad | Offline /chat redirect | Yes | e2e |

## Heritage FR-03 (AC-1)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| HER-H1 | Happy | Tab Tổng quan/Trải nghiệm/Nhân vật | Yes | ui, e2e |
| HER-B1 | Bad | Invalid locationId handling | Yes | ui |

## Visit session

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| VIS-H1 | Happy | POST start + PATCH end | Yes | api |
| VIS-B1 | Bad | No auth → 401 | Yes | api |

## Recommendations

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| REC-H1 | Happy | GET recommendations for location | Yes | api, e2e |
| REC-B1 | Bad | No auth → 401 | Yes | api |

## Photo/Viral (AC-9/14)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| VIR-H1 | Happy | GET /api/photo-frames | Yes | api |
| VIR-H2 | Happy | Upload JPEG + record share bonus | Yes | api, e2e |
| VIR-B1 | Bad | Empty file → 4xx | Yes | api |
| VIR-B2 | Bad | Gallery fallback copy AC-9 | Yes | ui |

## Admin BR-24

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| ADM-H1 | Happy | era-count Củ Chi sufficient | Yes | api |
| ADM-B1 | Bad | create quest location <3 era → 4xx | Yes | api, junit |

## Tour360 (AC-3)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| T360-H1 | Happy | Page load smoke | Yes | e2e |
| T360-H2 | Happy | Discovery record → artifact same session | Yes | e2e |
| T360-B1 | Happy | Toggle Sơ Đồ / Vệ tinh / 360° modes exist | Yes | ui |

## Passport (BR-20)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| PSP-H1 | Happy | Profile Hộ chiếu Di sản section | Yes | ui, e2e |

## Chat (AC-2, Workflow 4)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| CHAT-H1 | Happy | Orchestrated reply + sources[] | Yes* | api, e2e |
| CHAT-H2 | Happy | GP-CHAT-01 full stack FE→BE→AI | Yes* | e2e |
| CHAT-B1 | Bad | No JWT → 401 | Yes | api |
| CHAT-B2 | Bad | Offline mode redirect /scan | Yes | e2e |
| CHAT-B5 | Bad | AI offline banner (route mock 503 + unroute) | Yes | ui |

\* Skip nếu RAG AI :8100 down

## Monetization (AC-M01–M16, spec v3)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| MON-H01 | Happy | Pricing B2C+B2B | Yes | e2e |
| MON-H02 | Happy | Era lock → pricing | Yes | e2e |
| MON-H03 | Happy | FREE quota 11th → modal (real) | Yes* | api+e2e |
| MON-H04 | Happy | FREE sources empty | Yes* | api |
| MON-H05 | Happy | PREMIUM sources allowed | Yes* | api |
| AC-M04-UI | Happy | FREE chat hint khi không có sources | Yes | e2e |
| AC-M04-UI-Premium | Happy | PREMIUM thấy ChatSourcesBlock | Yes | e2e |
| AC-M06-FREE | Bad | Passport preview locked | Yes | e2e |
| AC-M06-PREMIUM | Happy | Passport unlocked sau upgrade | Yes* | e2e |
| AC-M09-FREE | Bad | Photo frame Premium locked | Yes | e2e |
| AC-M09-PREMIUM | Happy | Photo frame Premium unlocked | Yes* | e2e |
| LMS-B01 | Bad | STANDARD teacher LMS 422 | Yes | api |
| LMS-H01 | Happy | PREMIUM create + list assignment | Yes | api |
| LMS-H02 | Happy | Auto-grade on quest completion | Yes | api |
| MP-H01 | Happy | STANDARD tạo nhóm không paywall | Yes | e2e |
| MP-E2E-JOIN | Happy | Teacher tạo phòng → student join mã trên `/groups` | Yes | e2e |
| GRP-BE-B01 | Bad | `GroupService.joinGroup` mã hết hạn / invalid length | Yes | junit |
| MP-H02 | Happy | STANDARD multiplayer-access true | Yes | api |
| MP-H03 | Happy | STANDARD assign-quest 200 | Yes | api |
| ASSUMP-01..03 | Happy | Paywall analytics events | Yes | e2e |
| AC-M07-E2E | Happy | Premium upgrade unlocks era + passport | Yes* | e2e |
| AC-M13-API | Happy | Teacher roster quest completion % | Yes | api |
| AC-M13-E2E | Happy | Teacher dashboard analytics + roster | Yes | e2e |
| AC-M14-E2E | Happy | Premium teacher LMS link + export | Yes | e2e |
| MON-H10 | Happy | Org member era 1948 unlock | Yes | e2e |
| MON-H14 | Happy | MICRO multiplayer lock | Yes | e2e |
| MON-B02 | Bad | Org B2C subscribe blocked | Yes | api |
| MON-B04 | Bad | MICRO multiplayer-access false | Yes | api |
| MON-B05 | Bad | CCU exceeded → modal | Yes | api+e2e |
| MON-B06 | Bad | FREE leaderboard BE gate | Yes | api |
| MON-H12 | Happy | public-pricing default B2C 49k | Yes | api |
| MON-H13 | Happy | admin PATCH price → public-pricing sync | Yes | api |
| MON-H14 | Happy | B2C payment amount + qrUrl dynamic | Yes* | api |
| MON-H15 | Happy | B2B STANDARD payment 15M + qrUrl | Yes* | api |
| MON-H16 | Happy | B2B PREMIUM payment 25M + qrUrl | Yes* | api |
| MON-H17 | Happy | B2B MICRO payment 8M + qrUrl | Yes* | api |
| MON-B09 | Bad | Expired invite code → join rejected | Yes* | api |
| MON-B07 | Bad | SePay webhook invalid HMAC | Yes | api |
| MON-B08 | Bad | Webhook insufficient amount → no upgrade | Yes* | api |
| MON-HELPER-B01 | Bad | `completeRemoteQuest()` fail rõ ràng nếu quest không complete | Yes | api |

\* Skip nếu SePay disabled trên BE local

Traceability đầy đủ: [`docs/MONETIZATION_TEST_MATRIX_v3.md`](../docs/MONETIZATION_TEST_MATRIX_v3.md)

## CP4 bổ sung (2026-07-08)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| QS-PAY-H01 | Happy | Quest stepper Free mở paywall Era 1948 copy conversion | Yes | e2e |
| QS-PAY-B01 | Bad | Premium không thấy stepper era paywall CTA | Yes | e2e |
| QS-PAY-B02 | Bad | Org member không thấy stepper era paywall CTA | Yes | e2e |
| GP-HUONG-08b | Happy/Bad | Standard→Premium giữ nguyên orgId/roster/progress sau upsell | Yes | e2e |
| TRIAL-H01 | Happy | POST `/api/billing/org/trial` tạo trial 14 ngày (STANDARD) | Yes | api |
| TRIAL-H02 | Happy | Trial expired vẫn đọc leaderboard `scope=all` (read-only) | Yes* | api |
| TRIAL-H02-UI | Happy | Leaderboard archive banner on `403/TRIAL_EXPIRED` (không trắng trang) | Yes | e2e |
| TRIAL-B01 | Bad | 1 teacher không tạo trial lần 2 | Yes | api |
| TRIAL-B02 | Bad | Trial seat cap (teacher + 10 students), chặn học sinh thứ 11 | Yes | api |
| TRIAL-B03 | Bad | Trial expired: block invite/join và quest write trả `TRIAL_EXPIRED` | Yes* | api |
| TRIAL-E2E-H01 | Happy | CTA pricing tạo trial và vào dashboard giáo viên | Yes | e2e |
| TRIAL-E2E-B01 | Bad | Seat full → autoJoin hiện lỗi đủ tài khoản | Yes | e2e |
| TRIAL-E2E-B02 | Bad | Trial expired → leaderboard archive / hết hạn copy | Yes | e2e |
| ORG-INVITE-BE-B01 | Bad | generateInviteCode khi TRIAL_EXPIRED/EXPIRED | Yes | junit |
| ORG-JOIN-BE-B01 | Bad | joinOrg khi org TRIAL_EXPIRED/EXPIRED | Yes | junit |
| LMS-BE-B01 | Bad | STANDARD createAssignment → `LMS_PREMIUM_REQUIRED` | Yes | junit |
| B2B2C-API-H01 | Happy | POST `/api/billing/b2b2c-inquiry` OK | Yes | api |
| B2B2C-API-B01 | Bad | Inquiry validation missing/invalid → 4xx | Yes | api |
| B2B2C-API-H02 | Happy | Admin list b2b2c inquiries | Yes | api |
| OFF-E2E-DEMO-01 | Happy | ScanPage demo-badge + demo check-in không GPS | Yes | e2e |
| MON-PAY-UI01 | Happy | Checkout CTA = `Kiểm tra lại trạng thái` (B2C+B2B); không còn `Tôi đã thanh toán` | Yes | e2e |
| MON-PAY-UI02 | Happy | Copy hướng dẫn local webhook / deploy refresh | Yes | e2e |
| MON-PAY-UI03 | Happy | Silent 5s poll PENDING→PAID không bắt buộc click | Yes | e2e |
| ORG-TRIAL-BE01 | Happy | `reconcileExpiredTrials` mark TRIAL_EXPIRED | Yes | junit |
| ORG-TRIAL-BE02 | Bad | Student write blocked when TRIAL_EXPIRED | Yes | junit |
| MP-BE01 | Happy/Bad | Multiplayer MICRO blocked; STANDARD/PREMIUM allowed | Yes | junit |
| TIER-BE01 | Happy/Bad | FREE vs PREMIUM/org gate | Yes | junit |
| PF-BE01 | Happy/Bad | Free photo frame name/index gate | Yes | junit |
| B2C-EXP-API-01 | Happy | `/api/billing/b2c/status` trả `daysUntilExpiry` | Yes | api |
| B2C-EXP-UI-01 | Happy | Settings banner nhắc gia hạn còn 7 ngày | Yes | e2e |
| B2C-EXP-UI-02 | Happy | Settings banner nhắc gia hạn còn 3 ngày | Yes | e2e |
| B2C-EXP-UI-03 | Happy | Settings banner nhắc gia hạn còn 1 ngày | Yes | e2e |

## Resilience / concurrency (2026-07-09)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| AUTH-G10 | Happy | Google login round-trip via test-hook fixture token | Yes | api |
| ORG-CONC-BE01 | Bad | 5 students race 1 trial seat → exactly 1 success | Yes | junit |
| GRP-CONC-BE01 | Happy | Parallel group create → unique 6-char codes | Yes | junit |
| FE-SPAM-01 | Happy | Double-click checkout → 1× POST `/api/billing/b2c/payment` | Yes | ui |
| FE-SPAM-02 | Happy | Double-click photo frame → 1× POST `/api/user-creations` | Yes | ui |
| FE-NAV-02a | Happy | Tour360 `.tour360-loading` under delayed panoramas API | Yes | ui |
| FE-NAV-02b | Happy | Time Portal `Đang tải ảnh lịch sử...` under delay | Yes | ui |
| FE-RELOAD-01a | Happy | F5 on login keeps `histar:returnTo` in sessionStorage | Yes | ui |
| FE-RELOAD-01b | Gap | Checkout QR lost on reload (React state only — documented) | Yes | ui |
| TIME-01 | Bad | Test hook expire trial → quest start `403 TRIAL_EXPIRED` | Yes* | api |
| TIME-E2E-01 | Bad | Trial expired → leaderboard archive toast | Yes* | e2e |

## Golden paths

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| GP-H1 | Happy | Online: explore→heritage→tour→portal | Yes | e2e |
| GP-H2 | Happy | Offline: scan→checkin→quest badge | Yes | e2e |
| GP-MON-01 | Happy | B2C convert golden path | Yes | e2e |
| GP-MON-02 | Happy | B2B school golden path | Yes | e2e |
| GP-MON-03 | Happy | Stress quota golden path | Yes* | e2e |
| GP-KHOA-00 | Happy | Guest /explore → login?returnTo (BR-AUTH-EV) | Yes | e2e |
| GP-KHOA-01 | Happy | Landing → login → verify → explore | Yes | e2e |
| GP-KHOA-02 | Happy | Era 1948 lock → Để sau | Yes | e2e |
| GP-KHOA-03 | Happy | Chat quota modal → pricing | Yes* | e2e |
| GP-KHOA-04 | Happy | SePay B2C webhook → PREMIUM | Yes* | api+e2e |
| GP-KHOA-05 | Happy | Era unlock sau upgrade | Yes* | e2e |
| GP-KHOA-06 | Happy | PREMIUM chat sources | Yes* | api |
| GP-KHOA-07 | Happy | Tour 360° Củ Chi smoke | Yes | e2e |
| GP-KHOA-08 | Happy | Photo frame Premium sau upgrade | Yes* | e2e |
| GP-HUONG-01 | Happy | B2B teacher pricing flow | Yes | e2e |
| GP-HUONG-02 | Happy | Teacher org dashboard | Yes | e2e |
| GP-HUONG-03 | Happy | checkout/b2b SePay QR 15M | Yes* | e2e |
| GP-HUONG-04 | Happy | SePay webhook → teacher 0/400 | Yes* | e2e |
| GP-HUONG-05 | Happy | Invite + bulk join roster | Yes | e2e |
| GP-HUONG-06 | Happy | Standard → Premium LMS upsell copy | Yes | e2e |
| GP-HUONG-07 | Happy | LMS Premium: tạo bài + Xuất CSV/PDF | Yes | e2e |
| GP-HUONG-08 | Happy | Standard→Premium SePay + LMS auto-grade + export | Yes* | e2e |
| AC-M09-E2E | Happy | Teacher invite code 6 ký tự + copy + 7 ngày | Yes | e2e |
| GP-MON-04-UI | Bad | Org quota exceeded → OrgQuotaModal (mock) | Yes | e2e |
| GP-MON-04-REAL | Bad | Org quota exceeded → OrgQuotaModal (real hook) | Yes* | e2e |
| GP-MON-04-API | Bad | Org quota exhausted → 403 QUOTA_EXCEEDED | Yes* | api |
| GP-MON-04-TEACHER | Bad | Teacher AI pool alert | Yes | e2e |
| GP-MON-05 | Happy | Org member tour/portal when AI pool exhausted | Yes | e2e |
| SEPAY-E2E-01..03 | Happy | Checkout real QR amount B2C/B2B STANDARD | Yes* | e2e |
| SEPAY-E2E-04 | Happy | B2B PREMIUM checkout QR 25M | Yes* | e2e |
| SEPAY-E2E-05 | Happy | B2B MICRO checkout QR 8M | Yes* | e2e |

## Admin CMS & Role UI (audit 2026-07)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| CMS-UI-H1 | Happy | Admin tab Hiện vật → Thêm hiện vật | Yes | e2e |
| CMS-UI-B1 | Bad | USER vào /admin/content redirect | Yes | e2e |
| ROLE-UI-A1 | Happy | ADMIN login → /admin/content | Yes | e2e |
| ROLE-UI-A3 | Happy | ADMIN Profile links Analytics/Tổ chức | Yes | e2e |
| ROLE-UI-T1 | Happy | TEACHER login → /teacher | Yes | e2e |
| ROLE-UI-U1 | Happy | USER Profile org join + groups | Yes | e2e |
| ROLE-UI-B1 | Bad | USER GET /api/admin/users → 403 | Yes | e2e |

## API gaps (§10 audit)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| REPLAY-H1 | Happy | GET session replay ADMIN + session steps from visit+discovery | Yes | api |
| REPLAY-B1 | Bad | USER JWT replay → 403 | Yes | api |
| REPLAY-B2 | Bad | ADMIN + invalid sessionId → 404 | Yes | api |
| REPLAY-B3 | Bad | Guest replay → 401 | Yes | api |
| CREATIONS-H1 | Happy | GET /api/me/user-creations | Yes | api |
| CREATIONS-UI-H1 | Happy | Profile gallery ảnh khung sau upload | Yes | e2e |
| CHAT-FALLBACK-01 | Happy* | Gemini 429 contract shape + hybrid fallback note | Yes* | api |
| PANO-H1 | Happy | GET /api/panoramas/{id} (seed) | Yes* | api |
| PANO-B1 | Bad | GET /api/panoramas/{invalid} → 404 | Yes | api |
| PANO-UI-H1 | Happy | Tour360 deep-link fallback | Yes | code |

Xem chi tiết limitation: **`KNOWN_GAPS.md`**.

