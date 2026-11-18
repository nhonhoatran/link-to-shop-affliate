# Phase 05: Kiểm thử, đóng gói và tài liệu

Trạng thái: completed. Phase 1–4 đã triển khai; các kiểm tra cuối, bản đóng gói và tài liệu đã được đối chiếu. Chủ sở hữu: tester/debugger, reviewer, docs/project manager theo workflow.

## Thực hiện

- [x] Tester chạy test shared/API/desktop/UI phù hợp, typecheck, lint và build. Kiểm đúng API import qua HTTP trong test; không chỉ test helper.
- [x] Codex live evidence cho ảnh mẫu báo rõ engine/version/provider/model thực, output status, số món và giới hạn. Nếu không chạy được provider phải giữ kết luận chưa xác minh, không mock thành successful connection.
- [x] Electron smoke bằng runtime thật: launch hidden/controlled, chọn fixture session, preview ảnh, IPC, settings persistence/cancel; kiểm CSP/file access/main exit. Xác nhận Windows build/portable artifact thực sự có nếu báo đã đóng gói.
- [x] Root web dev/build và Docker build paths không vô tình kéo Electron, root `pnpm dev` không mở desktop.
- [x] Reviewer độc lập kiểm token, session ownership, path/IPC, prompt injection boundaries, job idempotency, không leak secrets, main/renderer separation, crop transform và publish semantics; sửa Critical/High trước hoàn tất.
- [x] Cập nhật docs/system-architecture.md, deployment-guide.md và code-standards.md theo phần thực tế; có hướng dẫn desktop cài/chọn CLI/prompt/connect token/duyệt/sync/retry. Chỉ ghi lệnh đã xác minh hoặc ghi rõ chưa thử.
- [x] Project manager đồng bộ checklist toàn bộ phases và plan; journal tiếng Việt trung lập, commit/comment code tiếng Anh. Không tự commit hoặc push.

## Tiêu chí nghiệm thu

- [x] Folder mẫu tạo hai draft với số món do ảnh quyết định; prompt không chứa đáp án.
- [x] Người quản trị sửa/duyệt được và chỉ phần đã duyệt được sync.
- [x] Upload, persist, retry và mở lại không mất phần đã xong hoặc tạo trùng.
- [x] Token revoked/expired/khác owner bị chặn; AI không có token website.
- [x] Website nhận đầy đủ media + collection + outfit draft qua service, cache được làm mới.
- [x] Bằng chứng test/build/UI và các giới hạn provider/packaging ghi đúng trong báo cáo cuối.

## Bằng chứng nghiệm thu

- [Codex thật](../reports/261118-codex-desktop-live-probe.md), [QA API/web/HTTP](../reports/tester-261118-desktop-import-qa.md), [review độc lập](../reports/code-review-261118-desktop-ai-import.md).
- [Smoke Electron](../reports/desktop-ai-smoke/result.json), [gói Windows và Sharp native](../reports/desktop-ai-smoke/package.json), [browser token UI](../reports/desktop-token-smoke/result.json).
- Shared có [JSON kiểm thử](../reports/261118-desktop-shared-tests.json) `224/224`; bộ desktop cuối có [93/93](../reports/261118-desktop-all-tests-final.json), API có [267/267](../reports/tester-261118-desktop-import-api-disk-d-final.json), web có [754/754](../reports/tester-261118-desktop-import-web-final.json). Tất cả báo cáo cuối đều `success=true`, không failed/pending/todo.
- [Smoke HTTP hai poster](../reports/poster-import-http-smoke.md) và [JSON kết quả](../reports/poster-import-http-smoke.json) xác nhận hai ảnh thật đã ghi (9/8 món, đều `needs_review`), chặn trước duyệt, gửi qua HTTP loopback sau duyệt và replay cùng ID không tạo trùng. Đây là smoke opt-in với MongoMemoryServer/storage recorder cô lập, không phải production.
- [Portable/Sharp mới](../reports/desktop-ai-smoke/package.json) và [Electron smoke mới](../reports/desktop-ai-smoke/result.json) có cùng mốc sau source cuối; server image [API/web](../reports/261118-desktop-server-images.json) build thật, không có Electron và không giữ build-only env runtime. Browser token smoke và review độc lập giữ bằng chứng riêng.
- Tài liệu đã cập nhật: [hướng dẫn desktop](../../docs/desktop-import-guide.md), [kiến trúc](../../docs/system-architecture.md), [triển khai](../../docs/deployment-guide.md), [code standards](../../docs/code-standards.md), [changelog](../../docs/project-changelog.md) và [journal](../../docs/journals/261118-desktop-ai-import.md).
- Lint, typecheck và `pnpm build` toàn repo đã qua. Build web có log fetch public settings không thành công do API không chạy trong lúc prerender; build vẫn hoàn tất, nên không xem đó là kiểm tra kết nối tới API production.

## Lịch sử chạy lại trước khi chốt

- [Image server đã kiểm thật](../reports/261118-desktop-server-images.json): cả API/web tồn tại, không có package Electron, không resolve được Electron và không giữ các giá trị env chỉ dùng ở bước build. Phép kiểm là container Node chỉ đọc, không khởi động API, DB hoặc object storage.
- Trước khi có lượt cuối, một lượt API chạy hai worker dừng với mã native Windows `3221226505`, còn một lượt retry bị lỗi hạ tầng dung lượng đĩa/TEMP. Các lượt này được giữ làm lịch sử, không dùng để kết luận chức năng và không nới assertion.
- Báo cáo API trung gian [cũ](../reports/tester-261118-desktop-import-api-final.json) có `success=true` nhưng chỉ `251/267`, pending suite và tiến trình không hoàn tất; không tính là pass. Lượt [API cuối](../reports/tester-261118-desktop-import-api-disk-d-final.json) chạy với pool 1 và thư mục tạm riêng đã đạt `267/267`.
- Lượt desktop cũ `90/90` và IPC recovery `6/6` được thay bằng [full 93/93](../reports/261118-desktop-all-tests-final.json) từ source cuối. Không cộng các lượt riêng thành một kết quả mới.

## Giới hạn phải giữ trong nghiệm thu

- Phép thử Codex dùng hai ảnh thật, còn HTTP dùng dữ liệu manual draft có chủ đích; smoke Electron tái dùng analysis đã ghi. Chưa tuyên bố có một lượt xuyên suốt từ AI tới VPS/S3 thật.
- Crop hình chữ nhật không xóa mũi tên đè lên người mẫu. Cả hai analysis mẫu đều yêu cầu duyệt.
- Bản portable chưa ký số, chưa đo độ chính xác tổng thể/chi phí/provider retention. Receipt/object bỏ dở chưa có cleanup tự động; giữ khả năng phục hồi và chống trùng.
