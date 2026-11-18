# Tìm collection, liên hệ và tuỳ chọn outfit

Ngày: 2026-11-18. Thành phần: shared contracts, API MongoDB, public UI và admin editor.
Kế hoạch: `plans/261118-home-search-contact-outfit-options/plan.md`.

## Bối cảnh
Trang chủ cần tìm collection và hiển thị liên hệ. Outfit cần cho phép món chưa có link sản phẩm, đồng thời thêm lựa chọn có/không có mũi tên, mặc định tắt.

## Thay đổi và quyết định
- Dùng form GET trong header và tìm tên/slug ở API. Query được giới hạn độ dài, escape regex; filter/count/pagination cùng ở server. Giữ q khi đổi trang, không tải toàn bộ collection về browser.
- Liên hệ được lưu trong settings và sửa từ admin. Cả footer thường và footer trong feed đều nhận dữ liệu; trường trống thì ẩn.
- Bỏ điều kiện bắt buộc link lúc đăng nhưng giữ HTTPS khi có link và quy tắc anchor hiện hành. Món thiếu link không có href giả; nút mua được ẩn.
- showArrows được lưu theo outfit, fallback false cho dữ liệu cũ. Editor và preview dùng chung DTO. Khi bật, SVG dùng nét mảnh và đầu chevron mở; kích thước nằm trong token CSS.

## Review và bài học
- Reviewer tự chạy 23 tests web trong 4 file: đạt. git diff --check đạt.
- Phát hiện helper E2E settings dùng danh sách field tường minh, chưa thêm contactEmail/contactPhone. Với PUT toàn document, thiếu field sẽ xoá dữ liệu; cần sửa cả ghi lẫn phục hồi trước khi chạy content suite. Chi tiết: `plans/reports/code-reviewer-261118.md`.
- next dev có thể sửa next-env.d.ts sang đường dẫn type trong .next/dev. Đây là artifact môi trường, cần kiểm diff trước khi giao thay đổi.
- Visual snapshots cũ thể hiện mũi tên luôn bật. Không cập nhật hàng loạt khi chưa review ảnh thực tế.

## Kiểm chứng còn lại
Phiên chính tổng hợp build/typecheck/lint và browser QA. Báo cáo testcase chi tiết nằm tại `plans/reports/tester-outfit-261118.md` và `plans/reports/collection-search-261118.md`. Không có commit/push hoặc triển khai production trong công việc này.
