# Đề xuất desktop đọc ảnh local, duyệt và đồng bộ bộ sưu tập

Ngày khảo sát: 2026-11-18, Asia/Saigon. Trạng thái: đề xuất kiến trúc, chưa triển khai desktop hoặc thử model qua Codex/OpenCode trong lượt này.

## Kết luận

Phương án phù hợp: ứng dụng Electron + React + TypeScript chạy trên máy người quản trị, đọc folder được chọn, điều khiển Codex/OpenCode cài trên máy qua giao thức chính thức, dựng bản nháp local để duyệt, sau đó gửi ảnh và dữ liệu qua API website. Website thực hiện lưu RustFS, MongoDB và làm mới nội dung public qua các service hiện tại.

Ưu tiên URL website và token nhập liệu chuyên dụng thay kết nối trực tiếp MongoDB. Token website và credential AI là hai loại riêng biệt; quá trình model phân tích ảnh không cần biết token website hoặc chuỗi kết nối DB.

Gateway Xingchi đã trả `403 client_not_allowed` với request trực tiếp bằng Node.js, nhưng thông báo liệt kê Codex và OpenCode trong các client được hỗ trợ. Đây là lý do đáng thử tích hợp runtime chính thức, không phải bằng chứng mọi kiểu nhúng, tài khoản và tác vụ ảnh đều sẽ được chấp nhận. Không giả danh client bằng header. Nếu runtime thật vẫn bị từ chối, cần làm rõ quyền truy cập với nhà cung cấp hoặc chọn endpoint/provider cho phép.

## Mục lục

1. [Bằng chứng kiểm tra](#bằng-chứng-kiểm-tra)
2. [Luồng sử dụng và trách nhiệm](#luồng-sử-dụng-và-trách-nhiệm)
3. [Kết nối AI](#kết-nối-ai)
4. [Đồng bộ website](#đồng-bộ-website)
5. [Thiết kế desktop](#thiết-kế-desktop)
6. [Thứ tự triển khai đề xuất](#thứ-tự-triển-khai-đề-xuất)
7. [Nguồn](#nguồn)
8. [Câu hỏi còn mở](#câu-hỏi-còn-mở)

## Bằng chứng kiểm tra

Lệnh chỉ đọc đã chạy trong phiên:

```text
codex --version                  → codex-cli 0.169.1
codex app-server --help          → stdio, generate-ts, generate-json-schema
codex exec --help                → --image, --output-schema, --json, --ephemeral
opencode --version              → opencode v2.3.0
opencode serve --help            → v2 API/web server
opencode run --help              → --file, --format json, --standalone
```

Các lệnh trên chỉ kiểm tra CLI đang cài và cờ được hỗ trợ, không chạy session AI hoặc chứng minh một model nhận ảnh thành công.

| Bằng chứng nguồn | Kết luận |
|---|---|
| [Kết quả probe trước](./261118-xingchi-live-api-probe.json) | Catalog có xác thực trả 200, có model yêu cầu; POST Responses trực tiếp trả 403 client_not_allowed |
| `apps/api/src/middleware/require-admin-middleware.ts:7` | Xác thực admin hiện dựa vào session.adminId; chưa phải API nhận Bearer token desktop |
| `apps/api/src/middleware/session-middleware.ts:13` và `:28` | Cookie đăng nhập tên u30.sid, httpOnly; không coi cookie này là token tích hợp ổn định |
| `apps/api/src/routes/admin-media-routes.ts:29` | Ảnh upload được chuyển qua storeImage |
| `apps/api/src/services/media-service.ts:14` | Xử lý ảnh rồi lưu object storage, trả key/kích thước; DB không giữ nội dung ảnh local |
| `apps/api/src/routes/admin-outfit-routes.ts:34` | POST kiểm tra schema, gọi createOutfit và revalidate |
| `apps/api/src/services/outfit-service.ts:98` | Kiểm tra storage key, collection tồn tại và điều kiện featured trước khi ghi |
| `apps/api/src/routes/admin-collection-routes.ts:44` và `:75` | Có các service tạo collection, gắn outfit và revalidate |
| `apps/api/src/middleware/json-only-middleware.ts:10` | Multipart hiện chỉ được nhận trên đường upload cho phép; cần xử lý rõ nếu thêm đường upload import |
| `packages/shared/src/outfit-schemas.ts:46` | Schema món và outfit có thể tái sử dụng qua workspace, vẫn cần schema riêng cho kết quả AI chưa hoàn chỉnh |

Chỉ xem mã nguồn và tài liệu; không kết nối MongoDB, không ghi dữ liệu website, không đổi cấu hình global của Codex/OpenCode.

## Luồng sử dụng và trách nhiệm

```text
Folder ảnh người dùng chọn
  → Desktop quét file, tạo manifest và phiên nhập local
  → Codex/OpenCode nhận nội dung từng ảnh hoặc nhóm ảnh
  → JSON đề xuất món đồ, chữ, vùng crop và anchor
  → Desktop kiểm tra JSON, Sharp crop ảnh từ nguồn
  → Người quản trị xem trước, sửa và duyệt
  → Desktop upload ảnh + gửi dữ liệu đã duyệt tới API website
  → API kiểm tra, lưu RustFS/MongoDB, cập nhật cache
```

Ví dụ: một folder có hai poster mẫu tạo một collection và hai outfit đề xuất. Những ô chú thích lần lượt là 9 và 8 món đã kiểm đếm trong khảo sát trước. Đây là ví dụ, không dùng số lượng này làm hằng số nhập liệu hoặc đáp án đưa trước cho model.

Phê duyệt bóc tách diễn ra trong desktop theo đề xuất người dùng. Sau duyệt, nút đồng bộ gửi phiên bản đã chốt lên website. Có thể lưu nháp hoặc đăng ngay nếu tài khoản có quyền và người quản trị chọn rõ trạng thái; không bắt buộc thêm một lần duyệt cùng nội dung trong web. Bản đầu nên đặt trạng thái mặc định là nháp, cấu hình được. Quyền đăng phải tách khỏi quyền chỉ nhập nháp.

Nếu muốn một quản trị viên khác duyệt trên website, đó là chế độ khác: cần upload bản chờ duyệt lên vùng riêng tư trước; không thể vừa duyệt từ xa trong web vừa giữ toàn bộ nội dung chưa duyệt chỉ trên máy local. Chưa chọn chế độ này làm mặc định.

### Dữ liệu đi đâu

- Folder gốc vẫn ở máy local; chỉ ảnh được chọn mới chuyển vào phiên làm việc.
- Ảnh gửi qua Codex/OpenCode vẫn có thể được chuyển tới provider cloud. Đây không phải AI chạy hoàn toàn offline.
- Bản crop, kết quả và thay đổi chưa duyệt lưu local.
- Token web chỉ dùng trong bộ phận đồng bộ, không đưa vào prompt, folder agent, subprocess environment của agent hoặc log.
- Website nhận ảnh thật cùng payload, không nhận đường dẫn `C:\...` để tự đọc trên máy người dùng.
- Sau khi đồng bộ thành công, web phục vụ nội dung độc lập với desktop. Trong lúc phân tích/upload, máy local cần hoạt động và có mạng; tắt máy thì tạm dừng, có thể tiếp tục từ checkpoint khi mở lại.

### Bóc tách ảnh

Model đề xuất dữ liệu và tọa độ; Sharp cắt ảnh bằng thuật toán dựa trên tọa độ đã kiểm tra. Không cần để agent tự viết hoặc chạy mã xử lý ảnh cho từng ảnh nhập.

Màn duyệt cần xem song song ảnh nguồn và kết quả, sửa vùng crop, tên, mô tả, thứ tự, điểm nối và link mua hàng. Kết quả AI được xem là dữ liệu không tin cậy: kiểm tra schema, file ID phải thuộc phiên nhập, vùng ảnh phải nằm trong kích thước đã chuẩn hóa; nội dung chữ chỉ render dạng text.

Giới hạn poster ghép vẫn còn: mũi tên đè lên người mẫu không biến mất khi chuyển sang desktop. Dùng ảnh rời nếu có; crop/sửa bằng tay hoặc thay nguồn khi cần. Tính năng tái tạo hình ảnh bị che là bước riêng, không được hứa khôi phục chính xác hàng hóa.

## Kết nối AI

### Codex — ưu tiên bản đầu

Tài liệu chính thức hướng dẫn dùng Codex App Server cho custom client có lịch sử, auth, approvals và sự kiện [S1, S2]. App Server có stdio JSON-RPC, input localImage và outputSchema. CLI tại máy cũng xác nhận có app-server và hỗ trợ sinh type/schema theo đúng phiên bản.

Đề xuất desktop mở một tiến trình Codex App Server riêng qua stdio, dùng runtime được cài và cấu hình được chọn. Đây là phiên làm việc riêng; không tự động điều khiển hội thoại đang mở trong Codex Desktop. Giao tiếp dùng argv và stdin có cấu trúc, không ghép tên file vào shell command.

Cho phép cấu hình đường dẫn CLI, provider/profile, model và folder làm việc của từng phiên. Không sửa ngầm config global hoặc ghi đè profile của người dùng. Có thể đọc/áp overrides được hỗ trợ nhưng không sao chép nguyên nội dung cấu hình có secret vào log.

PoC đơn giản có thể dùng `codex exec --image ... --output-schema ... --json`; `--json` là luồng sự kiện, còn schema kiểm soát dạng câu trả lời cuối. Bản desktop cần quản lý tiến độ, hủy và trường hợp agent xin quyền thì App Server thích hợp hơn. API có phần experimental: ghim phiên bản đã kiểm tra, sinh contract từ CLI tương ứng.

### OpenCode — adapter tiếp theo

Máy có OpenCode v2.3.0. URL tài liệu `/docs/sdk/` và `/docs/server/` chuyển tới tài liệu V1, không dùng ví dụ cũ làm hợp đồng cho bản V2 này.

Tài liệu V2 hiện tại cung cấp:

- `@opencode/client` để kết nối HTTP API của OpenCode [S3].
- `@opencode/client/service` cho discover/ensure một service tương thích và tạo headers kết nối local [S3].
- `@opencode/sdk` cho embedded host, là lựa chọn khác với kết nối runtime riêng [S4].
- Prompt attachment qua URI file/data; ảnh hỗ trợ được đưa thành image media. Gắn cả directory chỉ cung cấp danh sách cấp đầu, không đệ quy đọc mọi ảnh [S5].

Ưu tiên adapter kết nối runtime OpenCode chính thức đã cài, kiểm tra phiên bản và giao thức. Nếu kết nối service đang được người dùng sử dụng, không dừng/restart/sửa global config của service dùng chung; app chỉ đóng tài nguyên do nó sở hữu. Chưa kiểm tra schema trả lời và sự tương thích gateway qua runtime này.

`opencode run --format json` cung cấp JSON cho sự kiện CLI, không mặc định bảo đảm nội dung AI tuân JSON Schema dữ liệu outfit. Luôn validate kết quả trong ứng dụng; chọn cơ chế structured output theo đúng contract V2 đã kiểm chứng.

### Ranh giới quyền của agent

Agent cần ảnh và dữ liệu cần đọc. Giới hạn khả năng thực thi và file vào workspace của phiên; app thực hiện crop, ghi manifest và đồng bộ. Không cung cấp công cụ ghi DB hoặc token web cho model. Nội dung chữ trong poster và tên file là dữ liệu đầu vào, không phải chỉ dẫn được phép thay đổi quy trình duyệt.

Credential của runtime AI vẫn cần runtime để gọi provider, nhưng credential website được tách khỏi runtime đó. Giới hạn environment/cấu hình của tiến trình con; không truyền toàn bộ biến chứa secret của desktop cho agent.

## Đồng bộ website

### Vì sao chọn API

| Cách kết nối | Hệ quả | Đề xuất |
|---|---|---|
| URI MongoDB trực tiếp | Cần phân phối credential DB và quyền truy cập mạng; phải xử lý riêng ảnh RustFS, schema nghiệp vụ, quan hệ và revalidate | Không chọn cho desktop vận hành |
| URL website + token nhập liệu | API tái dùng kiểm tra và quy trình lưu hiện có; desktop thay cấu hình để chọn môi trường | Ưu tiên |

Ví dụ: ghi một document outfit có đường dẫn ảnh local vào MongoDB sẽ không làm ảnh đó xuất hiện trên VPS. API upload hiện tại tạo object key hợp lệ và kích thước trước; route outfit mới dùng các giá trị này. Ghi DB trực tiếp cũng bỏ qua revalidate trong route.

### Token và quyền

Cần phát triển thêm token nhập liệu, vì web hiện có session cookie cho admin, chưa có giao thức Bearer desktop trong middleware đã đọc.

Đề xuất màn admin tạo/thu hồi token riêng, gắn với tài khoản và website. Token ngẫu nhiên chỉ hiện lúc tạo; server lưu hash và metadata, kiểm tra hạn dùng/thu hồi/tài khoản ở request. Hạn dùng và hạn mức là setting có thể chỉnh. Desktop lưu token bằng kho credential hệ điều hành hoặc Electron safeStorage theo phiên bản được chọn, giữ phần gọi HTTP trong main process.

Quyền tối thiểu gồm tạo phiên nhập, upload ảnh cho phiên, đọc trạng thái và tạo nháp từ dữ liệu đã duyệt. Quyền cập nhật bản ghi đã có, đăng và xoá cần tách rõ; không dùng một token toàn quyền quản trị cho mặc định desktop. Token không được phép tự nâng quyền dựa vào trường trong payload.

Cần hai profile riêng trong app:

| Profile | Chứa |
|---|---|
| AI engine | Codex/OpenCode, đường dẫn executable hoặc endpoint local, provider/profile, model, timeout, prompt |
| Website | Tên dễ nhận biết, URL, token web, bộ sưu tập đích và tùy chọn trạng thái đồng bộ |

URL và tên môi trường phải hiện rõ trước khi đồng bộ để phân biệt local/staging/production. Token không tự động được gửi sang host khác khi đổi URL hoặc gặp redirect. Key AI không thay thế token website.

### Các API mới cần có

Đây là nhóm chức năng đề xuất, chưa phải route đã tồn tại:

- Kiểm tra token và khả năng import/version schema của website.
- Tạo phiên nhập và nhận manifest gồm các ID ảnh, fingerprint và dữ liệu nháp đã duyệt.
- Upload từng ảnh, trả trạng thái và media ID/key do server cấp.
- Validate dữ liệu và hoàn tất từng outfit/collection bằng service hiện có.
- Truy vấn kết quả để khôi phục sau mất kết nối.

Bản đầu nên giới hạn tạo mới; cập nhật nội dung đã có cần đối chiếu revision và hiển thị khác biệt, tránh ghi đè sửa tay trên website.

Mỗi phiên/mục có ID ổn định và version/hash nội dung được duyệt. Server dùng chúng chống trùng bản ghi khi retry, đối chiếu nội dung nếu cùng ID nhưng payload đổi. Hash/version không phải chứng minh mật mã rằng người dùng đã duyệt; đây là dấu vết phiên bản, còn quyền ghi do token và nghiệp vụ server quyết định.

Ảnh upload xong mà tạo outfit lỗi phải được theo dõi để thử tiếp hoặc dọn sau thời hạn cấu hình. Không hứa transaction xuyên S3 và MongoDB. Hệ thống cần trạng thái trung gian và kết quả từng mục, khóa chống ghi trùng, cùng vòng đời dọn ảnh mồ côi. Không báo thành công toàn bộ khi còn mục chưa lưu.

## Thiết kế desktop

Đề xuất stack: Electron, React, TypeScript, Node.js, Sharp. Có thể đặt `apps/desktop` cùng monorepo và dùng `packages/shared` cho schema chung; đây là đề xuất vị trí, chưa tạo source mới. React UI cần được đóng gói riêng, không giả định các component Next.js dùng next/image/router chuyển sang Electron nguyên trạng được.

Electron phù hợp yêu cầu JavaScript: main process có Node API, native folder dialog và quản lý tiến trình; UI dùng renderer [S6, S7]. Đổi lại có chi phí đóng gói và dung lượng ứng dụng; chưa đo kích thước hoặc chọn version Electron.

Các màn chính:

1. Kết nối AI và website, kiểm tra từng kết nối độc lập.
2. Chọn folder, phân nhóm file, chọn quy tắc nhập.
3. Tiến độ phân tích, lỗi theo file, tiếp tục hoặc huỷ.
4. Duyệt ảnh và nội dung, sửa crop/anchor/link.
5. Đồng bộ các mục đã duyệt, xem kết quả và liên kết tới admin web.

Checkpoint và bản nháp lưu trong dữ liệu riêng của app; đề xuất SQLite local cho job/item/revision và thư mục riêng cho ảnh cắt. Không kết nối SQLite local này với DB website. Có thể xuất gói JSON + ảnh để chuyển sang máy khác hoặc lưu lại một phiên.

Với danh sách phiên nhập lớn, truy vấn/filter/paginate ở main process/local DB; renderer chỉ hiển thị trang kết quả. Bộ sưu tập trên web vẫn query/filter/render phía server theo kiến trúc hiện tại. Các thao tác kéo điểm crop trên ảnh hiện tại là tương tác local cần thiết.

Renderer không có Node integration, bật context isolation và dùng preload với IPC hạn chế theo hành động [S8]. Filesystem, process spawn và token ở main process. Chọn folder tạo quyền truy cập cụ thể; kiểm tra path thực để tránh symlink hoặc tên file trỏ ra ngoài vùng được chọn. safeStorage bảo vệ secret lưu trên đĩa theo cơ chế hệ điều hành, không được xem là lớp bảo vệ khỏi mọi ứng dụng khác chạy cùng người dùng [S9].

Các thông số provider, model, tên/bố cục mặc định, prompt, giới hạn ảnh, thời gian chờ, concurrency, retry, thời hạn local cache và trạng thái khi đồng bộ đều phải cấu hình được. Số liệu ví dụ không trở thành hằng số nghiệp vụ.

## Thứ tự triển khai đề xuất

1. **Kiểm chứng runtime trước:** gửi ảnh mẫu qua Codex cài trên máy với profile dự định dùng; kiểm tra thực sự có nội dung ảnh, tên món và JSON; lưu output không chứa secret. Nếu vẫn bị gateway chặn thì dừng ở việc làm rõ quyền truy cập, không xây UI dựa trên giả định.
2. **Desktop local:** folder → manifest → gọi agent → crop → chỉnh và duyệt → lưu checkpoint/export. Chưa cần website hoặc DB credential để chứng minh khâu này.
3. **Đồng bộ:** thêm token/endpoint phía web, upload và lưu nháp idempotent; kiểm thử mất kết nối và retry trên môi trường đúng.
4. **Hoàn thiện:** đóng gói Windows, kiểm tra version CLI, tiếp tục phiên, thêm adapter OpenCode V2, xử lý lỗi và giới hạn sử dụng.

Tiêu chí nghiệm thu thực tế: ảnh đã gửi tới model; nội dung đúng các ô chú thích; crop/anchor chỉnh được; mục chưa duyệt không được tự gửi; token web không vào context agent; retry không tạo trùng; website nhận đủ ảnh và dữ liệu; tắt desktop sau đồng bộ không ảnh hưởng trang đã lưu.

Không ước lượng độ chính xác, tốc độ, thời gian phát triển hoặc chi phí trước khi có kết quả runtime. Lượt nghiên cứu này không triển khai app, không gọi lại model và không ghi DB.

## Nguồn

Truy cập ngày 2026-11-18:

- S1: Codex App Server — https://learn.chatgpt.com/docs/app-server — stdio, localImage, outputSchema, approvals, schema theo version; truy cập qua https://developers.openai.com/codex/app-server/.
- S2: Codex SDK — https://learn.chatgpt.com/docs/codex-sdk — phân biệt SDK automation và App Server cho custom clients.
- S3: OpenCode V2 JavaScript client — https://opencode.ai/docs/build/client/ — @opencode/client và local service API.
- S4: OpenCode V2 embedded SDK — https://opencode.ai/docs/build/sdk/ — @opencode/sdk, embedded host.
- S5: OpenCode V2 attachments — https://opencode.ai/docs/attachments/ — image media, file/data URI, directory listing không đệ quy.
- S6: Electron process model — https://www.electronjs.org/docs/latest/tutorial/process-model.
- S7: Electron dialog — https://www.electronjs.org/docs/latest/api/dialog — chọn directory/files.
- S8: Electron context isolation — https://www.electronjs.org/docs/latest/tutorial/context-isolation.
- S9: Electron safeStorage — https://www.electronjs.org/docs/latest/api/safe-storage — bảo vệ secret trên máy theo hệ điều hành.
- S10: OpenCode V2 commands — https://opencode.ai/docs/cli/commands/ — run, file attachment, JSON events.
- S11: OpenCode V2 API — https://opencode.ai/docs/api — contract API có các phần experimental; không nhầm với API V1.
- Nguồn local: CLI --version/--help, các file trong bảng bằng chứng và [probe gateway](./261118-xingchi-live-api-probe.json).
- Tài liệu nền: [Nghiên cứu nhập ảnh bằng AI](./research-261118-ai-folder-to-collections.md).

## Câu hỏi còn mở

- Kết quả thực tế khi gửi hai ảnh qua Codex/App Server với profile Xingchi là gì?
- Khi đồng bộ, mặc định lưu nháp hay cho phép đăng ngay sau duyệt desktop? Đề xuất mặc định nháp, quyền đăng riêng.
- Có cần người khác duyệt từ web không? Nếu có, cần bổ sung vùng staging/upload trước duyệt.
- Windows là nền tảng phát hành đầu tiên hay cần thêm macOS/Linux?
- Có yêu cầu cập nhật outfit đã tồn tại, hay bản đầu chỉ tạo mới? Đề xuất tạo mới trước để giới hạn xung đột.
