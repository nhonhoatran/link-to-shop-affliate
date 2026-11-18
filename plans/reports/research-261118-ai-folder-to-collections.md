# Nghiên cứu AI đọc folder ảnh để tạo bộ sưu tập

Ngày khảo sát: 2026-11-18, Asia/Saigon. Phạm vi: hai ảnh mẫu được cung cấp, mã nguồn hiện tại và tài liệu công khai truy cập trong phiên nghiên cứu.

## Cập nhật kiểm tra API thật — 2026-11-18

Kết quả dưới đây thay thế các nhận định “chưa gọi có xác thực” ở phần khảo sát ban đầu. Thử nghiệm được thực hiện sau khi có yêu cầu gọi thử trực tiếp, từ 2026-11-18T04:37:08.900Z đến 2026-11-18T04:41:09.573Z (UTC; giờ Việt Nam cộng 7 giờ).

| Phép thử | Kết quả | Thời gian | Kết luận được phép rút ra |
|---|---|---|---|
| GET /v1/models với Bearer key | HTTP 200; 23 model; có gpt-6.1-sol | 993 ms | Gateway chấp nhận key cho model catalog và liệt kê model yêu cầu |
| POST /v1/responses với poster áo số 84 và JSON Schema strict | HTTP 403; client_not_allowed | 3.635 ms | Request trực tiếp bị chính sách loại client từ chối; không có output của model |

Thông báo gateway, nguyên văn:

> 本站仅支持编程客户端使用：Codex、Claude Code、OpenCode、ZCode、DeepSeek Harness、Hermes Agent、Minis、WorkBuddy、Cursor、pi/omp、Qoder、Kilo、Cline、Roo、Trae、GitHub Copilot、Grok CLI。脚本、SDK 直连和第三方聊天客户端暂不支持

Nghĩa: dịch vụ chỉ hỗ trợ các client lập trình được liệt kê; hiện chưa hỗ trợ script, SDK kết nối trực tiếp và client chat bên thứ ba.

Request ảnh dùng model gpt-6.1-sol, ảnh PNG 941 × 1672 dưới dạng data URL base64, detail high, store false, stream false, reasoning effort low, max_output_tokens 4096 và text.format JSON Schema strict. Không bật công cụ, không gửi đáp án mẫu hoặc số lượng món kỳ vọng, không thử image generation. POST dùng Authorization Bearer và header HTTP thông thường; không giả mạo client hoặc thêm header để vượt hạn chế.

Thực thi bằng Node.js fetch, không tự theo redirect, không retry. Đã đọc hướng dẫn Postman api-testing, variables và chạy postman request --help; request xác thực dùng bộ nhớ tiến trình để tránh ghi key vào file hoặc tham số lệnh CLI. Đây không phải Postman collection run: không có assertion count hoặc exit code của collection để báo cáo. Kiểm chứng bằng status, nội dung lỗi và dữ liệu catalog trả về.

**Hệ quả đối với phương án deploy:** thiết kế backend/worker vẫn phù hợp về kiến trúc, nhưng không thể coi gateway Xingchi hiện tại là endpoint đã sẵn sàng cho cách tích hợp này. Cần nhà cung cấp cho phép server/SDK qua endpoint hoặc gói phù hợp, hoặc đổi sang provider có hỗ trợ API backend cho image input và Structured Outputs. Chưa kiểm chứng một luồng chạy qua Codex CLI; không lấy việc catalog hoạt động làm bằng chứng luồng đó đã chạy được.

**Giới hạn phép thử:** không có nội dung nhận diện, response ID hoặc usage; chưa xác nhận token/chi phí, khả năng đọc ảnh, độ đúng JSON Schema, crop hoặc anchor. Tham số store false đã được gửi nhưng request bị chặn, không chứng minh chính sách lưu dữ liệu của nhà cung cấp. Ảnh đã được gửi trong request đến gateway; không có bằng chứng mô hình phía sau đã xử lý ảnh.

Bằng chứng đã loại bỏ thông tin xác thực: [261118-xingchi-live-api-probe.json](./261118-xingchi-live-api-probe.json). API key không được lưu trong hai tài liệu; biến chứa key đã được xóa khỏi phiên kiểm tra sau khi kết thúc.

## Kết luận

Có thể xây dựng chức năng chọn folder ảnh, dùng mô hình đọc ảnh để trích xuất nội dung, rồi tạo bộ sưu tập và các outfit ở trạng thái nháp. Với dữ liệu mẫu, đề xuất mặc định là một folder tương ứng một bộ sưu tập, mỗi poster tương ứng một outfit; quy tắc này cần là tùy chọn nhập liệu, không cố định cho mọi nguồn.

Hướng phù hợp với Under30ss là thêm bộ nhập bằng AI vào admin, gọi Responses API từ backend, trả dữ liệu theo JSON Schema, dùng xử lý ảnh để cắt vùng được đề xuất và tái sử dụng trình sửa outfit hiện tại. Cấu hình Codex chỉ chọn cách Codex hoạt động; ứng dụng Node.js không tự đọc cấu hình đó để có tính năng nhập ảnh.

Khả năng đọc ảnh và Structured Outputs của `gpt-6.1-sol` được xác nhận trong tài liệu OpenAI. Chưa xác nhận khả năng tương đương khi gọi qua `api.xingchiapi.com`: chỉ kiểm tra các URL công khai, không sử dụng API key đã xuất hiện trong hội thoại và không gửi ảnh lên gateway. Chưa có số đo độ chính xác, thời gian hoặc chi phí thực tế.

## Mục lục

1. [Dữ liệu đầu vào và cách hiểu yêu cầu](#dữ-liệu-đầu-vào-và-cách-hiểu-yêu-cầu)
2. [Bằng chứng trong project](#bằng-chứng-trong-project)
3. [Các phương án](#các-phương-án)
4. [Luồng đề xuất](#luồng-đề-xuất)
5. [Đánh giá cấu hình được cung cấp](#đánh-giá-cấu-hình-được-cung-cấp)
6. [Cấu hình động](#cấu-hình-động)
7. [Giới hạn và kiểm chứng tiếp theo](#giới-hạn-và-kiểm-chứng-tiếp-theo)
8. [Phương án sử dụng sau khi deploy](#phương-án-sử-dụng-sau-khi-deploy)
9. [Nguồn](#nguồn)
10. [Câu hỏi còn mở](#câu-hỏi-còn-mở)

## Dữ liệu đầu vào và cách hiểu yêu cầu

Đọc trực tiếp header PNG xác nhận cả hai ảnh có kích thước 941 × 1672 pixel. Số món dưới đây là kiểm đếm các ô chú thích trên ảnh trong hội thoại, không phải kết quả gọi model qua gateway.

| Mẫu | Các ô chú thích nhìn thấy | Kết quả nhập dự kiến |
|---|---|---|
| Poster áo mesh số 84 | Áo mesh, áo thun trắng, quần short jean rộng, sneaker đen, kính mát, dây chuyền, thắt lưng, móc khóa, tất trắng: 9 ô | Một outfit với 9 bản nháp món đồ |
| Poster áo DRAMATIC | Áo thun, quần short jean rách, sneaker trắng xám, túi đeo chéo, dây chuyền, móc khóa, thắt lưng nâu, bandana đỏ: 8 ô | Một outfit với 8 bản nháp món đồ |

Không suy số lượng món từ tất cả vật thể người mẫu đang đeo: đồng hồ hoặc tất có thể nhìn thấy nhưng không có ô chú thích tương ứng. Chính sách nhập cần chọn rõ “chỉ các món được chú thích” hoặc “đề xuất thêm món nhìn thấy”.

Ba trường hợp đầu vào khác nhau:

- **Folder chứa poster hoàn chỉnh như mẫu:** đọc chữ, phân vùng ảnh người/món, đề xuất các món trong từng poster. Có nguy cơ chữ và mũi tên đã dính vào ảnh.
- **Folder chứa ảnh người mẫu và ảnh sản phẩm riêng:** phân loại vai trò file, ghép các file theo outfit và dựng giao diện. Đây là đầu vào thuận lợi nhất để giữ đúng hình sản phẩm.
- **Folder chỉ có ảnh sản phẩm, muốn tạo người mẫu mặc đồ:** cần thêm bước tạo/chỉnh sửa ảnh hoặc thử đồ ảo. Đây là bài toán khác; chức năng nhận diện ảnh không tự tạo được ảnh mặc đồ đáng tin cậy.

Ví dụ quy ước có thể chọn khi nhập:

```text
streetwear/
  outfit-01.png
  outfit-02.png
```

Hoặc:

```text
streetwear/
  look-a/
    model.jpg
    shirt.png
    shorts.png
    shoes.png
  look-b/
    model.jpg
    bag.png
```

Tên folder có thể làm tên gợi ý; người quản trị được sửa và chọn cách gom nhóm. Các tên file, nhóm và số lượng ở đây chỉ là ví dụ. Với folder ảnh rời không có cấu trúc, AI có thể đề xuất nhóm nhưng cần bước xác nhận ghép món.

## Bằng chứng trong project

| Thành phần | Bằng chứng đã đọc | Ý nghĩa |
|---|---|---|
| Bộ sưu tập | `apps/api/src/models/collection-model.ts:4`; `packages/shared/src/collection-schemas.ts:13` | Có tên, slug, mô tả, ảnh bìa, trạng thái draft/published |
| Outfit và món đồ | `packages/shared/src/outfit-schemas.ts:46` và `:61` | Có tên, subtitle, description, ảnh, side, order, anchor, affiliateUrl, collectionIds |
| Điểm nối | `packages/shared/src/outfit-schemas.ts:9` và `:81` | Tọa độ 0–100 theo phần trăm; món đã publish phải có anchor |
| Link mua hàng | `packages/shared/src/outfit-schemas.ts:41` | Cho phép chuỗi rỗng; có thể để trống nếu chưa có dữ liệu xác thực |
| Upload hiện tại | `apps/api/src/routes/admin-media-routes.ts:11`; `apps/web/src/components/admin/media-dropzone.tsx:42` | API nhận một ảnh mỗi request; UI có thể upload nhiều ảnh lần lượt, chưa có bộ nhập folder bằng AI trong các đường mã đã khảo sát |
| Xử lý ảnh | `apps/api/src/services/image-processing-service.ts:25` | Sharp kiểm tra ảnh, xoay, resize, chuyển WebP; chưa có crop theo kết quả AI ở hàm này |
| Thông số ảnh | `apps/api/src/config/env-config.ts:27` | Giới hạn upload, quality và kích thước có cấu hình; không nên giảm độ phân giải poster trước khi đọc chữ/cắt |
| Sửa điểm nối | `apps/web/src/components/admin/anchor-placement-canvas.tsx:28` | Đã có bấm/kéo điểm và hỗ trợ bàn phím |
| Xem trước | `apps/web/src/components/admin/outfit-editor.tsx:103` và `:118` | Có thể tận dụng màn đặt điểm và live preview |
| Dựng lookbook | `apps/web/src/components/lookbook/lookbook-layout.tsx:16` | Dựng người mẫu giữa, món hai bên, bật/tắt đường nối |
| Gắn outfit vào bộ sưu tập | `apps/api/src/services/collection-membership-service.ts:41` | Đã có service thêm outfit vào collection |
| Nhập dữ liệu từ file | `packages/shared/src/seed-file-schema.ts:15`; `apps/api/src/services/seed-service.ts:38` và `:78` | Có tiền lệ đọc ảnh local và dữ liệu có cấu trúc; seeder ghi theo slug, chưa phải importer dành cho người quản trị |

Tìm kiếm `openai`, `xingchi`, `input_image`, `responses.create`, `ai-import`, `webkitdirectory` trong `apps/api/src`, `apps/web/src`, `packages/shared/src` không có kết quả. Kết luận giới hạn ở các thư mục mã nguồn này.

Không nên đưa nguyên poster vào `modelImage` rồi thêm lại các card hai bên: hình sẽ chứa cả chữ/card cũ lẫn giao diện mới. Nếu muốn giữ nguyên poster, cần một chế độ hiển thị poster có vùng bấm riêng và chỉnh schema/render tương ứng.

## Các phương án

| Phương án | Phù hợp | Đánh đổi | Đề xuất |
|---|---|---|---|
| Codex đọc folder local, xuất JSON và các ảnh cắt | Thử nhanh quy tắc trích xuất, nhập theo đợt bởi người vận hành | Phụ thuộc quyền đọc file, công cụ xem ảnh và cấu hình máy; vẫn cần importer kiểm tra dữ liệu | Hợp cho thử nghiệm |
| Backend nhận folder, gọi API đọc ảnh và tạo nháp | Tính năng lâu dài trong admin, nhiều phiên nhập | Phải bổ sung job, kiểm tra kết quả, retry và màn duyệt | Ưu tiên cho project |
| Mô hình tạo ảnh dựng poster mới từ tham chiếu | Muốn ảnh truyền thông hoặc tạo người mẫu mới | Có thể thay đổi chi tiết hàng hóa, chữ, bố cục; vẫn phải tạo dữ liệu website riêng | Tính năng riêng, không phải bước bắt buộc của import |

Tài liệu Codex có chế độ thực thi không tương tác [S8]. Tuy nhiên, chỉ liệt kê tên file không đủ để model nhìn được ảnh: tiến trình phải thực sự đưa nội dung ảnh vào context qua công cụ phù hợp. API đọc ảnh nhận URL, data URL base64 hoặc file ID [S2], không nhận đường dẫn `D:\...` để tự mở ổ đĩa trên máy khách.

## Luồng đề xuất

```text
Chọn folder hoặc nhiều ảnh
  → Tạo phiên nhập và lưu file nguồn
  → Xác định loại ảnh, nhóm outfit
  → Gửi từng poster/nhóm ảnh cùng metadata cần thiết cho model
  → Nhận JSON: tên món, chữ đọc được, vùng ảnh, điểm nối đề xuất
  → Kiểm tra schema và đối chiếu file/vùng ảnh
  → Cắt vùng ảnh bằng Sharp
  → Hiện bản xem trước và các mục cần kiểm tra
  → Tạo collection/outfit nháp qua service hiện có
  → Quản trị viên chỉnh nội dung, ảnh, link và đăng
```

### Chọn folder và tiếp nhận file

Trình duyệt có thể dùng `webkitdirectory` và giữ quan hệ folder qua `File.webkitRelativePath` [S6]. Chỉ đọc những file trong phần người dùng đã chọn. Cần phương án chọn nhiều ảnh cho trình duyệt/thiết bị không đáp ứng luồng chọn folder.

Bản đầu có thể upload file lần lượt vào một phiên nhập, không cần bắt buộc ZIP. Backend gắn file vào phiên và lưu đường dẫn tương đối dưới dạng metadata, không dùng đường dẫn khách gửi để đọc tùy ý trên server. File nguồn nên được giữ trong vùng tạm riêng cho phiên nhập, có thời hạn cấu hình; ảnh dùng công khai chỉ được tạo khi chuyển sang outfit. Upload hiện tại tạo key công khai nên cần thiết kế đường lưu tạm nếu có yêu cầu này.

### Gọi model và nhận kết quả

Dùng Responses API qua adapter nhà cung cấp. Gửi ảnh cùng chỉ dẫn tiếng Việt và ID file do backend cấp. Dùng `text.format` với JSON Schema khi gateway thực sự hỗ trợ [S3]. Khi gateway chỉ trả văn bản JSON, vẫn phải parse/validate, đánh dấu khả năng hạn chế và retry có giới hạn.

Dữ liệu phân tích nên tách khỏi dữ liệu outfit cuối:

| Nhóm trường | Nội dung |
|---|---|
| Nguồn | assetId, kích thước ảnh đã chuẩn hóa xoay, loại poster/ảnh người/ảnh sản phẩm |
| Phân nhóm | outfitGroupId đề xuất; không tự ý chuyển món giữa các nhóm đã được người dùng chốt |
| Văn bản | text đọc từ ảnh, tên/mô tả gợi ý, nguồn của từng trường |
| Ảnh | modelRegion, productRegion; vùng chữ tách khỏi vùng sản phẩm |
| Bố cục | side, order, anchor đề xuất hoặc null |
| Kiểm tra | needsReview, reviewReasons; điểm tự tin nếu có chỉ là tín hiệu ưu tiên duyệt |

`assetId`, mã bản ghi, storage key và liên kết được đối chiếu/tạo bởi backend. Không cho model tự tạo khóa storage hoặc URL sản phẩm rồi tin ngay. Các trường vùng ảnh và anchor chưa chắc chắn được phép là null trong kết quả phân tích; chỉ chuyển sang schema outfit khi đủ dữ liệu.

Structured Outputs bảo đảm dạng dữ liệu trong các trường hợp được hỗ trợ, không bảo đảm món đồ, OCR và tọa độ đều đúng [S3]. Prompt phải cho phép trả “không xác định được”, không ép điền đủ mọi trường bằng suy đoán.

### Crop và điểm nối

Sharp hỗ trợ `extract` theo hình chữ nhật [S7]. Quy trình đề xuất:

- Chuẩn hóa hướng ảnh trước, cố định hệ tọa độ dùng cho phân tích và crop.
- Phân tích bố cục toàn ảnh, rồi đọc lại vùng chữ nhỏ nếu cần. Tên file phải đưa kèm dưới dạng văn bản nếu muốn model dùng để gom nhóm [S2].
- Kiểm tra bounding box không âm, không vượt kích thước ảnh, có diện tích và thực sự chứa món cần lấy.
- Crop từ ảnh nguồn trước khi resize/compress để tránh mất chi tiết nhỏ.
- Tọa độ anchor phải được đổi từ hệ tọa độ poster sang hệ tọa độ ảnh người mẫu sau crop. Không chép trực tiếp tọa độ poster vào outfit.

Nếu vùng người mẫu bắt đầu tại `(left, top)`, rộng `width`, cao `height`, và điểm trên poster là `(x, y)` thì:

```text
anchor.x = 100 × (x - left) / width
anchor.y = 100 × (y - top) / height
```

100 là định nghĩa phần trăm theo schema hiện tại, không phải ngưỡng nghiệp vụ. Điểm nằm ngoài vùng phải bị từ chối hoặc đưa về cần duyệt; không ép vào mép ảnh để che lỗi. Nếu còn thêm padding hoặc biến đổi ảnh, phải áp dụng cùng phép biến đổi lên tọa độ.

**Giới hạn của hai poster mẫu:** mũi tên có đoạn đè lên người mẫu; crop hình chữ nhật không xóa được các nét này. Mặt dây chuyền và móc khóa khá nhỏ; cần kiểm tra kết quả cắt. Ảnh chỉ có 941 pixel chiều ngang nên không thể hứa cắt ra ảnh sản phẩm độ phân giải cao.

Các cách xử lý, theo thứ tự ưu tiên đề xuất:

1. Dùng ảnh người mẫu/sản phẩm gốc rời nếu có.
2. Crop poster và cho sửa/thay ảnh ở màn duyệt; chấp nhận vùng còn nét chỉ dẫn khi chưa có nguồn tốt hơn.
3. Nếu cần giữ nguyên mỹ thuật poster, bổ sung chế độ poster với vùng bấm. Chế độ này phải phát triển thêm vì layout hiện tại kỳ vọng ảnh người và ảnh món riêng.

Xóa mũi tên bằng mô hình chỉnh sửa ảnh là lựa chọn bổ sung, phải đánh dấu ảnh đã chỉnh. Vùng bị nét che không còn pixel gốc để khôi phục chính xác; mô hình có thể dựng lại nhưng không thể cam kết chi tiết sản phẩm đúng như ban đầu. Tài liệu ảnh cũng nêu giới hạn tính nhất quán và bố cục [S4].

### Duyệt và lưu

Chỉ tạo nháp ở bước tự động. Hiện ảnh gốc cạnh bản tái dựng, cho chỉnh tên, crop, ảnh, vị trí, thứ tự và anchor. Có thể tái sử dụng editor hiện tại; cần thêm giao diện duyệt crop và quản lý phiên nhập.

Ví dụ cụ thể: ảnh đầu giới thiệu kính mát nhưng không thấy kính được đeo rõ trên mặt người mẫu. Không tự bịa vị trí “đang đeo” trên mắt. Cần cho người quản trị chọn điểm trình bày phù hợp hoặc để anchor chưa xác định trong bản nháp.

Không suy SKU, thương hiệu chính xác, giá, thành phần vải hoặc link affiliate từ sự giống nhau về hình ảnh. Chữ “cotton” trong poster là thông tin nguồn được đọc lại, chưa phải thông số đã được nhà bán xác nhận. Link lấy từ dữ liệu cung cấp hoặc danh mục đã có và cần đối chiếu. `affiliateUrl: ""` tương thích schema hiện tại.

### Chạy theo lô và phục hồi lỗi

Đề xuất job lưu bền trong MongoDB và worker xử lý phía server; chưa có bằng chứng project cần thêm một hệ thống hàng đợi mới ngay. Nếu triển khai worker riêng, phải có cơ chế nhận job nguyên tử, lease/heartbeat và tiếp tục sau khi process chết.

- Lưu kết quả theo file, cho retry file lỗi; không quét lại tất cả khi một ảnh hỏng.
- Dùng fingerprint file cùng phiên bản model, prompt và cấu hình để phân biệt kết quả cũ. Chống tạo trùng bản ghi bằng ID phiên nhập và mục nhập ổn định.
- Phân biệt ảnh trùng nội dung với yêu cầu đưa cùng outfit vào nhiều collection.
- Không ghi đè outfit đã được người quản trị chỉnh khi retry.
- Lưu trạng thái, request ID và usage nếu gateway cung cấp; không ghi API key hoặc toàn bộ base64 vào log.
- Danh sách phiên nhập/kết quả lọc và phân trang phía server. Browser chỉ chọn file, upload, xem trạng thái và duyệt kết quả.

Đây là đề xuất kiến trúc, chưa phải thành phần đã được cài đặt hoặc đo tải.

## Đánh giá cấu hình được cung cấp

| Mục | Kết luận |
|---|---|
| `model = "gpt-6.1-sol"` | Model chính chủ hỗ trợ ảnh đầu vào, Structured Outputs và công cụ tạo ảnh qua Responses [S1]. Cần thử lại từng khả năng trên gateway |
| `base_url`, `wire_api = "responses"` | Định tuyến và giao thức cho client. Backend phải tự cấu hình adapter tương ứng |
| `review_model` | Theo tài liệu Codex, đây là model dùng bởi `/review`; không tự tạo lượt kiểm tra OCR/crop [S5] |
| `web_search = "live"` | Công cụ tìm web; không cần cho việc đọc file ảnh đã cung cấp. Tìm nguồn bán là công đoạn riêng |
| `supports_websockets` | Khai báo khả năng truyền Responses bằng WebSocket; không phải yêu cầu để đọc ảnh qua HTTP [S5] |
| `features.goals` | Tiếp tục mục tiêu trong Codex; không thay cơ chế job/retry của ứng dụng [S5] |
| `model_catalog_url` | Tài liệu mô tả catalog riêng cho Codex. Không mặc định rằng JSON `/v1/models` chuẩn là đúng schema catalog đó [S5] |
| `requires_openai_auth` | Là lựa chọn cơ chế xác thực client. Với gateway dùng key riêng, ưu tiên provider riêng và biến môi trường sau khi kiểm chứng cơ chế auth |
| `experimental_bearer_token` | Tài liệu khuyên dùng `env_key` thay token ghi trực tiếp [S5] |
| `x-openai-actor-authorization` | Chưa có bằng chứng công khai đã đọc xác nhận gateway cần header này; không đề xuất dựa vào header tùy chỉnh để bảo đảm khả năng tạo ảnh |
| `disable_response_storage`, `features.api_key_model_discovery`, `features.image_generation`, `features.responses_websockets_v2`, `windows_wsl_setup_acknowledged` | Không tìm thấy đúng khóa trong bản config reference đã đọc. Có thể phụ thuộc phiên bản/fork; chưa xác minh trên client cài tại máy. Không kết luận chúng chắc chắn có hiệu lực hoặc chắc chắn sai |
| `network_access = "enabled"` | Không cấp quyền tự đọc ổ đĩa cho API. Tài liệu đọc được mô tả mạng theo cấu hình sandbox/profile; cần đối chiếu phiên bản client để biết cú pháp đúng |

Hai khối TOML nên được xem là hai phương án, không nối nguyên cả hai vào cùng file. Đối tượng JSON chứa key cũng không trộn trực tiếp vào TOML.

Ví dụ cấu hình tối thiểu để khảo sát bằng Codex, **chưa chạy xác nhận trên gateway**:

```toml
model_provider = "xingchi"
model = "gpt-6.1-sol"

[model_providers.xingchi]
name = "Xingchi"
base_url = "https://api.xingchiapi.com/v1"
wire_api = "responses"
env_key = "XINGCHI_API_KEY"
requires_openai_auth = false
```

Model và endpoint ở đây là giá trị do yêu cầu cung cấp, có thể đổi trong config. Key mới được cấp qua môi trường của tiến trình, không ghi vào báo cáo. Cấu hình này chỉ thiết lập kết nối; vẫn cần prompt, công cụ đọc ảnh và quy trình nhập dữ liệu.

Nếu triển khai trong web app thì không cần chạy Codex để thực hiện từng phiên nhập. Backend sử dụng cấu hình provider và gọi API trực tiếp. `store: false` có thể gửi ở cấp request khi được endpoint hỗ trợ; không được suy ra đây là cam kết không lưu dữ liệu ở gateway hoặc tương đương Zero Data Retention. Chính sách OpenAI phân biệt lưu response, log và các loại application state [S9]; gateway có chính sách riêng chưa xác minh.

## Cấu hình động

Ưu tiên một khu vực AI riêng trong admin cho cấu hình không bí mật, và secret reference hoặc biến môi trường server cho key. Không đưa key vào `publicSettings` hoặc gửi lại đầy đủ cho frontend.

Các mục cần chỉnh được:

- Provider, base URL, model phân tích, model kiểm tra tùy chọn, định dạng/giao thức mà adapter hỗ trợ.
- Quy tắc gom folder/file thành collection/outfit; chế độ poster hay ảnh rời; chính sách nhận món từ chú thích hoặc quan sát.
- Ngôn ngữ, phong cách mô tả, tên bộ sưu tập, template prompt và phiên bản template.
- Kích thước ảnh phân tích, mức chi tiết có hỗ trợ, giới hạn file/dung lượng, số job chạy đồng thời, timeout và retry.
- Hạn mức sử dụng theo phiên, bảng giá tham khảo có ngày hiệu lực, thời hạn lưu file nguồn.
- Chế độ duyệt, điều kiện gắn cờ cần kiểm tra, cho phép dùng chỉnh sửa/tạo ảnh hay chỉ crop.

Các giá trị trong ví dụ là mặc định khởi đầu có thể thay đổi. Không hardcode chín món, tám món, nhóm thời trang hoặc nhà cung cấp vào logic. Hai lượt model cùng loại không được xem là hai nguồn chứng cứ độc lập; chỉ bật kiểm tra lượt hai khi thử nghiệm cho thấy có ích.

## Giới hạn và kiểm chứng tiếp theo

### Đã kiểm chứng

- Hai tệp mẫu là PNG 941 × 1672; kích thước file lần lượt 2.118.623 và 1.967.119 byte.
- Các schema, route, editor và xử lý ảnh trong bảng bằng chứng đã đọc trực tiếp.
- GET `https://api.xingchiapi.com/` trả 200 và tiêu đề `星驰API公益站 - AI API Gateway`. HTML ban đầu là vỏ ứng dụng JavaScript; chưa đọc được tài liệu provider công khai từ đó.
- GET `https://api.xingchiapi.com/v1/models` không kèm key trả 401:

```json
{"code":"API_KEY_REQUIRED","message":"API key is required in Authorization header (Bearer scheme), x-api-key header, or x-goog-api-key header"}
```

- Tài liệu chính chủ xác nhận ảnh đầu vào/Structured Outputs của model, cách gửi ảnh, giới hạn vision và khả năng crop của Sharp.

### Chưa kiểm chứng

- Không gọi model có xác thực, không gửi hai ảnh lên Xingchi, không chạy tạo ảnh. Vì vậy chưa có kết luận gateway nhận `input_image`, thực thi JSON Schema, cho `store: false`, hỗ trợ image tool, hay ánh xạ model đúng ra sao.
- Không có benchmark chính xác OCR, vùng crop, anchor, số món hoặc tỷ lệ cần chỉnh tay.
- Không đo tốc độ, token hoặc giá thực trả. Không lấy bảng giá OpenAI làm báo giá Xingchi.
- Không chạy UI gateway: thử mở browser bị chặn bởi profile đang sử dụng; việc kiểm tra endpoint thực hiện bằng HTTP đọc công khai.
- Không thay đổi code ứng dụng hoặc ghi DB. Chỉ tạo báo cáo nghiên cứu; không chạy test/build ứng dụng vì không có thay đổi mã chạy.

### Thử nghiệm nhỏ đề xuất

1. Thay key đã lộ bằng key mới và cấu hình ở phía server.
2. Gọi `/v1/models` có xác thực để kiểm tra tên model. Sự hiện diện trong danh sách không thay cho kiểm thử năng lực.
3. Gửi từng ảnh mẫu tới `/v1/responses` với `input_image`, yêu cầu đọc các ô chú thích. Kiểm tra response thực và usage.
4. Thử JSON Schema: tên món, nguồn văn bản, vùng ảnh, anchor nullable, lý do cần kiểm tra. Kiểm tra JSON, trạng thái incomplete và lỗi/refusal.
5. Cắt vùng đề xuất trên bản ảnh gốc; so sánh trực quan cạnh poster. Kiểm tra nhầm vùng ảnh/chữ và đường nối cũ.
6. Đo số mục phải sửa tay, thời gian toàn phiên, số lần gọi và chi phí thực. Chọn tiêu chí chấp nhận theo kết quả thử, không ấn định độ chính xác giả định.
7. Chỉ sau đó triển khai màn nhập hàng loạt và tạo draft qua các service đã có.

## Phương án sử dụng sau khi deploy

Bổ sung theo câu hỏi ngày 2026-11-18. Đây là thiết kế đề xuất, chưa triển khai hoặc kiểm thử trên VPS thật.

### Lựa chọn kiến trúc

Dựa trên cấu hình Docker Compose hiện có, triển khai chức năng trên VPS/container chạy thường trực: giao diện quản trị gửi yêu cầu tới Express API; một service `ai-worker` chạy nền gọi nhà cung cấp AI. Có thể build chung image với API và dùng entrypoint khác. Không cần cài Codex Desktop/CLI lên server cho luồng API trực tiếp, và máy người dùng không tham gia xử lý sau khi hoàn tất upload.

```text
Trình duyệt quản trị
  → API: nhận ảnh, tạo phiên nhập, trả mã tác vụ
  → RustFS: giữ ảnh nguồn trong vùng riêng tư
  → MongoDB: giữ cấu hình và tiến độ từng ảnh
  → ai-worker: đọc ảnh, gọi Responses API, kiểm tra JSON, crop
  → MongoDB/RustFS: lưu kết quả và dữ liệu nháp
  → Admin: xem trước, chỉnh sửa, đăng
```

`ai-worker` nhận tác vụ từ MongoDB bằng thao tác nguyên tử, có lease/heartbeat; tác vụ có thể tiếp tục sau khi tiến trình khởi động lại. Mỗi mục có khóa chống tạo trùng. Không hứa chỉ tính phí AI đúng một lần: nếu nhà cung cấp đã xử lý nhưng kết nối mất trước khi lưu kết quả, retry vẫn có thể phát sinh phí; cần ghi trạng thái và áp hạn mức retry.

Không cần thêm Redis chỉ để bắt đầu chức năng này. Khi tải thực tế cho thấy cần hàng đợi chuyên dụng, có thể thay cách nhận job mà giữ nguyên hợp đồng phiên nhập. Không dùng bộ nhớ tiến trình làm nơi duy nhất giữ trạng thái.

### Cấu hình AI trong admin

Đề xuất một trang cài đặt riêng, chỉ người quản trị có quyền phù hợp truy cập:

| Trường | Giá trị ban đầu hoặc cách chọn |
|---|---|
| Nhà cung cấp | Xingchi, hoặc nhà cung cấp khác được hỗ trợ |
| Loại giao thức | OpenAI-compatible Responses |
| Base URL | `https://api.xingchiapi.com/v1`, theo yêu cầu hiện tại; được thay đổi có kiểm soát |
| Model phân tích | `gpt-6.1-sol`, phải qua kiểm thử ảnh thực tế |
| API key | Nhập key mới qua HTTPS; sau khi lưu chỉ hiện trạng thái đã cấu hình và phần che |
| Prompt và quy tắc nhập | Có thể sửa và lưu phiên bản |
| Model kiểm tra | Tùy chọn; không mặc định tạo thêm lượt gọi |
| Vận hành | Hạn mức ảnh/dung lượng, số job đồng thời, timeout, retry, ngân sách và thời hạn lưu nguồn |

Nút kiểm tra kết nối có các kết quả tách biệt: xác thực, tên model, đọc được ảnh kiểm thử, và trả được JSON theo schema. `/v1/models` thành công không đủ để đánh dấu “đọc ảnh hoạt động”. Kiểm tra ảnh thực sự có thể phát sinh usage và cần hiển thị điều đó khi sử dụng tính năng.

Key lưu mã hóa trong phần cấu hình riêng phía server. Khoá mã hóa chính được cấp qua secret của hosting hoặc biến môi trường runtime, tách khỏi DB, source code và khóa session. Khoá này phải ổn định qua các lần deploy và được sao lưu riêng để đọc lại key đã lưu. Backend không trả plaintext key trong API đọc cấu hình, không đưa vào bundle web, và không ghi vào log. Chỉ tiến trình cần gọi AI hoặc lưu/đổi key được cấp quyền giải mã. URL provider được xác thực, giới hạn quyền sửa để không trở thành cách gọi địa chỉ nội bộ tùy ý.

Một lựa chọn đơn giản hơn là để provider key trực tiếp trong secret của hosting; đổi key khi đó cần thao tác phía deploy. Phương án ưu tiên cho yêu cầu cấu hình động là admin sửa cấu hình và key mã hóa, còn hosting chỉ giữ khóa mã hóa chính. Mỗi job lưu snapshot cấu hình không bí mật và tham chiếu phiên bản credential để một lần sửa settings không làm thay đổi ngầm tác vụ đang chạy. Chỉ thêm hệ thống quản lý nhiều credential nếu nhu cầu thực tế yêu cầu.

### Luồng sử dụng

1. Mở trang cấu hình AI, nhập kết nối và kiểm tra khả năng đọc ảnh.
2. Vào bộ sưu tập, chọn “Nhập bằng AI”, chọn folder hoặc nhiều ảnh.
3. Chờ toàn bộ file cần dùng upload thành công; server xác nhận nhận tác vụ trước khi cho biết có thể đóng tab.
4. Worker phân tích theo từng ảnh/nhóm. Admin xem trạng thái, mục cần kiểm tra và lỗi; retry riêng mục lỗi.
5. Sau khi phân tích, người quản trị xem ảnh nguồn cạnh kết quả, chỉnh crop/tên/anchor/link và tạo hoặc sửa nháp.
6. Đăng qua luồng hiện có sau khi đáp ứng các điều kiện publish.

Nếu đóng tab khi file chưa upload xong, chỉ những file đã hoàn tất mới tồn tại trên server; không hứa tác vụ tự đọc tiếp file còn trên máy người dùng. UI cần phân biệt rõ trạng thái đang tải file và đang phân tích. Cập nhật tiến độ có thể dùng polling đơn giản; WebSocket không phải điều kiện để triển khai bản đầu.

Nguồn ảnh riêng tư được worker lấy bằng SDK nội bộ, rồi gửi bytes/base64 hoặc cơ chế upload provider đã kiểm chứng. Không gửi URL như `http://rustfs:9000/...` cho provider bên ngoài vì địa chỉ mạng Docker không truy cập được từ đó. Việc nhà cung cấp nhận ảnh để xử lý phải thể hiện rõ trong tính năng. Ảnh công khai của outfit được tạo qua pipeline hiện có sau khi duyệt.

### Thành phần cần bổ sung trong lần triển khai

- Trang cấu hình AI và kiểm tra năng lực nhà cung cấp, tách dữ liệu bí mật khỏi settings public.
- Phiên nhập, bản ghi từng file, kết quả phân tích và tiến độ lưu bền trong MongoDB.
- Upload nguồn riêng tư, đọc/xóa object theo vòng đời và kiểm tra quyền sở hữu phiên nhập.
- Worker có entrypoint, health/liveness, nhận job nguyên tử, resume và retry có giới hạn.
- Adapter Responses API, validation kết quả, crop và chuyển dữ liệu sang các service collection/outfit.
- Màn duyệt kết quả, chọn/thay ảnh, sửa điểm nối; tiếp tục dùng editor hiện tại.
- Compose truyền secret/cấu hình cần thiết cho từng service; cấu hình body limit cho đường upload mới; hướng dẫn deploy và phục hồi tác vụ.

Nếu chỉ deploy frontend lên môi trường phục vụ trang tĩnh hoặc request ngắn, worker vẫn phải chạy ở dịch vụ nền riêng. Phương án hiện tại bám theo VPS/Docker trong repo; không mặc định có thể giữ một tác vụ dài trong request của mọi nền tảng hosting.

### Bằng chứng deploy và các giới hạn hiện trạng

- `infra/docker-compose.yml:59` khai báo service API, `:120` khai báo web; Mongo và RustFS đã có trong cùng stack.
- `infra/docker-compose.prod.yml:14` truyền cấu hình API production; chưa có service worker hoặc biến cấu hình AI trong các compose đã đọc.
- `apps/api/Dockerfile:33` chạy `node dist/server.js`; worker cần entrypoint mới, không phải thành phần đã sẵn có.
- `apps/api/src/storage/s3-client.ts:11` hiện chỉ có `putObject`; cần bổ sung khả năng đọc và quản lý nguồn ảnh riêng tư cho worker.
- `infra/rustfs-init/init-bucket.sh:2` và `:25` mô tả policy đọc công khai cho `public/*`; việc dùng prefix riêng tư cần kiểm tra lại policy và quyền truy cập thực tế khi triển khai.
- `apps/api/src/models/settings-model.ts:4` chưa có cấu hình AI hoặc credential; đây là phần phát triển thêm.
- `apps/api/src/create-app.ts:42` có `requireAdmin` cho nhóm admin; endpoint nhập và settings mới phải đi qua lớp xác thực này.
- `infra/caddy/Caddyfile:20` áp giới hạn riêng cho `/api/admin/media*`; endpoint upload khác phải nhận giới hạn tương ứng.
- `docs/deployment-guide.md:199` ghi phần HTTPS/cron trên VPS chưa được kiểm chứng trong tài liệu; chưa kết luận tình trạng một server đang chạy từ cấu hình repo.

Bản đầu tập trung đọc ảnh đã có để dựng dữ liệu nháp. Tính năng tạo ảnh người mẫu mới hoặc làm sạch ảnh bằng AI là tùy chọn riêng, cần kiểm tra image tool/model, chi phí và độ trung thực sản phẩm trước khi bật.

## Nguồn

Đã truy cập ngày 2026-11-18. Nguồn tài liệu sống có thể thay đổi sau ngày này; các khả năng model chính chủ không tự động áp dụng cho gateway.

- **S1 — Model GPT-6.1 Sol:** https://developers.openai.com/api/docs/models/gpt-6.1-sol — đối chiếu thêm bản `.md`; ảnh đầu vào, Structured Outputs, image generation tool.
- **S2 — Images and vision:** https://developers.openai.com/api/docs/guides/images-vision — URL/base64/file ID, nhiều ảnh, lỗi chữ nhỏ/tọa độ, tên file không được tự đọc từ metadata.
- **S3 — Structured outputs:** https://developers.openai.com/api/docs/guides/structured-outputs — JSON Schema và giới hạn về tính đúng của nội dung, refusal/incomplete.
- **S4 — Image generation:** https://developers.openai.com/api/docs/guides/image-generation — tạo/chỉnh sửa ảnh theo tham chiếu, giới hạn chữ/bố cục/nhất quán.
- **S5 — Codex configuration reference:** https://learn.chatgpt.com/docs/config-file/config-reference — chuyển hướng từ https://developers.openai.com/codex/config-reference/; provider, auth, review_model, model catalog, WebSocket, goals.
- **S6 — Chọn folder trong trình duyệt:** https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory — giữ đường dẫn tương đối qua `webkitRelativePath`.
- **S7 — Sharp extract:** https://sharp.pixelplumbing.com/api-resize/#extract — crop hình chữ nhật, thứ tự crop/resize.
- **S8 — Codex non-interactive mode:** https://learn.chatgpt.com/docs/non-interactive-mode — truy cập qua https://developers.openai.com/codex/noninteractive/.
- **S9 — OpenAI data controls:** https://developers.openai.com/api/docs/guides/your-data — phân biệt application state, response storage và log.
- **S10 — Gateway công khai:** https://api.xingchiapi.com/ và https://api.xingchiapi.com/v1/models — GET không xác thực, trạng thái ghi ở trên.
- **Nguồn nội bộ:** các file và dòng trong bảng bằng chứng; hai ảnh mẫu do yêu cầu cung cấp.

## Câu hỏi còn mở

- Folder thực tế chủ yếu chứa poster hoàn chỉnh hay có cả ảnh người mẫu/sản phẩm rời?
- Ưu tiên tái dựng thành giao diện chỉnh được hay giữ nguyên poster với vùng bấm?
- Link affiliate sẽ nhập từ file kèm, chọn trong danh mục, hay bổ sung thủ công?
- Gateway với key mới có hỗ trợ đầy đủ image input và Structured Outputs trên model đã chọn?
- Quy mô phiên nhập và mức sai lệch chấp nhận được sau lượt duyệt là bao nhiêu?
