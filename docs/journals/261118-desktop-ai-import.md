# Desktop nhập nháp bộ sưu tập bằng AI

Ngày: 2026-11-18. Thành phần: `apps/desktop`, shared contracts, importer API, token admin và cấu hình triển khai. Kế hoạch: `plans/261118-desktop-ai-import/plan.md`.

## Bối cảnh và thay đổi

Cần nhập các poster thời trang từ folder trên Windows, sửa kết quả trước khi gửi và giữ luồng xuất bản web hiện có. Đã thêm Electron/React với bản sao ảnh đã xoay đúng chiều, checkpoint local, adapter Codex CLI, màn duyệt crop/nội dung/anchor và đồng bộ draft qua HTTPS. Mỗi poster đã duyệt tạo một collection và một outfit; root dev/build web không tự khởi động hoặc build desktop.

## Quyết định đáng giữ

- Dùng hợp đồng phân tích riêng `poster-analysis.v1`, không ép dữ liệu AI chưa chắc thành outfit hợp lệ ngay. Crop/anchor có thể rỗng và có lý do cần duyệt; không cố định số món trong prompt.
- AI chỉ phân tích ảnh. App thực hiện crop và chuyển hệ tọa độ; nét mũi tên đè lên ảnh vẫn cần xử lý biên tập. Token website không đi vào prompt, env hoặc context Codex.
- Cấu hình CLI/prompt/giới hạn là snapshot của phiên. Credential website dùng mã hóa hệ điều hành, tách khỏi manifest và chỉ trả mask cho renderer.
- Mỗi thao tác gửi có ID/hash ổn định, intent và entity IDs phía server được lưu trước side effect. Receipt, lease và `writeStarted` hỗ trợ phục hồi; không hứa transaction S3/MongoDB hoặc tự dọn ảnh upload dở.

## Review và bài học

Reviewer độc lập phát hiện hai rủi ro tạo trùng: đổi token cùng origin làm đổi namespace phiên server; mở hai tiến trình làm mất binding trong checkpoint cache. Đã bind fingerprint credential và origin từ lần gửi đầu, đồng thời dùng single-instance lock. Khi kết quả commit còn chưa rõ, giữ nguyên phiên bản đã gửi để retry/đối soát thay vì mở khóa chỉnh sửa.

Lỗi schema phản hồi thành công vẫn có thể lộ token qua tên field không hợp lệ. Phản hồi sai hợp đồng nay trả lỗi chung, redactor nhận đúng prefix token thực. Những boundary cần che credential cố ý không giữ nguyên exception thô để tránh đưa bí mật vào chuỗi lỗi.

Kiểm thử phục hồi còn phát hiện nguy cơ token đã xóa/đổi sống lại khi file credential chính hỏng rồi fallback `.bak`. Credential hiện chỉ đọc primary và không giữ backup tự phục hồi; lỗi file vẫn cho mở cấu hình để nhập token mới hoặc xóa rõ ràng. Cấu hình thường và manifest tiếp tục dùng backup recovery.

Giới hạn local và server độc lập nên desktop kiểm quota operation/media bằng các ID thực trước khi thêm upload/commit, đồng thời hiển thị hạn mức khi kiểm tra kết nối. Điều này tránh gửi dở folder lớn chỉ vì default local cao hơn default server; các lỗi đồng thời và kết quả từng mục vẫn do server quyết định.

Smoke Windows cần loại `ELECTRON_RUN_AS_NODE` khỏi môi trường launch; chỉ gán chuỗi rỗng vẫn làm Electron chạy sai chế độ. Chụp cửa sổ ẩn dùng native `capturePage`, không coi timeout screenshot là lỗi crop. Regression chọn lại file đã auto-select cũng được test bắt và sửa tại hook chọn phiên/ảnh.

## Bằng chứng và giới hạn

- Codex CLI `0.169.1`, model yêu cầu `gpt-6.1-sol`, provider theo cấu hình local: hai mẫu có lượt thành công đúng schema, lần lượt 9 và 8 món. Ảnh thứ hai timeout lần đầu rồi retry thành công; giữ nguyên lịch sử này trong [báo cáo live](../../plans/reports/261118-codex-desktop-live-probe.md).
- Review độc lập `9.5/10`, các High/Medium đã xác minh được sửa: [báo cáo](../../plans/reports/code-review-261118-desktop-ai-import.md).
- [Smoke Electron thật](../../plans/reports/desktop-ai-smoke/result.json), ghi lúc 14:13, xác nhận Electron 45.3.4, DPAPI/IPC/crop/checkpoint/single-instance. Smoke dùng analysis đã ghi, không thay thế phép thử AI hoặc sync production.
- [HTTP test](../../plans/reports/tester-261118-desktop-import-http.json) dùng server thật trong môi trường test cô lập; kiểm mất phản hồi, retry và phục hồi ID. Storage là recorder, không phải object storage production.
- [Smoke HTTP theo ảnh poster](../../plans/reports/poster-import-http-smoke.md) đạt 1/1: hai ảnh có kết quả `needs_review` với 9 và 8 item, sau duyệt tạo hai draft; replay không tạo bản ghi trùng. Phân tích được nạp từ report đã lưu, không gọi Codex mới.
- [Token browser smoke](../../plans/reports/desktop-token-smoke/result.json) chạy Next/Express/Chromium thật với admin test; kiểm tạo, ẩn token, thu hồi, quyền truy cập trước/sau và hai viewport.
- [Package check](../../plans/reports/desktop-ai-smoke/package.json), ghi lúc 14:13, xác nhận portable Windows và Sharp native bên trong; cấu hình chưa ký số.
- [Image Docker API/web](../../plans/reports/261118-desktop-server-images.json) build đạt; kiểm tra một lần xác nhận không có Electron packages và không lưu build-only env. Không khởi động service/API/database/object storage.
- Các JSON cuối: shared 224/224, desktop 93/93 (31 suite), API 267/267 (102 suite), web 754/754 (287 suite); không lỗi/bỏ qua. API chạy một worker với scratch trên ổ D. Các lượt trước gồm hai worker Windows dừng mã `3221226505` (`0xC0000409`) và MongoMemoryServer từ chối khi dung lượng khả dụng thấp hơn 512 MiB; đây là hai vấn đề hạ tầng chạy test tách biệt. Các lượt lỗi được giữ làm lịch sử trong [log test API](../../plans/reports/tester-261118-desktop-import-api-threads-final.log) và [báo cáo phiên chính](../../plans/reports/project-manager-261118-desktop-ai-import.md), không tính vào kết quả cuối.

Lint và typecheck toàn repo đã đạt trong lượt tổng hợp của phiên chính. Kết quả build/đóng gói cuối được đối chiếu trong plan và evidence tương ứng. Chưa triển khai website production, chưa nhập dữ liệu vào DB thật và chưa commit/push trong phạm vi công việc này.

## Bước tiếp theo khi vận hành

Theo dõi dung lượng ảnh/receipt, kiểm tra hạn mức server trước folder lớn và thử lại bằng đúng token của phiên. Việc thay provider/model cần chạy lại ảnh thật; kết quả hai mẫu không bảo đảm độ chính xác trên mọi poster. Hướng dẫn sử dụng ở [desktop-import-guide.md](../desktop-import-guide.md).
