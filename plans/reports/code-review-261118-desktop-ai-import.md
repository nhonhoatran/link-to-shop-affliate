# Review độc lập: Desktop AI import

Ngày: 2026-11-18. Phạm vi review độc lập: API nhập nháp, shared contract, Electron main/preload, adapter Codex và đường build. Renderer do cùng người triển khai nên không được tính là review độc lập của giao diện.

## Kết luận

Điểm: **9.5/10** trong phạm vi đã kiểm tra, giữ nguyên sau lượt re-review bổ sung. Không còn Critical/High/Medium được xác nhận chưa xử lý trong phần source đã rà. Các phát hiện ban đầu và lỗi credential recovery do tester bổ sung đã được sửa, đối chiếu lại. Kiểm thử tổng thể, đóng gói và duyệt hình ảnh do workflow chính thực hiện riêng; điểm review không thay cho các bằng chứng đó.

## Phát hiện và kết quả sửa

### High — Đổi token cùng website làm đổi namespace chống trùng

- Trước sửa: desktop chỉ gắn phiên với website origin, trong khi API tách phiên theo `tokenId` và `clientSessionId`. Đổi token khi một commit chưa rõ kết quả có thể tạo namespace mới, nhận failed/noIDs ở namespace mới và mở khóa nội dung dù worker của token cũ còn chạy.
- Bằng chứng: `apps/api/src/services/import-session-service.ts:15`; schema unique index trong `apps/api/src/models/import-session-model.ts`; luồng sync trước sửa đã được đối chiếu với hai ranh giới này.
- Sửa: `apps/desktop/src/main/import-client.ts:8` tạo fingerprint SHA-256; `apps/desktop/src/main/sync-session.ts:30` chặn checkpoint cũ thiếu danh tính, token khác và origin khác trước khi gọi website. Origin và fingerprint được ghi trong cùng lần cập nhật checkpoint.
- Fingerprint chỉ nằm ở envelope main trong `apps/desktop/src/main/session-store.ts:13`, không có trong DTO session/file trả cho renderer và không được đưa vào prompt.
- Kết quả review sửa: **đã xử lý**. Trường hợp thu hồi token cũ cần kiểm tra kết quả trên web trước khi tạo phiên khác; không tự chuyển phiên sang token mới.

### High — Hai tiến trình desktop có thể ghi đè checkpoint từ cache cũ

- Trước sửa: `SessionStore.cache`, hàng chờ ghi và `DesktopJobs.jobs` chỉ có hiệu lực trong một tiến trình; entry point chưa khóa instance.
- Phép thử thực tế dùng hai `SessionStore` trên cùng thư mục tạm: A ghi origin/fingerprint; B đã cache trước đó rồi đổi tên phiên. Đọc lại từ disk cho kết quả `{"destinationBindingLost":true,"credentialBindingLost":true}`. Thư mục tạm được dọn sau phép thử.
- Sửa: `apps/desktop/src/main/index.ts:67` gọi `app.requestSingleInstanceLock()` trước `app.whenReady()`. Tiến trình thứ hai thoát; sự kiện `second-instance` chỉ đưa cửa sổ hiện tại lên trước.
- API đã đối chiếu trong bản Electron cài thật: `apps/desktop/node_modules/electron/electron.d.ts:1730`.
- Bằng chứng smoke native đã đọc: `plans/reports/desktop-ai-smoke/result.json` có status `passed`, Electron `45.3.4`, kiểm tra `single instance lock` và không có lỗi.
- Kết quả review sửa: **đã xử lý ở entry point**. `SessionStore` vẫn là kho dành cho một tiến trình, không phải kho hỗ trợ nhiều tiến trình ghi đồng thời.

### Medium — Lỗi schema từ phản hồi 200 có thể làm lộ token website

- Trước sửa: prefix token thật là `u30_import_`, chưa có trong redactor. Phản hồi 200 có unknown key chứa token khiến Zod đưa key đó vào lỗi, đi qua IPC tới UI.
- Probe gọi `ImportClient` và redactor thật với transport local, token giả; không gọi mạng hoặc đọc credential thật. Trước sửa: `{"schemaErrorContainsFakeSecret":true,"redactorStillContainsFakeSecret":true}`.
- Sửa: `apps/desktop/src/main/import-client.ts:42` dùng `safeParse` và thông báo chung, không trả chi tiết payload; `apps/desktop/src/main/codex-adapter.ts:9` che prefix token thật.
- Chạy lại cùng probe sau sửa: `{"schemaErrorContainsFakeSecret":false,"redactorStillContainsFakeSecret":false,"bareTokenRedacted":true}`.
- Kết quả: **đã xử lý và kiểm chứng lại**.

## Re-review bổ sung sau kiểm thử tổng thể

Đã đọc lại source và test cho các thay đổi sau báo cáo ban đầu; không sửa source trong lượt re-review này. Không phát hiện Critical/High/Medium mới được xác nhận.

### Medium — Credential backup có thể khôi phục token đã xóa

- Tester đã giữ bằng chứng trước sửa: `plans/reports/261118-desktop-credential-regression-before.json` có 7 test, 6 pass và 1 fail. Tình huống token đã clear nhưng primary hỏng không được phép phục hồi secret cũ.
- `apps/desktop/src/main/settings-store.ts:27` hiện chỉ đọc primary credential, không gọi helper phục hồi `.bak`. `writeCredential` ở `:35` ghi với `backup=false` và xóa backup cũ.
- View chỉ trả warning chung và `configured=false` khi credential hỏng; vẫn cho nhập token mới hoặc clear mà không cần đọc lại secret lỗi (`:40`, `:56`). Shared view có warning tùy chọn; UI hiển thị cảnh báo và cho clear trong trường hợp này.
- Test tại `apps/desktop/test/main/settings-store.test.ts` kiểm clear/primary corruption, xóa backup, thay credential hỏng và clear tiếp. Kết quả đã có trong lượt desktop full 90/90 pass.
- Kết quả re-review: **đã xử lý**. Đây là sửa lỗi do tester phát hiện, không phải phát hiện mới chưa được xử lý.

### Các thay đổi khác đã đối chiếu

- **Atomic rename Windows:** `apps/desktop/src/main/atomic-json.ts:8` chỉ retry EPERM/EBUSY/EACCES, tối đa năm lần gọi rename với bốn khoảng chờ hữu hạn; không xóa target cũ để thay thế. Năm case `atomic-json.test.ts` kiểm cả rename thật sau lỗi tạm, lỗi dai dẳng giữ target và ENOENT không retry. Không kết luận nguyên nhân tác nhân khóa file bên ngoài từ lỗi EPERM.
- **Mở kết quả một phần:** `apps/desktop/src/main/desktop-runtime.ts:90` yêu cầu có entity ID trong receipt và website đã gắn phiên. Link được dựng từ origin cùng đường `/admin/outfits|collections/<id>`; không dùng URL do server trả. Cho phép processing/failed có ID xác nhận là thao tác đọc, không mở khóa chỉnh sửa hay suy đoán ID còn thiếu. Sáu test IPC riêng đã pass, có ba case bổ sung cho thay đổi này.
- **Thoát ứng dụng:** `apps/desktop/src/main/desktop-jobs.ts:85` abort controller rồi chờ các completion; `apps/desktop/src/main/index.ts:84` hoãn quit khi còn job và chỉ quit lại sau shutdown. Test jobs kiểm trạng thái interrupted được lưu trước khi shutdown hoàn tất.
- **Token và AI:** `apps/desktop/src/main/codex-isolation.ts:11` bỏ cả giá trị chứa website token trong biến môi trường đã được cho phép; `apps/desktop/src/main/codex-adapter.ts:19` chặn token prefix trong prompt trước khi tạo thư mục làm việc/gọi Codex. Không coi đây là bộ nhận diện mọi loại secret; ranh giới chính vẫn là token website chỉ nằm trong kho credential riêng của main.
- **Hạn mức đồng bộ:** `apps/desktop/src/main/sync-session.ts:46` dùng tập hợp ID remote và ID của các mục đủ điều kiện; kiểm capabilities động trước upload/commit bổ sung. Retry cùng ID không bị cộng hai lần. Start session và bind đích có thể đã xảy ra trước preflight; thông báo chỉ cam kết chưa gửi thêm ảnh hoặc mục.
- **Docker web:** `apps/web/Dockerfile:19` dùng assignment môi trường chỉ cho lệnh build, giá trị giả hợp lệ và API loopback không có dịch vụ. Runtime bắt đầu từ stage Node mới; không thêm production secret qua ARG/ENV. Các route public dùng origin/metadata được rà có `force-dynamic` hoặc đọc `searchParams`; env server được đọc từ tiến trình runtime. Chưa tự chạy lại Docker image cuối trong lượt review này.

### Bằng chứng đã tự đọc

| Artifact | Kết quả đọc được |
|---|---|
| `261118-desktop-credential-regression-before.json` | 6 pass, 1 fail; bằng chứng lỗi trước sửa |
| `261118-desktop-all-tests.json` | 90/90 pass, `success=true`, 0 fail |
| `261118-desktop-shared-tests.json` | 224/224 pass, `success=true`, 0 fail |
| `261118-desktop-runtime-partial-tests.json` | 6/6 pass, `success=true`, 0 fail |

Lượt desktop full 90 gồm 68 main và 22 UI. Lượt IPC riêng có ba case mới sau lượt full; không cộng lượt chạy trùng và không ghi full 93 đã pass khi chưa có output tương ứng. Binary Windows phải được đóng gói lại sau các sửa cuối của atomic rename/partial recovery trước khi xem là artifact cuối cùng.

## Các ranh giới đã rà

- Bearer importer kiểm scope, expiry, revoked và admin còn tồn tại: `apps/api/src/services/import-auth-service.ts:73`. Quản lý token vẫn nằm sau cookie admin; không cấp Bearer quyền vào các route admin hiện có.
- Mọi media tham chiếu phải thuộc session của token hiện tại; input không nhận storage key tùy ý: `apps/api/src/services/import-content-service.ts:13`.
- Trạng thái draft, featured=false và showArrows=false do server đặt: `apps/api/src/services/import-content-service.ts:25`.
- Intent dùng entity IDs cố định, unique operation identity, lease và cờ writeStarted không reset; receipt không hứa có transaction chung S3/MongoDB. `retryOnly` giữ khóa khi một worker cũ có thể còn ghi.
- Đường ảnh bị giới hạn theo đúng session, không chỉ toàn bộ thư mục sessions: `apps/desktop/src/main/session-store.ts:121` và `apps/desktop/src/main/local-paths.ts:12`.
- IPC kiểm sender/main frame/document URL; renderer không có Node, dùng context isolation và sandbox: `apps/desktop/src/main/index.ts:42` và `:53`.
- Codex nhận môi trường giới hạn, MCP kế thừa được tắt và kiểm tra lại; không truyền token website vào prompt/env: `apps/desktop/src/main/codex-isolation.ts:12` và `:31`.
- Root dev/build chọn web/API/shared rõ ràng; Dockerfiles web/API cài workspace theo filter riêng. Chưa tự chạy Docker build trong lượt review này.

## Kiểm chứng trong lượt triển khai renderer

- `pnpm --filter @under30ss/desktop exec vitest run --project ui`: **22/22 pass**, 4 files, lần chạy 17:26:32 ngày 2026-11-18. Bao gồm phiên bản prompt chỉ đọc, reset prompt và xóa token khỏi form trước khi lưu bất đồng bộ hoàn tất.
- `pnpm exec tsc -p apps/desktop/tsconfig.json --noEmit`: **pass** cùng đợt.
- `pnpm exec eslint apps/desktop/src/renderer apps/desktop/test/ui`: **pass** cùng đợt.
- Bộ UI dùng giả lập IPC để kiểm tra giao diện, không được xem là bằng chứng đồng bộ website thật.
- Lỗi regression đã được test bắt trước khi sửa: chọn lại file đã auto-select làm màn duyệt trống. Giữ nguyên assertion; sửa tại hook chọn file/session và kiểm tra currentFile theo fileId.

## Giới hạn

- Không chạy trên DB hoặc website thật trong lượt review; không tạo, thu hồi token thật.
- Không khẳng định độ chính xác AI từ test UI hoặc smoke dùng kết quả Codex đã lưu.
- Runtime live, packaging Windows, HTTP integration và các test rộng hơn phải đọc báo cáo tương ứng của tester/workflow chính.
