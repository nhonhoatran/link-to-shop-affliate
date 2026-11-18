---
title: "Desktop nhập bộ sưu tập bằng AI"
status: completed
priority: P1
effort: large
branch: main
tags: [desktop, ai, import]
created: 2026-11-18
---

# Desktop nhập bộ sưu tập bằng AI

Ngày: 2026-11-18. Hướng triển khai đã được xác nhận: Windows, Codex, duyệt local, token website. Prompt mặc định cho poster có người mẫu giữa và món đồ/chú thích hai bên; vẫn chỉnh được, không cố định số món.

Trạng thái: completed. Đã triển khai và đối chiếu đủ năm phase; checklist cuối, smoke, đóng gói và tài liệu có bằng chứng trong `plans/reports/`.

## Các bước

- [x] Hợp đồng dữ liệu phân tích và prompt tiếng Việt có phiên bản, cho phép crop/anchor chưa xác định.
- [x] Kiểm chứng Codex thật với ảnh mẫu; ghi bằng chứng và lỗi nếu gateway từ chối.
- [x] Desktop Electron/React: cấu hình, đọc folder, checkpoint local, gọi Codex, crop và duyệt.
- [x] API token giới hạn quyền nhập nháp, upload và hoàn tất có chống trùng; UI quản lý token trong admin.
- [x] Đồng bộ desktop qua HTTPS, lưu ID kết quả, không ghi trực tiếp DB.
- [x] Kiểm thử hợp đồng, quyền truy cập, retry, build/typecheck và duyệt UI; tài liệu hướng dẫn.

## Tiến độ các phase

| Phase | Trạng thái | Checklist |
|---|---|---|
| [01 — Contract, prompt, probe](./phase-01-contract-prompt-probe.md) | completed | 8/8 |
| [02 — Desktop runtime](./phase-02-desktop-runtime.md) | completed | 8/8 |
| [03 — API nhập nháp](./phase-03-api-import.md) | completed | 8/8 |
| [04 — Duyệt và token UI](./phase-04-review-ui.md) | completed | 7/7 |
| [05 — Kiểm thử và tài liệu](./phase-05-validation-docs.md) | completed | 13/13 |

Tổng checklist ở các phase: **44/44**. Sáu mục tổng quan cũng đã hoàn tất; hai nhóm checklist được đếm riêng, không cộng lặp. Sync-back đã đối chiếu source, báo cáo và artifact.

## Review thiết kế trước triển khai

- Giữ token website ngoài subprocess/context AI; lưu token local bằng cơ chế hệ điều hành. Agent chỉ phân tích, crop do app thực hiện.
- Dùng Codex CLI chính thức với ảnh đính kèm, JSON Schema và quyền hạn chế; giữ cấu hình global hiện có. Đường dẫn executable chọn được.
- Ranh giới crop theo phần trăm ảnh đã xoay; anchor theo ảnh nguồn rồi quy đổi sang ảnh người mẫu. Không coi crop là xóa mũi tên dính trên áo.
- Sửa bản nháp làm mất trạng thái duyệt; chỉ phiên bản đã duyệt mới được gửi. MVP chỉ tạo draft; xuất bản dùng luồng web hiện có.
- Token web quản lý bằng cookie admin hiện tại, importer có middleware riêng và không mở quyền vào các route admin còn lại.
- ID phiên + mục và fingerprint giúp retry không tạo trùng. Upload đi qua kiểm tra ảnh hiện có, server cấp key; không nhận storage key tự tạo từ desktop.
- Mỗi lần đồng bộ gom ảnh và dữ liệu thành một phiên có trạng thái; xử lý phục hồi, không hứa transaction S3 + MongoDB.
- Thêm desktop không khiến pnpm dev của web tự bật cửa sổ app. Không sửa thay đổi .gitignore đang có của người dùng.
- Danh sách file phân trang ở tiến trình main; các thao tác chỉnh ảnh hiện tại ở renderer.
- OpenCode để bước sau, cùng contract; không giả định SDK V1 dùng được với CLI V2.

## Giới hạn và nghiệm thu

Ứng dụng Windows đóng gói được, chọn folder và lưu cấu hình được; prompt đã điền sẵn và khôi phục mặc định được; Codex thật nhận ảnh hoặc hiển thị lỗi có thể hành động; vùng crop/nội dung/anchor sửa và duyệt được; chỉ dữ liệu đã duyệt được gửi; token sai/thu hồi bị từ chối; retry không tạo trùng; nháp xuất hiện đúng schema web.

## Phân công và review

Ghi chú giai đoạn lập kế hoạch: đã yêu cầu planner và architecture reviewer qua công cụ cộng tác nhưng chưa có artifact đọc được; người triển khai rà trực tiếp các ranh giới trước khi viết mã. Trong lượt triển khai 2026-11-18 đã có agent API, UI, tester/debugger, reviewer độc lập và docs/project manager; các kết quả hiện có được ghi dưới đây.

## Bằng chứng và phạm vi triển khai

- [Codex thật](../reports/261118-codex-desktop-live-probe.md): hai mẫu có lượt thành công với 9/8 món; giữ nguyên bằng chứng timeout ban đầu của mẫu thứ hai. Không suy độ chính xác chung từ hai mẫu.
- [API/web và HTTP](../reports/tester-261118-desktop-import-qa.md), [API cuối 267/267](../reports/tester-261118-desktop-import-api-disk-d-final.json), [web cuối 754/754](../reports/tester-261118-desktop-import-web-final.json), [desktop cuối 93/93](../reports/261118-desktop-all-tests-final.json), [shared 224/224](../reports/261118-desktop-shared-tests.json): kiểm quyền, upload, lease/receipt và retry; các lượt cuối đều không failed/pending.
- [Smoke HTTP hai poster](../reports/poster-import-http-smoke.md) và [kết quả 1/1](../reports/poster-import-http-smoke.json): hai ảnh thật đã ghi tạo hai collection/outfit, số item 9/8 và `needs_review`; chặn sync trước duyệt, sau duyệt gọi loopback HTTP và replay cùng ID không tạo trùng.
- [Electron native](../reports/desktop-ai-smoke/result.json), [gói Windows](../reports/desktop-ai-smoke/package.json) và [token UI browser](../reports/desktop-token-smoke/result.json) có artifact riêng. Smoke Electron tái dùng kết quả Codex đã lưu; HTTP/browser chạy với DB memory và storage recorder cô lập, không dùng tài khoản production, DB production hoặc S3 thật.
- [Review độc lập](../reports/code-review-261118-desktop-ai-import.md): 9.5/10, hai High và một Medium được phát hiện đã sửa; [Docker images](../reports/261118-desktop-server-images.json) API/web cũng được build và kiểm tra không chứa Electron hoặc lưu build-only env khi chạy.
- MVP tạo mới **một bộ sưu tập kèm một outfit draft cho mỗi poster**. OpenCode, xuất bản trực tiếp từ desktop, gom vào bộ sưu tập có sẵn và dọn tự động receipt/object bỏ dở nằm ngoài lượt triển khai này.
- Credential chỉ đọc primary và không phục hồi token đã xóa/đổi từ `.bak`. Phiên bắt đầu gửi được gắn cả origin và fingerprint token; nếu token cũ bị thu hồi khi chưa rõ kết quả, cần kiểm tra trên web trước khi tạo phiên mới.
- [Hướng dẫn sử dụng](../../docs/desktop-import-guide.md) và [journal](../../docs/journals/261118-desktop-ai-import.md) đã được bổ sung; log build web có cảnh báo fetch public settings do API không chạy trong lúc prerender, nên đây không phải xác nhận tích hợp với API production. Lượt `pnpm build` tổng hợp vẫn hoàn tất.
