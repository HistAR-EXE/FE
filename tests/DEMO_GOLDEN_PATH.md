# HistAR Demo Golden Path — Manual Checklist

> Dùng khi demo/báo cáo EXE101. Automated: `cd FE && npm run test:e2e` (BE phải chạy trước).

## Trước demo

1. Chạy migration: `BE/docs/database/2026-07-04_location_unlock.sql` (hoặc `run-all-seed.ps1`)
2. Khởi động BE :8080, FE :5173, AI :8100 (chat/voice tùy chọn)

## Golden path

1. **Login** → chọn mode **Online** → `/explore`
2. **Map:** Củ Chi marker sáng; Bến Nhà Rồng mờ + khóa (nếu chưa hoàn thành quest Củ Chi)
3. **Complete Củ Chi quest** (demo check-in nếu remote: `VITE_DEMO_MODE=true`)
4. **QuestCompleteOverlay:** stamp Hộ chiếu + "Di tích mới đã mở khoá" + nút Khám phá ngay
5. **Map refresh:** Bến Nhà Rồng marker sáng → vào heritage detail
6. **Profile:** section "Hộ chiếu Di sản" có stamp Củ Chi
7. **Chat:** reply có/không có section "📚 Nguồn" đúng AC-2

## Test coverage note

**78 automated Playwright tests pass** (5 skip khi AI RAG hoặc MinIO không chạy); **55 JUnit** bad-case + happy path. Chạy full: `npm run test:all`. Hardware thật (GPS ngoài trời, Web Share native) vẫn optional trước demo live.
