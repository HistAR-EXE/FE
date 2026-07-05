# HistAR — Known Gaps (BE ↔ FE audit)

> Cập nhật sau audit P0/B/C — dùng trước khi push production.

## BE chưa có (FE không thể hiển thị)

| Tính năng | Ghi chú |
|-----------|---------|
| **Location CRUD** | Chỉ `GET /api/locations` + `GET /api/admin/locations/{id}/era-count`. Admin CMS chỉ **dropdown chọn** địa điểm seed — **không có nút "Thêm địa điểm"**. |
| **DELETE admin content** | Không có DELETE cho discovery / artifact / quest / panorama. |
| **FR-27 Org roster remove** | Teacher chưa xóa học sinh khỏi org — P2, out of scope Phase C. |

## Đã fix trong audit này

| Gap | Fix |
|-----|-----|
| Session replay | `adminApi.sessionReplay` + UI trên `/admin/analytics` |
| My creations gallery | `viralApi.myCreations` + section Profile overview |
| Panorama deep-link | `panoramaApi.getById` + fallback Tour360 |
| Seed pipeline | `2026-07-04_org_members`, `2026-07-05`, `2026-07-06` trong `docker-db-seed.sh` |
| Admin Profile nav | Links Analytics + Tổ chức |

## Partial / limitation còn lại

| Hạng mục | Trạng thái |
|----------|------------|
| Admin users pagination | API hỗ trợ page/size; UI chỉ page 0 |
| Admin analytics location | Hardcode Củ Chi; chưa location picker |
| Admin org analytics | Hardcode demo org UUID |
| `orgSubscription` | JWT/session có; **chưa UI badge, chưa content gate B2B** |
| `TierGate.tsx` | Component tồn tại nhưng **chưa wire** — pages dùng inline `isPremium` |
| Org join at register | Chỉ Profile settings, không form đăng ký |
| `/groups` discoverability | Link từ Profile, chưa TopNav chính |
| Logout | Chỉ Profile; `refreshToken` null có thể BE 400 |
| Legacy chat APIs | `POST /api/chat`, `POST /api/chat/sync` — FE dùng `/messages` |
| `POST /api/me/artifacts/unlock` | Disabled (C-05) — FE dùng `/me/discoveries` |

## Seed / deploy

Sau pull, chạy migration mới trên Postgres:

```bash
# Docker
BE/docs/scripts/run-all-seed.ps1

# Hoặc thủ công (theo thứ tự):
# 2026-07-04_profile_tier.sql
# 2026-07-04_org_members_seed.sql
# 2026-07-05_ensure_admin_accounts.sql
# 2026-07-06_org_rbac_and_groups.sql
```

Tài khoản test: `admin@histar.vn` / `demo@histar.vn` / `teacher@histar.vn` — password `Demo@2026`.
