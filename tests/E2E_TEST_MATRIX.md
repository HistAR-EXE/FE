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
| (+ 46 tests legacy) | Mixed | Gamification, quest, unlock, auth |

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
| **admin-era** | Happy/Bad | Yes |
| **photo-viral** | Happy/Bad | Yes (MinIO skip) |

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
| **photo-frame-upload** | Happy AC-14 | Yes (MinIO skip) |
| **explore-recommendations** | Happy | Yes |
| **chat-sources-rag** | Happy AC-2 | Yes (AI skip) |

---

## Phạm vi không tự động hóa

- AC-13 animation mượt Tour360 toggle (chỉ smoke state)
- Chất lượng câu trả lời LLM
- GPS/QR trên thiết bị thật ngoài trời

## Kết quả mục tiêu

- JUnit: **~58+** tests
- Playwright: **~90+** tests (3 tầng)
- `npm run test:all` pass khi BE :8080 + postgres (+ minio optional)
