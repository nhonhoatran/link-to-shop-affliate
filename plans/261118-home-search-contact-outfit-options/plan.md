# Tìm collection, liên hệ và tuỳ chọn outfit

Trạng thái: hoàn tất.

Kế hoạch đã được rà soát với kết quả khảo sát UI; tiếp tục theo phạm vi yêu cầu, không cần bước phê duyệt bổ sung cho thay đổi cục bộ có thể hoàn tác.

## Phạm vi đã đối chiếu
- Trang chủ có hai chế độ feed và sections. Thanh tìm collection đặt trong header dùng chung để giữ khung feed; gửi GET sang /collections?q=... và kết quả được query, đếm, phân trang ở API.
- Trang collection giữ từ khoá khi đổi trang, có trạng thái không có kết quả và xoá tìm kiếm. Tìm theo tên và slug, escape regex. Không tự bổ sung yêu cầu riêng cho mục Collection chưa có mô tả.
- Email và số điện thoại lưu trong settings, sửa được ở admin, hiển thị trong footer cả trang thường lẫn feed. Không tạo giá trị liên hệ mẫu.
- Link sản phẩm được để trống kể cả khi đăng. Link có nhập vẫn kiểm HTTPS. Món thiếu link vẫn hiển thị, không tạo liên kết giả hoặc nút mua dẫn tới #.
- Thêm showArrows ở cấp outfit, mặc định false khi tạo mới hoặc đọc bản ghi cũ; lựa chọn admin và preview đồng bộ. Khi bật, đường nối và đầu mũi tên có nét mảnh, dùng token CSS. Điểm anchor vẫn theo quy tắc hiện hành.

## Triển khai
- [x] Hợp đồng dữ liệu, query và settings API.
- [x] Tìm collection, liên hệ public và admin.
- [x] Link tuỳ chọn, mũi tên và editor/preview.
- [x] Kiểm tra schema/API/component, typecheck/lint/build và giao diện trình duyệt.
- [x] Review, cập nhật tài liệu và ghi nhận giới hạn kiểm chứng.

## Kiểm tra và rủi ro
- Kiểm tra tìm kiếm literal, draft không lộ, giữ q khi phân trang, SSR/no-JS.
- Kiểm tra lưu/xoá liên hệ, URL mailto/tel an toàn và trạng thái chưa cấu hình.
- Kiểm tra đăng/lưu outfit thiếu link, HTTPS sai vẫn bị từ chối; thiếu link không có hành vi click giả.
- Kiểm tra mặc định tắt mũi tên, bật/lưu/tải lại, preview và nét mảnh.
- Dữ liệu MongoDB dùng trường bổ sung có fallback, không cần Prisma hay thay đổi DB trực tiếp.
- .gitignore đã có chỉnh sửa trước phiên làm việc; giữ nguyên.
- Không commit/push hoặc triển khai bên ngoài phạm vi phát triển cục bộ.

## Đồng bộ review và kiểm chứng
- Review production: chưa thấy Critical/High. Một lỗi Medium ở helper E2E cần xử lý: PUT/restore settings bỏ contactEmail/contactPhone. Báo cáo: `plans/reports/code-reviewer-261118.md`.
- Reviewer tự chạy 23 tests web trong 4 file đạt; báo cáo tester ghi kết quả full suite và các lượt chạy bổ sung.
- Browser QA, typecheck/lint/build cuối cùng đã được xác minh trong phiên chính.
- Đã cập nhật kiến trúc, deployment guide (quy tắc link khi publish/seed), changelog và journal.
