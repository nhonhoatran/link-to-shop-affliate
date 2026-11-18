# Kiểm thử outfit

Trạng thái: hoàn tất phần kiểm thử được giao.

## Kết quả mới nhất
- Shared outfit schema: 33/33 pass.
- Web targeted lookbook/feed/admin outfit: 98/98 pass, 14 files.
- API CRUD/display options/seed: 24/24 pass, 3 files. Dùng Mongo memory server của test harness, không đụng DB cấu hình trong .env.
- Full shared: 182/182 pass, 9 files.
- Full web: 746/746 pass, 110 files (trước khi thêm 1 ca create default). Chạy bổ sung file create form sau đó: 3/3 pass.
- Full API: 241/241 pass, 36 files (trước khi thêm 1 ca seed anchor). Chạy lại file seed sau đó: 9/9 pass.
- Rà soát file test sau chỉnh sửa: không có nội dung riêng tư trong file.

## Thay đổi test
- Bỏ kỳ vọng cấm đăng khi thiếu link; giữ assertion chặn HTTP/javascript và thiếu anchor.
- Món không link vẫn hiển thị nhưng không href giả, không buy CTA.
- Thêm API roundtrip cho showArrows: tạo mới mặc định false, bản ghi cũ thiếu field false, true/false được lưu, PUT cũ thiếu field giữ option.
- Thêm kiểm thử editor dirty/save/reload và preview đồng bộ showArrows; bật/tắt connector trong cùng component; đầu mũi tên mở.
- Connector animation/remeasure dùng fixture riêng showArrows:true; fixture chung giữ mặc định thiếu field.
- E2E admin-outfit-flow hiện chọn Có mũi tên để những test connector phía sau vẫn có dữ liệu đúng. Chưa chạy E2E ở agent này.

## Lưu ý root
- E2E visual reference snapshots dramatic/mesh-84 hiện dựa trên ảnh cũ luôn có mũi tên. Theo mặc định mới, dữ liệu cũ thiếu showArrows trở thành false nên snapshot cần review thực tế; chưa cập nhật snapshot mù.
- Kiểm tra giao diện Tổng quan: vẫn có nhãn “Thiếu link affiliate” và “Bản nháp thiếu link” trong test app/admin-overview-page.test.tsx. Đây không làm test fail nhưng có thể gây hiểu nhầm link bắt buộc; root cân nhắc wording.
- Console chỉ có warning Vite CJS hiện hữu và jsdom navigation, không có targeted fail.
- Không sửa code production; không cập nhật ảnh snapshot; không commit.
