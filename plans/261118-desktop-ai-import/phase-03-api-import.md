# Phase 03: API token, upload và nhập nháp

Trạng thái: completed. Phụ thuộc Phase 1 đã hoàn tất; triển khai cùng Phase 2. Chủ sở hữu: agent API (kèm token UI web). Root giữ hub shared và lockfile.

## Công việc

- [x] Model token: token hash, ownerAdminId, label, expiresAt, revokedAt, timestamps. Tạo/list/revoke qua cookie admin hiện có; key rõ chỉ trả ở create; token không có quyền đọc/sửa site settings hay users.
- [x] Route import riêng có Bearer middleware kiểm hash, hạn/revoke, admin còn tồn tại và scope. Rate/size/quota theo env/settings, không body vô hạn. CORS/origin không nới lỏng admin; multipart path whitelist và Caddy body limit cập nhật đúng đường mới.
- [x] Contract endpoints cần chốt với root: capabilities/check, start/get session, put media (stable client media ID), commit outfit/collection bằng operation ID + payload hash. Upload metadata và imageRef do server tạo, không nhận arbitrary public key.
- [x] Session thuộc owner/token; token khác không đọc hoặc commit. Upload chỉ được tham chiếu trong phiên của nó. Bytes/type/size/hash kiểm server, upload idempotent và ghi receipt; S3 key xác định từ server-controlled session/media identity.
- [x] Chốt commit tạo mới draft và featured=false bất kể payload. Phân bổ entity IDs và lưu intent trước side effect; unique operation identity + atomic lease/claim. Sau crash dò lại ID/import reference, không tạo bản thứ hai. Payload đổi cùng ID trả conflict.
- [x] Tận dụng validation, createCollection/createOutfit và revalidate; thay service nhỏ để nhận ID/import identity có kiểm soát nếu cần. Không upsert theo slug vì có thể ghi đè nội dung cũ. Slug conflict trả lỗi cần sửa hoặc dùng hậu tố server có định nghĩa rõ.
- [x] Collection kết quả có cover, membership đúng. Fail một mục không báo whole session success; GET reconcile trả ID/link/status của các mục đã tồn tại.
- [x] Receipt media/session có vòng đời; bỏ dở giữ khả năng retry hoặc dọn sau cấu hình, không dùng TTL xoá trạng thái idempotency trước khi hết khoảng retry. Không hứa giao dịch S3/Mongo nguyên tử.

## Kiểm chứng bắt buộc

API integration bằng mongodb-memory-server và storage recorder: cookie admin token create/revoke; owner isolation; expired/deleted admin; draft enforcement; arbitrary media rejection; malformed upload; đồng thời và retry cùng request; đổi payload; crash sau entity create; ảnh upload trước commit lỗi; revalidation; không echo raw secret ngoài create. Không chạy trên DB thật.

## Kết quả và bằng chứng

- API: `apps/api/src/routes/import-routes.ts`, `admin-import-token-routes.ts`, `services/import-*.ts`, các model import và middleware riêng. Contract public cho importer dùng `desktop-import.v1`, scope duy nhất `import:draft`; token CRUD vẫn yêu cầu cookie admin.
- [Báo cáo QA API/web](../reports/tester-261118-desktop-import-qa.md) giữ chi tiết lượt đầu 266/266 và HTTP riêng. Bộ API cuối sau khi đưa test HTTP vào đã đạt [267/267](../reports/tester-261118-desktop-import-api-disk-d-final.json); bài [smoke hai poster 1/1](../reports/poster-import-http-smoke.md) bổ sung xác minh 9/8 item, gate duyệt, upload/commit qua loopback và replay không tạo trùng.
- Intent cấp entity IDs trước side effect, unique operation, lease có fence và cờ `writeStarted` không reset. GET đối soát actual entity bằng IDs/import reference; `retryOnly` giữ khóa khi worker cũ có thể còn ghi.
- Kiểm trước cả hai slug giúp lỗi trùng thông thường trả về để sửa mà chưa tạo entity. Không upsert theo slug, không nhận storage key do desktop tự đặt.
- Receipt giữ bền để retry; hiện chưa có job tự dọn receipt/object bỏ dở. Quota reservation giữ bảo thủ nếu crash giữa lúc giữ slot và tạo receipt; đây là giới hạn vận hành được ghi trong tài liệu, không phải transaction S3/MongoDB.
