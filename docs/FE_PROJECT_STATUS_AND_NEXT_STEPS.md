# TimeLens / HistAR — Trạng thái FE & BE (snapshot cuối CP3)

> **Mục đích:** Một file để agent/team nắm FE đã làm gì, BE cung cấp gì, workflow có mượt không, và việc còn lại trước pitch.  
> **Cập nhật:** 2026-06-02 (kiểm tra cuối Tuần 1–3 + workflow)  
> **Repo FE:** `HistAR/FE`  
> **Đối chiếu chi tiết:** [`FE_WEEK1-3_COMPLIANCE.md`](./FE_WEEK1-3_COMPLIANCE.md)  
> **BE nguồn sự thật:** `HistAR/BE/docs/BE_PROJECT_STATUS_AND_FE_GUIDE.md`

---

## 1) Tóm tắt 30 giây

| Hạng mục | Trạng thái |
|----------|------------|
| **CP3 Tuần 1–2–3 (FE code)** | ✅ Hoàn tất theo spec |
| **Workflow Online/Offline + auth** | ✅ Khớp; giữ query qua login/mode-select |
| **Tích hợp API BE (envelope mới)** | ✅ |
| **BE Week 1–4 API** | ✅ Sẵn sàng (xem mục 2) |
| **Virtual Tour đa scene** | ✅ Lazy plugin; `imageUrl` từ BE |
| **Responsive** | ✅ Mobile bottom nav + tablet/laptop |
| **Production FE** | 🟡 Cần set `VITE_API_URL` trên Vercel |
| **Production BE + ảnh 360 thật** | 🟡 Ops Tuần 3 (SQL + MinIO) |
| **E2E tự động** | ❌ Ngoài scope |

**Kết luận:** Logic vận hành FE **đã mượt và ăn khớp BE**. Việc còn lại chủ yếu là **deploy + dữ liệu prod** (không phải sửa architecture FE).

---

## 2) Trạng thái BE (cho FE)

Tổng hợp từ `BE/docs/week-1|2|3` và `BE_PROJECT_STATUS_AND_FE_GUIDE.md`:

| Giai đoạn | Trạng thái | FE phụ thuộc |
|-----------|------------|--------------|
| Auth register/login/refresh/logout | ✅ Done | JWT header, interceptor 401 |
| Locations + pagination `items` | ✅ Done | Explore, HeritageDetail |
| Characters, photo-pairs | ✅ Done | Detail, TimePortal, Chat |
| Panoramas + hotspots | ✅ Done | Tour360 Virtual Tour |
| Chat Gemini + dòng `Nguồn:` | ✅ Done (Tuần 1 Ngày 5) | ChatPage |
| Check-in GPS/QR | ✅ Done | ScanPage |
| Quests start/progress | ✅ Done | QuestsPage, QuestDetail |
| Secret story | ✅ Done | SecretStoryPage |
| Photo frames + upload + share | ✅ Done | PhotoFrame, Share |
| Leaderboard `entries` | ✅ Done | LeaderboardPage |
| Profile + badges + PATCH me | ✅ Done | Profile (PATCH chưa có form UI) |
| Demo check-in | ✅ Done | `VITE_DEMO_ENABLED` |
| Error 422 + fieldErrors | ✅ Done | Login, toast |
| Panorama Củ Chi ảnh thật | 🟡 SQL Tuần 3 | FE tự nhận `imageUrl` mới |
| Deploy BE production | 🟡 Tuần 3 Ngày 17 | `VITE_API_URL` HTTPS |

### UUID demo Củ Chi

- Location: `11111111-1111-1111-1111-111111111111`
- Panorama scenes: `22222222-2222-2222-2222-222222222222` (và các scene liên kết hotspot)

### Env FE

| Biến | Mặc định | Ghi chú |
|------|----------|---------|
| `VITE_API_URL` | `http://localhost:8080` | **Prod:** URL HTTPS BE |
| `VITE_DEMO_ENABLED` | `false` | Bật khi cần cứu check-in demo |
| `VITE_DEMO_MODE` | `false` | Quest seed Stitch — dev only |
| `VITE_DEMO_SECRET` | — | Header demo check-in |

---

## 3) Workflow vận hành FE

### Luồng chính

1. **Guest** xem Explore / Quests list / Tour360 / TimePortal / Leaderboard (không JWT).
2. **Protected** (Scan, Chat, Profile, PhotoFrame, Share, Secret…) → login nếu cần.
3. **Lần đầu sau login** → `ModeSelectPage` ("Bạn đang ở đâu?") → lưu `timelens_mode`.
4. **Online** — ưu tiên Explore → Detail → Tour360 / Chat / TimePortal.
5. **Offline** — ưu tiên Scan → Quests → Secret → PhotoFrame → Share.
6. **Đổi mode** — badge TopNav → `/mode-select`.
7. **Deep link** — `from` (path + query) được giữ qua login → mode-select → đích (vd. Chat `?locationId=`).

### File logic chính

| Thành phần | Path |
|------------|------|
| AppMode | `shared/context/AppModeProvider.tsx`, `modeContext.ts`, `useAppMode.ts` |
| Mode guard | `shared/router/ModeGuardRoute.tsx` |
| Auth guard | `shared/router/ProtectedRoute.tsx` |
| Mode UI | `pages/ModeSelectPage.tsx`, `TopNav` `ModeBadge`, `SideNav` highlight |

---

## 4) Route & trạng thái màn (cập nhật)

| Route | Auth | API | CP3 | Ghi chú |
|-------|------|-----|-----|---------|
| `/` | Public | — | ✅ | Onboarding |
| `/login` | Public | auth | ✅ | Redirect mode-select / from |
| `/mode-select` | Protected | — | ✅ | Tuần 1 |
| `/explore` | Public | locations page | ✅ | Pagination, online CTA |
| `/explore/:id` | Public | location, characters | ✅ | 3 nút online highlight |
| `/tour/360/:id` | Public | panoramas, hotspots | ✅ | VirtualTourViewer |
| `/time-portal/:id` | Public | photo-pairs | ✅ | Skeleton loading |
| `/chat/nguyen-du` | Protected | chat | ✅ | Nguồn line, gợi ý |
| `/quests` | Public | quests, me/quests | ✅ | Full list API; seed chỉ DEMO_MODE |
| `/quests/:id` | Public* | start/progress | ✅ | *Start cần JWT |
| `/scan` | Protected | checkins | ✅ | jsQR, auto check-in |
| `/secret/:id` | Protected | secret-story | ✅ | Lock UI |
| `/photo-frame` | Protected | frames, upload | ✅ | Resize 1080 |
| `/share` | Protected | share | ✅ | Web Share + download |
| `/profile` | Protected | me, badges | ✅ | Level bar, empty badges |
| `/leaderboard` | Public | leaderboard | ✅ | entries, currentUser |
| `/home`, `/artifacts`, … | Protected | mixed | ✅ | Phụ, không chặn golden path |

---

## 5) Đã làm — kỹ thuật FE

### API layer

- `getData` / `getListData` / `getPageData` — unwrap `data` và `data.items`
- Interceptor 401 → refresh → retry
- `getFriendlyErrorMessage` — 422 BUSINESS_RULE, VALIDATION_ERROR, UNAUTHORIZED

### Tuần 1–3 highlights

- AppMode Online/Offline + badge + nav highlight
- Virtual Tour: `@photo-sphere-viewer/virtual-tour-plugin` (lazy)
- Chat: `ChatMessageContent` — dòng `Nguồn:` muted
- Scan: camera + jsQR, lịch sử, auto check-in debounce
- Explore: cover fallback chỉ khi null/404; "Xem thêm"
- Quests: progress `currentStep/stepsTotal`; không ép title Stitch
- Responsive: `SideNavMobile`, `SideNavTablet`, `TopNavCompact`
- Prod: `vercel.json`, `.env.example`, warn localhost trên build prod

---

## 6) Còn lại (không chặn demo)

| Việc | Ưu tiên | Ghi chú |
|------|---------|---------|
| Deploy Vercel + `VITE_API_URL` prod | **P0 ops** | Tuần 3 Ngày 17 |
| BE CORS + SQL panorama Củ Chi | **P0 ops** | Tuần 3 Ngày 16 |
| Form sửa Profile (`PATCH /me`) | P2 | API sẵn |
| Chat history pager UI | P2 | API sẵn |
| Xóa `CharacterRoster` mock (dead code) | P3 | Không mount |
| E2E Playwright | P3 | |
| `html5-qrcode` dependency thừa | P3 | Đang dùng jsQR |

---

## 7) Golden path test (chạy tay trước pitch)

**Chuẩn bị:** BE docker + 5–6 file SQL, `GEMINI_API_KEY`, `npm run dev`, GPS + camera trên mobile.

### Online

1. Register/Login → Mode "Khám phá từ xa"
2. Explore → Củ Chi detail
3. Tour 360 — xoay, chuyển scene hotspot
4. Chat — 1 câu hỏi → thấy `Nguồn:` cuối reply
5. Cổng thời gian — slider xưa/nay

### Offline

1. Mode "Đang tại di tích"
2. Scan QR `timelens:location:11111111-1111-1111-1111-111111111111` + GPS
3. Quests → start → progress
4. Secret story (nếu unlock)
5. Photo frame → Share

### Prod (sau deploy)

- Login &lt; 30s từ domain Vercel
- Không `localhost` trong network tab API

---

## 8) Quy tắc khi tiếp tục sửa FE

1. Không rewrite `features/` / layout Stitch khi chỉ bind API.
2. List qua `getListData` / `getPageData`.
3. Toast + copy tiếng Việt; không lộ `locationId` trên UI.
4. Theme: `globals.css` + tokens.
5. Trước khi xong: `npm run lint` + `npm run build`.

---

## 9) Lệnh dev

```bash
cd HistAR/FE
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

---

## 10) Changelog gần đây

- CP3 Tuần 1–3: AppMode, Virtual Tour, responsive, polish states
- Tuần 3: bỏ Street View fallback, vercel prod, resize PhotoFrame
- Kiểm tra cuối: giữ `from` + query qua login/mode-select; cập nhật doc BE/workflow

---

*Nếu code lệch doc, cập nhật file này và `FE_WEEK1-3_COMPLIANCE.md`.*
