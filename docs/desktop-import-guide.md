# Desktop nhập bộ sưu tập bằng AI

Ứng dụng `@under30ss/desktop` dành cho Windows: chọn folder poster, gọi Codex CLI, sửa và duyệt trên máy, rồi gửi qua API website. Mỗi poster đã duyệt tạo **một bộ sưu tập nháp và một outfit nháp**, có ảnh bìa và liên kết thành viên. Ứng dụng không xuất bản và không kết nối trực tiếp MongoDB/S3.

Liên quan: [Kiến trúc](./system-architecture.md#desktop-nhập-nháp-bằng-ai) · [Triển khai](./deployment-guide.md#desktop-và-api-nhập-nháp) · [Kế hoạch và nghiệm thu](../plans/261118-desktop-ai-import/plan.md).

## Chuẩn bị

- Windows x64 và Codex CLI chính thức đã cài, đã đăng nhập/cấu hình provider. CLI không được đóng kèm ứng dụng; có thể chọn đường dẫn native `codex.exe`. Không dùng file `.cmd`, `.bat` hoặc `.ps1` làm executable.
- Runtime đã kiểm chứng là `codex-cli 0.169.1`; khả năng nhận các cờ cách ly và ảnh đầu vào cần kiểm lại nếu đổi CLI/provider/model, xem bằng chứng ở cuối tài liệu.
- Website có API `desktop-import.v1` và tài khoản quản trị. Kết nối website dùng origin HTTPS, ví dụ `https://shop.example.com`; không kèm `/admin`, query, mật khẩu hay đường dẫn con. HTTP chỉ được chấp nhận với `localhost`, `127.0.0.1`, `::1` để phát triển.
- Folder ảnh. Mặc định quét đệ quy JPEG/PNG/WebP, bỏ qua liên kết tượng trưng/junction, file hỏng hoặc quá giới hạn và hiện cảnh báo. Ảnh gốc không bị sửa; ứng dụng lưu bản sao đã xoay đúng EXIF trong vùng dữ liệu local.
- Ảnh được Codex CLI gửi tới provider AI đang cấu hình. Lưu, crop và duyệt diễn ra trên máy; bước phân tích vẫn cần kết nối provider và có thể phát sinh usage theo tài khoản CLI.

## 1. Tạo token website và kết nối

1. Đăng nhập website, mở **Token nhập nháp** tại `/admin/import-tokens`.
2. Nhập tên thiết bị và hạn dùng. Ngày giờ nhập theo đồng hồ máy; API kiểm tra hạn tối đa theo cấu hình server.
3. Chọn **Tạo token**, sao chép token vừa tạo. Token rõ chỉ trả ở lần tạo; danh sách sau đó chỉ còn tên, tiền tố, hạn và trạng thái.
4. Trong desktop, mở **Kết nối**, nhập tên môi trường, origin website và token; chọn **Lưu cấu hình**. Sau khi dán xong, chọn **Ẩn token** trên website.
5. Chọn **Kiểm tra kết nối website**. Thành công xác nhận quyền `import:draft` và đọc giới hạn server; đây không phải phép thử đọc ảnh AI.

Token được mã hóa bằng `safeStorage` của hệ điều hành; không có cơ chế lưu rõ dự phòng khi mã hóa không khả dụng. Sau khi lưu, giao diện chỉ nhận trạng thái và phần che token. Không dán token vào prompt Codex. Token website khác credential AI mà Codex CLI đang sử dụng.

Nếu file credential bị hỏng, ứng dụng hiện cảnh báo và yêu cầu lưu token mới hoặc chọn **Xóa token đã lưu trên máy**; không khôi phục token từ `.bak`. Xóa token local không thu hồi quyền ở website: muốn ngừng quyền nhập của thiết bị, dùng **Thu hồi token** trên web.

Để thu hồi: mở cùng trang quản trị, chọn token của thiết bị và xác nhận **Thu hồi token**. Token hết hạn, bị thu hồi hoặc thuộc admin đã bị xóa sẽ bị API từ chối. Thu hồi không xóa các bản nháp đã tạo, không phải thao tác hoàn tác một request đã được server nhận.

## 2. Cấu hình Codex và chọn folder

- **Đường dẫn Codex:** mặc định `codex`; nếu không tìm thấy, chọn đường dẫn đầy đủ tới native executable đã cài.
- **Profile/Model:** để trống để dùng cấu hình CLI hiện có, hoặc nhập giá trị phù hợp với provider. Ứng dụng không sửa cấu hình global của Codex.
- **Prompt phân tích:** đã có prompt tiếng Việt trong phần mở rộng; có thể chỉnh và **Khôi phục prompt mặc định**. Phiên bản mặc định là `vi-poster.v1`; prompt tùy chỉnh được gắn thêm hash khi lưu. Phiên bản hiển thị chỉ đọc.
- Prompt nhận diện người mẫu và các ô sản phẩm theo bố cục thực tế, không cố định số món; chữ không rõ, crop/anchor không chắc được giữ rỗng hoặc đánh dấu cần duyệt.

Lưu cấu hình trước khi tạo phiên. Chọn **Chọn folder** → đặt tên phiên → tạo phiên. Folder và danh sách ảnh được đọc trong tiến trình main, trả về từng trang qua IPC; renderer không tự đọc filesystem.

Phiên giữ snapshot cấu hình phân tích và giới hạn lúc tạo. Thay executable, profile, model, prompt hoặc timeout trong phần cấu hình không âm thầm thay đổi phiên cũ; tạo phiên mới để dùng cấu hình phân tích mới.

### Các mặc định local có thể chỉnh

Nguồn: `packages/shared/src/desktop-settings-schema.ts`; các số dưới đây là mặc định, không phải hạn mức cố định cho mọi môi trường.

| Cấu hình | Mặc định |
|---|---|
| Số ảnh mỗi phiên / số entry được quét | 500 / 10.000 |
| Dung lượng mỗi ảnh / số pixel nguồn | 20 MiB / 80 triệu pixel |
| Số mục mỗi trang | 20 |
| Timeout phân tích / timeout request đồng bộ | 180 giây / 60 giây |
| Output Codex tối đa | 1 MiB |
| Định dạng mặc định | `.jpg`, `.jpeg`, `.png`, `.webp` |

Desktop và server có giới hạn độc lập. Kiểm tra kết nối hiển thị cả dung lượng ảnh, số operation và số media tối đa mỗi phiên. Đọc các hạn mức này trước khi nhập folder lớn; giới hạn local cao hơn không làm tăng quota website. Chia folder thành các phiên phù hợp hoặc điều chỉnh `IMPORT_*` phía server trước khi gửi hàng loạt. Các định dạng bổ sung và trần kỹ thuật được schema giới hạn để bảo vệ bộ nhớ và giữ tương thích hợp đồng web.

## 3. Phân tích và xem lỗi

Chọn **Phân tích các ảnh chưa xong** để xử lý các ảnh chưa có bản nháp; có thể hủy tác vụ. Kết quả từng ảnh được lưu riêng. Mở lại ứng dụng vẫn thấy phần đã hoàn tất; tác vụ đang chạy khi thoát được đánh dấu gián đoạn và có thể thử lại.

Codex chỉ nhận bản ảnh cần phân tích, prompt và JSON Schema trong workspace tạm. Adapter dùng argv/stdio, `shell=false`, sandbox read-only, không tự chấp thuận yêu cầu; tắt và kiểm tra lại MCP kế thừa, đồng thời tắt shell/apps/plugins/hooks theo cấu hình cách ly. Adapter dừng khi phát hiện sự kiện dùng công cụ ngoài phạm vi; sandbox read-only vẫn cần giữ. Môi trường subprocess không nhận token website, cookie admin, cấu hình MongoDB hay S3.

Lỗi thiếu executable, profile/model/provider không hợp lệ, timeout, output quá lớn hoặc JSON sai schema được hiển thị để xử lý. Thử lại riêng ảnh lỗi; không coi một file JSON xuất hiện sau timeout là bằng chứng lượt chạy thành công. Có thể nhập bản nháp thủ công khi AI chưa trả kết quả.

## 4. Sửa, lưu và duyệt

1. Chọn ảnh để mở **Duyệt**. Đối chiếu poster gốc với crop người mẫu và từng món.
2. Sửa tiêu đề/slug, tên bộ sưu tập, nội dung từng món, cột trái/phải, thứ tự và vùng crop. Có thể thêm/xóa món trong giới hạn hợp đồng web.
3. Crop dùng `x`, `y`, `width`, `height` theo phần trăm ảnh nguồn đã xoay; vùng phải nằm trong ảnh. Anchor cũng nhập trên poster nguồn; ứng dụng đổi sang hệ tọa độ crop người mẫu khi gửi.
4. Có thể để trống anchor hoặc link để tạo draft. Nếu có anchor, điểm phải nằm trong vùng người mẫu; nếu có link, link phải dùng HTTPS.
5. Chọn **Lưu bản nháp**, rồi **Duyệt phiên bản đã lưu**. Duyệt không gửi lên website. Sửa tiếp sẽ bỏ trạng thái duyệt; phải lưu và duyệt lại.

Crop chỉ cắt hình chữ nhật, không xóa được mũi tên/chữ đã đè lên quần áo. Những cảnh báo của AI vẫn cần người biên tập đối chiếu bằng mắt. Chưa có chức năng làm sạch/vẽ lại ảnh bằng AI.

## 5. Đồng bộ và tiếp tục trên web

Mở **Đồng bộ**, kiểm tra website đích và số bản nháp đã duyệt còn chờ gửi. Chỉ các phiên bản đã lưu và duyệt mới được gửi; ảnh chưa duyệt được giữ local.

Luồng gửi là: tạo/đọc phiên server → tải ảnh crop → commit nội dung → lưu ID và kết quả. Server tự kiểm ảnh, tạo storage key và ép `status=draft`, `featured=false`, `showArrows=false`. Desktop không được gửi storage key tùy ý hay sửa các route quản trị khác bằng token nhập.

Trước khi thêm upload/commit, desktop đối chiếu các ID đã có và các mục đã duyệt với quota server. Vượt quota sẽ dừng sớm; phiên server rỗng có thể đã được tạo. Server vẫn là nơi quyết định hạn mức cuối, và các lỗi từng ảnh/yêu cầu vẫn có thể dẫn đến kết quả một phần.

Sau khi đồng bộ thành công, dùng **Mở outfit nháp** hoặc **Mở bộ sưu tập nháp**. Tiếp tục biên tập, bổ sung anchor cần thiết và xuất bản trong luồng web hiện có. Bản đã gửi thành công được khóa sửa ở desktop.

### Mất mạng, kết quả chưa rõ và đổi token

- App giữ operation ID, hash dữ liệu và receipt trước/lúc commit. Khi mất phản hồi, thử đồng bộ lại để đối soát bằng cùng mã; mục đã tạo trả lại ID cũ.
- Khi server có thể vẫn đang xử lý, đã tạo một phần hoặc trả `retryOnly`, app khóa nội dung để tránh sửa thành một request mới và tạo trùng. Không tạo phiên khác chỉ để né trạng thái chưa rõ; kiểm tra kết quả trên web trước.
- Lỗi dứt khoát chưa ghi entity, chẳng hạn slug đã tồn tại được phát hiện sớm, có thể cho phép sửa và duyệt phiên bản mới. Lỗi từng mục không làm cả phiên được báo thành công.
- Từ lần bắt đầu gửi, phiên gắn với origin website **và danh tính token** bằng fingerprint lưu riêng trong main. Đổi token cùng website cũng không được dùng để tiếp tục phiên cũ. Dùng lại token ban đầu; nếu token đã thu hồi/hết hạn, đối chiếu với quản trị viên trên web trước khi quyết định nhập phiên mới.

## Lưu dữ liệu và phục hồi

Cấu hình, credential mã hóa, ảnh nguồn/crop và manifest nằm trong `app.getPath('userData')` của tài khoản chạy ứng dụng; không nằm trong folder ảnh gốc. Manifest/cấu hình được ghi qua file tạm, có bản `.bak` để phục hồi lần ghi hợp lệ trước. Chỉ một instance được phép ghi cùng vùng dữ liệu.

Credential là ngoại lệ: chỉ đọc bản chính, ghi không tạo backup và loại bản `.bak` cũ khi lưu/xóa để tránh phục hồi token đã gỡ.

Đóng ứng dụng trước khi sao lưu toàn bộ vùng dữ liệu local. Sao chép mỗi file `.exe` sang máy khác không chuyển phiên làm việc; credential mã hóa còn phụ thuộc tài khoản/hệ điều hành. Không sửa manifest, ID hoặc receipt bằng tay. Nếu quét folder bị gián đoạn, phiên giữ các ảnh đã sao chép và hiện cảnh báo; phần chưa được sao chép không được coi là đã nhập.

Server hiện giữ lịch sử receipt để retry, chưa tự xóa theo TTL. Ảnh upload dở có thể đã nằm trong vùng ảnh công khai dù chưa có outfit; không có transaction nguyên tử giữa S3 và MongoDB hoặc tiến trình tự dọn orphan trong MVP. Khi vận hành cần theo dõi dung lượng và đối chiếu tham chiếu trước khi dọn thủ công.

## Phát triển, build và kiểm chứng

Chạy từ gốc repo sau khi cài dependency:

```bash
pnpm desktop:dev
pnpm desktop:build
pnpm --filter @under30ss/desktop smoke
pnpm desktop:package
pnpm --filter @under30ss/desktop check-package
```

`desktop:dev` mở ứng dụng riêng; `pnpm dev` và `pnpm build` ở gốc chỉ chọn shared/API/web. Đích package là Windows x64 portable tại `apps/desktop/dist/package/under30ss-importer-0.1.0-x64.exe` với phiên bản hiện tại. Cấu hình hiện chưa ký số và dùng icon Electron mặc định.

Bằng chứng ngày 2026-11-18:

| Bộ kiểm thử | Kết quả đã đọc từ báo cáo |
|---|---|
| [Shared](../plans/reports/261118-desktop-shared-tests.json) | 224/224, không lỗi/bỏ qua |
| [Desktop main + UI](../plans/reports/261118-desktop-all-tests-final.json) | 93/93 trong 31 suite, không lỗi/bỏ qua |
| [API](../plans/reports/tester-261118-desktop-import-api-disk-d-final.json) | 267/267 trong 102 suite, không lỗi/bỏ qua |
| [Web](../plans/reports/tester-261118-desktop-import-web-final.json) | 754/754 trong 287 suite, không lỗi/bỏ qua |

Bài HTTP bên dưới chạy bổ sung, không nằm trong số 267 của lượt API toàn bộ. Lượt API cuối chạy một worker với scratch trên ổ D; lịch sử lỗi worker và thiếu dung lượng ở các lượt trước được ghi trong journal.

- [Codex thật](../plans/reports/261118-codex-desktop-live-probe.md): cả hai mẫu có lượt exit 0 và JSON đúng schema; một lượt timeout ban đầu được giữ lại. Đây là thử nghiệm mẫu nhỏ, không phải số đo độ chính xác tổng quát.
- [Electron Windows smoke](../plans/reports/desktop-ai-smoke/result.json): preload/IPC, mã hóa hệ điều hành, crop/protocol ảnh thật, thay đổi làm mất duyệt, mở lại checkpoint, single-instance và cửa sổ hẹp. Hộp chọn folder được stub; analysis dùng kết quả Codex đã lưu, không phải lượt gọi AI hoặc sync website mới trong smoke này.
- [HTTP desktop → API cô lập](../plans/reports/tester-261118-desktop-import-http.json): `fetch` tới Express đang listen, MongoDB memory và storage recorder; mất một phản hồi commit vẫn đối soát, mở lại và retry cùng ID. Đây không phải phép thử trên DB/S3 hay website production.
- [Smoke HTTP theo ảnh poster](../plans/reports/poster-import-http-smoke.md): một test đạt; hai ảnh cho 9 và 8 item, đều `needs_review`; sau khi duyệt tạo hai collection/outfit draft. Replay cùng operation ID không tạo bản ghi trùng. Dùng kết quả phân tích đã lưu, không gọi Codex mới.
- [Trang token trong browser](../plans/reports/desktop-token-smoke/result.json): Next.js/Express và Chromium thật với admin/MongoDB test; tạo, ẩn token khỏi DOM, thu hồi và kiểm quyền trước/sau, gồm viewport desktop và hẹp. Không sử dụng tài khoản production.
- [Portable và native dependency](../plans/reports/desktop-ai-smoke/package.json): artifact Windows thực có kích thước/hash trong evidence, kiểm tra Sharp native bên trong package. Không phải xác minh bản phát hành đã ký số hoặc installer.
- [Image Docker API/web](../plans/reports/261118-desktop-server-images.json): cả hai image build đạt; kiểm tra một lần bằng Node xác nhận không có Electron dependency và không lưu build-only env vào image. Không khởi động service API, database hay object storage.

Kết quả test/build/review cuối và các giới hạn môi trường được tổng hợp trong [kế hoạch nghiệm thu](../plans/261118-desktop-ai-import/plan.md).
