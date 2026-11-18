# Phase 04: Desktop review và quản lý token web

Trạng thái: completed. Contract Phase 1 đã chốt; giao diện đã ráp với runtime/backend. Kiểm tra cuối của toàn bộ bản build được theo dõi tại Phase 5.

## Quyền sở hữu

Agent UI: `apps/desktop/src/renderer/**` và test UI. Agent API: trang token web, components/API loaders/admin nav liên quan. Root: shared contract, main/preload và cấu hình dependencies.

## Desktop

- [x] App shell rõ quy trình: Kết nối → Chọn folder → Phân tích → Duyệt → Đồng bộ. Windows-first; trạng thái empty/error/loading có hành động tiếp.
- [x] Settings AI có Codex path/profile/model; prompt mặc định đã điền, chỉnh và khôi phục mặc định. Không bắt khách soạn prompt; advanced prompt thu gọn. Site profile URL/tên môi trường/token mask và kiểm tra kết nối độc lập.
- [x] Folder file list từ main process, thumbnail, filename, trạng thái từng ảnh, progress, cancel/retry. Không renderer tự đọc disk hoặc gọi gateway/web token.
- [x] Review đặt poster gốc và crop model/items cạnh nhau. Sửa crop bằng overlay hoặc số phần trăm với preview, tên/subtitle/description/link, side/order, anchor trên model. Cảnh báo crop có mũi tên; hỗ trợ thay/giữ vùng gốc và retry phân tích.
- [x] Duyệt từng outfit; chỉnh dữ liệu sau duyệt bỏ trạng thái duyệt. Hiện site đích và chỉ sync những mục đã duyệt. Lỗi/partial success rõ, nút retry và link tới admin.
- [x] Không import component Next.js nguyên trạng; có thể tái dùng token/mẫu UI và helper thuần. Dữ liệu AI render text, không HTML.

## Token web

- [x] Trang admin token list lấy từ server; tạo với tên và hạn dùng, chỉ show/copy token ngay lúc tạo, revoke từng token. Trang hiện URL website cần đưa vào desktop và phạm vi quyền nhập nháp. Dùng shell/components form/toast/error hiện có; không render token đã lưu từ DB.

## Kiểm chứng

Testing Library: default prompt có sẵn/reset, edit invalidates approval, error/retry flow, destination URL visible, no secret in DOM after creation/settings save. Browser/Electron QA: keyboard focus, crop controls, text Việt, empty folder/error/runtime missing, progress/cancel, cửa sổ nhỏ; không dùng dữ liệu giả để tuyên bố sync thật.

## Kết quả và bằng chứng

- Renderer: `apps/desktop/src/renderer/**`. Crop sửa bằng số phần trăm, có preview và nút giữ toàn bộ ảnh/bỏ vùng; anchor nullable. Phiên bản prompt tự tạo khi lưu, hiển thị chỉ đọc; prompt mặc định/reset có sẵn.
- [Báo cáo UI và review độc lập](../reports/code-review-261118-desktop-ai-import.md) ghi 22/22 UI test tại lần kiểm 17:26:32. Giao diện khóa sửa khi remote processing/không rõ kết quả, failed có entity IDs hoặc `retryOnly`; lỗi xác định chưa có side effect mới cho sửa revision.
- [Smoke Electron](../reports/desktop-ai-smoke/result.json) và các ảnh `review-*.png` dùng cửa sổ native, dữ liệu ảnh/crop thật và bản phân tích Codex đã ghi. Không coi dữ liệu đã lưu trong smoke là một lần gọi model mới.
- [Smoke Next + Chromium](../reports/desktop-token-smoke/result.json) dùng API/MongoDB cô lập: login cookie, tạo token, capabilities 200, ẩn secret khỏi DOM, xác nhận thu hồi HTTP 204 rồi capabilities 401; đã kiểm màn hình desktop và 390 px, không có console/page errors.
- Renderer không giữ token sau khi lưu; credential hỏng có thông báo và cho lưu mới/xóa, không phục hồi token cũ từ backup. Các cập nhật bảo mật cuối được kiểm lại trong Phase 5.
