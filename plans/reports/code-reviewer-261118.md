# Review tìm collection, liên hệ và tuỳ chọn outfit

Ngày: 2026-11-18. Phạm vi: thay đổi đang có so với HEAD, bỏ qua .gitignore có trước phiên. Không sửa production hoặc test trong review.

## Kết luận
- Chưa phát hiện lỗi Critical/High trong luồng production đã đọc.
- Một lỗi Medium cần sửa ở helper E2E trước khi chạy content suite: helper PUT/restore settings bỏ mất contactEmail và contactPhone mới thêm.
- Các yêu cầu production đã có: tìm server-side, liên hệ sửa ở admin, link outfit được rỗng, lựa chọn mũi tên mặc định tắt và nét mảnh.

## Phát hiện cần sửa
### Medium — helper E2E làm mất thông tin liên hệ
- Vị trí: e2e/support/admin-settings.ts:17 (SettingsDocument), :36 (WRITABLE_KEYS), :95 (chrome reset).
- Cách tái hiện: lưu contactEmail/contactPhone; gọi updateSettings({ homeMode: 'sections' }) trong content E2E. toPutBody chỉ gửi WRITABLE_KEYS, hiện thiếu hai field. API updateSettings tại apps/api/src/services/settings-service.ts:100 xoá các optional keys bị bỏ.
- Tác động: chạy E2E làm mất email/sđt; restoreSettings cũng bỏ hai field nên teardown không phục hồi dù snapshot đã có giá trị.
- Hướng sửa: thêm hai field vào SettingsDocument, WRITABLE_KEYS và trạng thái reset trong restoreSettings; kiểm tra luồng snapshot/restore giữ được contact đã có và bỏ đúng field ban đầu vắng.

## Ghi nhận phạm vi Git
- apps/web/next-env.d.ts bị next dev đổi đường dẫn .next/types thành .next/dev/types; đây là artifact môi trường. Nên trả về bản HEAD khi đã dừng server kiểm tra/build để không đưa vào thay đổi tính năng.
- Không có package/lockfile thay đổi. Không thấy secret trong các dòng production mới; không đọc .env.
- Visual snapshots cũ có mũi tên mặc định; cần review thực tế trước khi cập nhật, không duyệt snapshot mù.

## Kiểm chứng tự chạy
- pnpm --filter @under30ss/web exec vitest run test/admin/outfit-arrows.test.tsx test/public/site-contact-links.test.tsx test/app/collections-page.test.tsx test/public/site-header.test.tsx: 4 files, 23 tests đạt.
- git diff --check: đạt, chỉ cảnh báo CRLF/LF.
- Đã đọc luồng API query/filter/count, settings PUT/read, DTO outfit, editor state/save/preview, renderer affiliate và marker SVG.
- Đã kiểm đầu vào adversarial bằng code: query escaped regex và giới hạn 100 ký tự; draft vẫn được lọc; contact được validate và mailto encode/tel chuẩn hoá; affiliate URL sai không có href; schema vẫn chặn anchor sai và URL không HTTPS.
- Full suite/build/browser đang do phiên chính thực hiện; chưa tự xác nhận các kết quả đó ở thời điểm viết.

## Tài liệu và kế hoạch
- Đồng bộ docs/system-architecture.md, docs/project-changelog.md và journal trong docs/journals/.
- Chỉ đánh dấu phần implementation đã đối chiếu xong. Final validation để pending cho phiên chính cập nhật từ kết quả cuối.
