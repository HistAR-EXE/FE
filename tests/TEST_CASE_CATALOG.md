# HistAR — Test Case Catalog (Happy + Bad)

> Traceability: BR/AC/LUỐNG từ **`HISTAR_MASTER_SPEC_v2.md`** (§4–§5, §7–§23).
> Automated = có test JUnit hoặc Playwright (api/ui/e2e).

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
| T360-B1 | Bad | Toggle modes exist (not smoothness) | Manual skip |

## Passport (BR-20)

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| PSP-H1 | Happy | Profile Hộ chiếu Di sản section | Yes | ui, e2e |

## Golden paths

| ID | Type | Case | Automated | Layer |
|---|---|---|---|---|
| GP-H1 | Happy | Online: explore→heritage→tour→portal | Yes | e2e |
| GP-H2 | Happy | Offline: scan→checkin→quest badge | Yes | e2e |
