# Backend Work Items For FE Compatibility (TimeLens / HistAR)

Muc tieu: chot 1 bo cong viec BE de FE khong con mock, UI Stitch hien thi day du, va cac flow login/quests/explore/profile on dinh khi demo.

## 0) Dinh nghia done chung

- Tat ca endpoint tra ve dung envelope:
  - success: `ApiResponse<T>`:
    - `success: true`
    - `message?: string`
    - `data: T`
  - error: `ApiErrorPayload`:
    - `success: false`
    - `code: string`
    - `message: string`
    - `timestamp?: string`
    - `fieldErrors?: Record<string, string>`
- Tat ca list endpoint ho tro `page/size/sort` + filter.
- Tat ca image URL tra ve la URL hop le, truy cap duoc (khong 404/timeout).
- Tat ca truy van list chinh co index DB, p95 response < 300ms (du lieu demo + dev env).

---

## P0 - Bat buoc lam ngay

## 1) Location data (quan trong nhat cho Explore)

### 1.1 Schema / migration can them

Bang `locations`:
- `id` (uuid, pk)
- `name` (varchar, not null)
- `description` (text, not null)
- `city` (varchar, not null)
- `latitude` (decimal(10,7), not null)
- `longitude` (decimal(10,7), not null)
- `cover_image` (text, not null)
- `rating` (decimal(2,1), null, default 0)  -> FE can hien sao
- `is_ar_available` (boolean, default false)
- `distance_km` (decimal(5,2), null) -> optional; uu tien tinh dong theo vi tri user
- `created_at` (timestamp, not null)

### 1.2 Endpoint can bo sung/chuan hoa

- `GET /api/locations`
  - Query:
    - `page`, `size`, `sort`
    - `city`
    - `search`
    - `nearLat`, `nearLng` (optional, de BE tinh `distanceKm`)
    - `maxDistanceKm` (optional)
    - `tags` (optional: `ar`, `ton_giao`, `trieu_nguyen`, ...)
  - Muc tieu response item:
    - `id, name, description, city, latitude, longitude, coverImage, rating, distanceKm, isArAvailable, createdAt`

- `GET /api/locations/{id}`: cung field nhu tren + metadata neu can.

### 1.3 Acceptance criteria

- Explore page hien du card day du (anh + ten + mo ta + distance + rating), khong can fallback mock.
- Khong con hien trang card trang/trang xo.
- Truy van list location co filter + search + sort o BE-side.

---

## 2) Quest domain (Nhiem vu / Chi tiet nhiem vu)

### 2.1 Schema / migration can them

Bang `quests`:
- `id` (uuid, pk)
- `location_id` (fk -> locations.id, indexed)
- `title` (varchar, not null)
- `description` (text, not null)
- `xp_reward` (int, not null)
- `steps_total` (int, not null, default 1)
- `unlock_level` (int, not null, default 1)
- `cover_image` (text, null)
- `status_default` (enum: `not_started|in_progress|completed`, default `not_started`)
- `created_at` (timestamp)

Bang `user_quest_progress`:
- `id` (uuid, pk)
- `user_id` (fk, indexed)
- `quest_id` (fk, indexed)
- `location_id` (fk, indexed)
- `status` (enum: `not_started|in_progress|completed`, indexed)
- `current_step` (int, default 0)
- `steps_total` (int, not null)
- `started_at` (timestamp null)
- `completed_at` (timestamp null)
- unique (`user_id`, `quest_id`)

### 2.2 Endpoint can chuan hoa

- `GET /api/quests?locationId=&page=&size=&status=`
- `GET /api/me/quests?locationId=&page=&size=&status=`
- `POST /api/quests/{questId}/start`
- `GET /api/quests/{questId}/progress`

### 2.3 DTO de FE dung truc tiep

Quest item:
- `id, locationId, title, description, pointsReward, stepsTotal, unlockLevel, coverImage`

Quest progress item:
- `questId, locationId, title, description, pointsReward, status, currentStep, stepsTotal, startedAt, completedAt`

### 2.4 Acceptance criteria

- FE khong phai tu suy dien progress nua, lay truc tiep tu BE.
- `Nhiem vu` va `Chi tiet nhiem vu` hien dung status + progress + XP.

---

## 3) Auth/User (session on dinh + profile day du)

### 3.1 Auth contract

Hien tai FE dang dung:
- `POST /api/auth/login`
- `POST /api/auth/register`
- payload tra ve: `{ token, userId, displayName }`

Can nang cap:
- access token + refresh token:
  - `accessToken`, `expiresIn`
  - `refreshToken`, `refreshExpiresIn`
- endpoint:
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout` (revoke refresh token)

### 3.2 Profile contract

Can giu cac field FE dang dung:
- `id, email, displayName, avatarUrl, level, totalPoints, city`
- optional nhung rat nen co:
  - `levelName`
  - `pointsToNextLevel`
  - `levelProgressPercent`

Can them endpoint:
- `PATCH /api/profile/me`
  - update: `displayName`, `avatarUrl`, `city`

### 3.3 Acceptance criteria

- Token het han duoc refresh, khong bi logout dot ngot khi demo.
- Profile page hien day du thong tin, update profile thanh cong.

---

## 4) Error contract co dinh (401/403/404/422)

## 4.1 Ma loi de FE map toast chuan

- 401: `UNAUTHORIZED`
- 403: `FORBIDDEN`
- 404: `NOT_FOUND`
- 422:
  - `VALIDATION_ERROR` (co `fieldErrors`)
  - `BUSINESS_RULE` (nghiep vu, message than thien)

## 4.2 Vi du 422 validation

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Du lieu khong hop le",
  "fieldErrors": {
    "email": "Email khong dung dinh dang",
    "password": "Mat khau toi thieu 8 ky tu"
  },
  "timestamp": "2026-06-02T13:30:00Z"
}
```

## 4.3 Acceptance criteria

- FE map toast thong nhat, khong can viet case rieng tung endpoint.
- Khong doi format loi tuy endpoint.

---

## 5) Media strategy (tranh trang/trang xo)

- Chot 1 nguon media:
  - uu tien S3 + CDN (hoac Cloud storage + CDN)
- Tat ca URL anh trong DB la absolute URL.
- Them health job check image URL (4xx/5xx) theo lich.
- Quy tac fallback:
  - Neu image null/hong -> BE tra URL placeholder mac dinh.

Acceptance:
- Cover image location/quest/avatar load on dinh, khong timeout bat thuong.

---

## P1 - Nen lam ngay sau P0

## 6) Pagination + filtering tren BE-side

Ap dung cho:
- `GET /api/locations`
- `GET /api/quests`
- `GET /api/me/quests`
- `GET /api/leaderboard`
- `GET /api/chat/conversations/{id}/messages`

Query chung:
- `page` (default 0), `size` (default 20, max 100), `sort` (`field,asc|desc`)
- Them filter rieng tung domain (`status`, `locationId`, `search`, ...)

Tra ve:
- `items`, `page`, `size`, `totalItems`, `totalPages`

---

## 7) DB index / performance

Toi thieu tao index:
- `quests(location_id, created_at desc)`
- `user_quest_progress(user_id, status, created_at desc)`
- `user_quest_progress(quest_id)`
- `leaderboard_entries(user_id, total_points desc, created_at desc)`
- `chat_messages(conversation_id, created_at asc)`
- `locations(city, created_at desc)`

Acceptance:
- endpoint list p95 < 300ms trong local/staging voi seed data demo.

---

## 8) Observability (de debug nhanh)

- Middleware sinh/nhan `x-request-id` moi request.
- Log structure:
  - `timestamp`, `level`, `requestId`, `userId?`, `path`, `status`, `durationMs`, `errorCode?`
- Audit cho 422 `BUSINESS_RULE`:
  - luu event + context (user, endpoint, payload metadata)
- Health checks:
  - `/actuator/health` (db, cache, storage)
- Metrics co ban:
  - request count, error rate, latency percentile.

---

## P2 - Chot cho demo on dinh

## 9) Seed/demo data dong bo voi FE

Muc tieu: demo khong bi rong du lieu, UI ra giong Stitch.

### 9.1 Locations seed (toi thieu 3 ban ghi)

1) Dai Noi Hue
- `name`: `Dai Noi Hue`
- `description`: `Khu di tich lich su vi dai nhat cua trieu dai nha Nguyen, mo khoa trai nghiem thuc te ao.`
- `city`: `Hue`
- `coverImage`: dung URL FE `images.exploreDaiNoi`
- `rating`: 4.9
- `isArAvailable`: true

2) Chua Thien Mu
- `name`: `Chua Thien Mu`
- `description`: `Ngoi chua co kinh nam ben bo song Huong, bieu tuong tam linh cua co do.`
- `city`: `Hue`
- `coverImage`: dung URL FE `images.exploreChuaThienMu`
- `rating`: 4.8
- `isArAvailable`: false

3) Hoang Thanh Thang Long (de dung cho detail/quests)
- co `coverImage` hop le + toa do that hoac demo hop ly.

### 9.2 Quests seed (toi thieu 2 quest active + 1 locked)

Quest A:
- `title`: `Dau an Hoang Thanh`
- `description`: `Giai ma cac co vat duoc tim thay tai khu vuc trung tam de khoi phuc dong thoi gian.`
- `xpReward`: 500
- `stepsTotal`: 4
- `unlockLevel`: 1
- `coverImage`: URL FE `images.questDauAnHoangThanh`

Quest B:
- `title`: `Bi an Chua Cau`
- `description`: `Tim kiem cac dau vet thuong mai co dai doc theo bo song.`
- `xpReward`: 200
- `stepsTotal`: 3
- `unlockLevel`: 1
- `coverImage`: URL FE `images.questBiAnChuaCau`

Quest C (locked):
- `title`: `Mat ma Lang Tam`
- `unlockLevel`: 5

### 9.3 Profile + leaderboard + badge seed

- Tao it nhat 5 user demo:
  - day du `displayName`, `avatarUrl`, `level`, `totalPoints`.
- Badge catalog:
  - it nhat 6 badge (co iconUrl).
- Gan badge da nhan cho 2-3 user de man `Co vat/Ho so` khong trong.

### 9.4 Chat seed

- It nhat 1 character co `characterId` hop le.
- 1 conversation mau co 6-10 message.

---

## 10) Mapping nhanh FE -> BE (de team BE check)

Field FE dang tieu thu:

- Location (`src/features/locations/api.ts`):
  - `id, name, description, latitude, longitude, city, coverImage, createdAt`
- Quest (`src/features/gamification/api.ts`):
  - `id, locationId, title, description, pointsReward`
  - progress: `status, startedAt, completedAt`
- Profile (`src/features/profile/api.ts`):
  - `id, email, displayName, avatarUrl, level, totalPoints, city, levelName?, pointsToNextLevel?, levelProgressPercent?`
- Error envelope (`src/shared/api/contracts.ts`):
  - `code, message, fieldErrors`

---

## 11) Ke hoach thuc thi de xong nhanh

Sprint de xuat:

- Sprint 1 (P0):
  - Location schema + endpoint + media fallback
  - Quest schema + progress contract
  - Error contract fix cung 401/403/404/422
  - Seed data toi thieu (locations + quests)
- Sprint 2 (P1):
  - Refresh token flow
  - Pagination/filter cho tat ca list
  - Index + performance tune
  - Observability (request-id + health + metrics)
- Sprint 3 (P2):
  - Demo polish data (profile/leaderboard/chat/badges)
  - Retry/failure drills cho media + auth refresh

---

## 12) Danh sach ticket goi y (copy vao Jira/Trello)

- BE-LOC-01: Migration bo sung location fields (`rating`, `is_ar_available`, `distance_km`).
- BE-LOC-02: Nâng cap `GET /api/locations` ho tro page/filter/sort/nearby.
- BE-QUEST-01: Migration quest + user_quest_progress (steps/unlock/status).
- BE-QUEST-02: Chuan hoa quest/progress DTO theo FE contract.
- BE-AUTH-01: Refresh token + revoke/logout.
- BE-PROFILE-01: `PATCH /api/profile/me` + validate avatar/displayName/city.
- BE-ERR-01: Error envelope thong nhat 401/403/404/422.
- BE-DB-01: Tao index cho location/quest/leaderboard/chat.
- BE-MEDIA-01: Chuyen URL media sang CDN/S3 + fallback placeholder.
- BE-OBS-01: Request-id logging + health + metrics.
- BE-SEED-01: Seed data demo full (locations/quests/profile/leaderboard/chat/badges).

---

Neu can, buoc tiep theo la tao them 1 file SQL migration mau (PostgreSQL) tu danh sach tren de BE co the chay truc tiep.
