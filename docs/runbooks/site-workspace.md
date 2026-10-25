# Runbook: không gian di tích — onboard, phát hành, thu hồi

English summary: onboard a site representative, publish reviewed profile/station text from `/site-workspace`, and roll back from the **Đã phát hành** tab or the rollback API. Look up the change in Admin Audit. Do not edit content with SQL.

Workspace FE chưa có màn admin duyệt onboarding. Admin dùng API. Sau khi duyệt, quản lý di tích làm các bước còn lại trên `/site-workspace`.

## 1. Đại diện gửi yêu cầu

Người dùng đã đăng nhập, email đã xác minh, gọi:

```http
POST /api/site-onboarding-requests
Authorization: Bearer <access-token của đại diện>
Content-Type: application/json

{
  "representativeName": "Nguyễn Văn Đại diện",
  "organizationName": "Ban quản lý di tích",
  "representativeEmail": "dai-dien@example.com",
  "siteCode": "cu-chi",
  "evidenceNote": "Công văn xác minh, không dán bí mật vào ghi chú"
}
```

`siteCode` phải trùng `locations.site_code`. Không gửi user id trong body. Hệ thống lấy người gửi từ token.

## 2. Admin duyệt và cấp Site Manager

Chưa có UI admin cho việc này.

```http
GET /api/admin/site-onboarding-requests?status=PENDING
Authorization: Bearer <access-token ADMIN>
```

```http
POST /api/admin/site-onboarding-requests/{requestId}/approve
Authorization: Bearer <access-token ADMIN>
Content-Type: application/json

{ "note": "Đã xác minh đại diện" }
```

Approve là idempotent nếu yêu cầu đã `APPROVED`. Nó tạo hoặc kích hoạt membership `SITE_MANAGER` cho đúng người đã gửi yêu cầu. Từ chối dùng `POST .../{requestId}/reject` với `note` bắt buộc.

Đối soát: `GET /api/admin/audit?entityType=SITE_ONBOARDING&action=APPROVED`.

## 3. Quản lý thêm biên tập và người duyệt

Đăng nhập bằng tài khoản vừa được duyệt. Mở `/site-workspace`, tab **Thành viên**.

1. Dán UUID người dùng, chọn **Biên tập viên**, bấm **Lưu thành viên**.
2. Dán UUID người duyệt (một người khác), chọn **Người duyệt**, bấm **Lưu thành viên**.

Người duyệt không được là người sẽ tự gửi bản đó. Quản lý di tích thường không tự cấp thêm `SITE_MANAGER`; việc đó thuộc platform admin.

## 4. Biên tập, duyệt, phát hành

1. Biên tập viên: tab **Hồ sơ di tích** và **Trạm**, sửa nội dung, bấm **Gửi duyệt**.
2. Người duyệt: tab **Chờ duyệt**, bấm **Phê duyệt**. Nút này không hiện cho chính người đã gửi.
3. Quản lý di tích: cùng tab, bấm **Phát hành** trên bản **Đã duyệt**.

Phát hành ghi đè hồ sơ công khai hoặc trạm đang chạy và chuyển bản phát hành cũ sang `ARCHIVED`. Kiểm tra công khai:

- Hồ sơ: `GET /api/locations` hoặc trang dùng tên/mô tả địa điểm.
- Trạm: `GET /api/sites/{siteCode}/stations` và trang `/sites/{siteCode}/stations/ST01/media`.

## 5. Thu hồi trên UI

Quản lý di tích mở tab **Đã phát hành**. Mỗi bản đang `PUBLISHED` có ô **Lý do thu hồi** và nút **Thu hồi hồ sơ di tích** hoặc **Thu hồi trạm ST01** khi còn một bản `ARCHIVED` cùng hồ sơ/trạm.

Nút gọi:

```http
POST /api/site-workspaces/{siteCode}/content/{SITE_PROFILE|STATION}/{resourceKey}/versions/{archivedVersion}/rollback
```

`archivedVersion` là số phiên bản của bản đã lưu trữ cần khôi phục. `expectedRevision` là `revision` của bản **đang phát hành** (`PUBLISHED`), không phải revision của bản archived.

## 6. Thu hồi khẩn cấp bằng API

Dùng khi UI không vào được. Người gọi là Site Manager của đúng site, hoặc platform admin.

1. Lấy danh sách phiên bản:

```http
GET /api/site-workspaces/cu-chi/content/versions
Authorization: Bearer <token quản lý hoặc admin>
```

2. Chọn đúng một dòng `status = PUBLISHED` của `SITE_PROFILE`/`profile` hoặc `STATION`/`ST01`. Ghi `revision` của dòng này. Đây là `expectedRevision`.
3. Chọn dòng `status = ARCHIVED` có snapshot cần đưa lại ra công khai. Ghi `version` của dòng này. Đây là `{archivedVersion}` trên URL.
4. Gọi rollback. `reason` không được rỗng.

```http
POST /api/site-workspaces/cu-chi/content/SITE_PROFILE/profile/versions/1/rollback
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Thu hồi khẩn cấp: mô tả công khai sai",
  "expectedRevision": 4
}
```

Số `1` và `4` chỉ là ví dụ. Lấy chúng từ bước 2 và 3. Nếu `expectedRevision` không khớp bản đang sống, API trả xung đột và không đổi nội dung công khai. Gọi lại với revision mới, không sửa database.

Trạm dùng cùng dạng, với `STATION` và mã trạm, ví dụ `ST01`.

## 7. Đối soát Admin Audit

```http
GET /api/admin/audit?entityType=SITE_CONTENT&action=SITE_CONTENT_ROLLED_BACK
Authorization: Bearer <token ADMIN>
```

Phát hành nằm ở `action=SITE_CONTENT_PUBLISHED`. Onboarding nằm ở `entityType=SITE_ONBOARDING`.

Trang `/admin/audit` lọc được theo entity id. `SITE_CONTENT` và `SITE_ONBOARDING` có thể không có trong dropdown; khi đó dùng query API ở trên. Mỗi sự kiện có actor, reason, site, kind, resource key và version trong metadata.

## Không sửa SQL

Không `UPDATE`/`DELETE` trên `locations`, `stations`, `station_content_blocks`, `site_content_versions`, `site_memberships` để đổi nội dung đang phát hành hoặc để thu hồi. Việc đó bỏ qua audit, revision và có thể để lại hai bản `PUBLISHED`.

Chỉ dùng API publish/rollback. Nếu rollback trả lỗi nghiệp vụ, đọc message, đối soát audit, rồi gọi lại với đúng version archived và đúng revision của bản đang sống.

## Gate 1

Gate 1 đạt khi một bản trạm (và hồ sơ, nếu có trong đợt đó) được phát hành rồi thu hồi thành công:

- [ ] Admin đã approve onboarding; đại diện có membership `SITE_MANAGER` đang active.
- [ ] Biên tập viên và người duyệt là hai tài khoản khác nhau.
- [ ] Biên tập viên đã gửi hồ sơ và/hoặc ST01.
- [ ] Người duyệt phê duyệt, không tự duyệt bản của mình.
- [ ] Quản lý di tích phát hành đúng bản `APPROVED`.
- [ ] `GET /api/locations` hoặc `GET /api/sites/{siteCode}/stations` đổi sang nội dung mới; trang công khai thấy chữ mới.
- [ ] Thu hồi dùng reason và `expectedRevision` của bản `PUBLISHED` đang sống, URL trỏ tới version `ARCHIVED`.
- [ ] API công khai trở lại chữ cũ.
- [ ] Audit có `SITE_CONTENT_PUBLISHED` và `SITE_CONTENT_ROLLED_BACK`.
- [ ] Không có câu SQL nào sửa nội dung hoặc membership.
