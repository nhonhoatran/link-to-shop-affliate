---
date: 2026-11-18
scope: desktop-import-api-web
status: passed
---

# Kiểm thử nhập desktop: API, web và HTTP liên tiến trình

## Tóm tắt

Toàn bộ API và web hiện có đã chạy thành công. Bài kiểm thử bổ sung cho desktop dùng HTTP thật tới Express đang lắng nghe, MongoDB tạm và storage recorder. Trang quản trị token đã được kiểm tra bằng Chromium headless với bản Next đã build, API cô lập và tài khoản giả lập dành riêng cho phép thử.

Không dùng cấu hình `.env`, DB thật, tài khoản thật hoặc object storage thật. Kết quả phân tích AI không nằm trong các phép thử này: dữ liệu desktop được nhập thủ công có chủ đích.

## Kết quả

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Toàn bộ API | 41 file, 266 test; 0 lỗi, 0 bỏ qua; 73,17 giây | `tester-261118-desktop-import-api.json` |
| Toàn bộ web | 112 file, 754 test; 0 lỗi, 0 bỏ qua; 101,22 giây | `tester-261118-desktop-import-web.json` |
| Desktop → API bằng HTTP thật | 1 kịch bản bổ sung; 0 lỗi; lần kiểm cuối 6,48 giây | `tester-261118-desktop-import-http.json` |
| TypeScript API và web | Thành công | Chạy `tsc --noEmit` trên từng `tsconfig.json` |
| ESLint API và các file token web | Thành công | Kiểm tra source API, test mới và các component/page/nav token |
| Whitespace | `git diff --check` thành công | Chỉ có cảnh báo chuyển CRLF thành LF |
| Token page bằng browser thật | Thành công; không có console error hoặc page error | `desktop-token-smoke/result.json` |

Bài HTTP bổ sung được chạy riêng sau bộ API đầy đủ, nên không cộng vào số 266 của báo cáo toàn bộ API.

## Các ranh giới đã kiểm tra

- Token quản trị được tạo bằng cookie admin; bearer chỉ có quyền nhập nháp. Token hết hạn, thu hồi hoặc thuộc admin đã xoá bị từ chối. Session thuộc riêng token tạo nó.
- API xác minh hash, dung lượng, MIME và bytes ảnh. Storage key được cấp trên server; input không được gửi arbitrary image reference hoặc yêu cầu publish/featured.
- Upload và commit đồng thời giữ một receipt. Đổi payload dưới cùng operation ID bị từ chối. Retry không tạo lại entity đã có.
- Intent cấp ID trước side effect; `writeStarted` không được xoá; `retryOnly` chặn đổi phiên bản khi một worker cũ có thể còn ghi. GET đối soát entity thực theo ID và import reference, không chỉ tin stage flag.
- Kiểm tra trước cả hai slug giúp lỗi trùng slug thông thường không tạo bộ sưu tập dở dang.
- Desktop bỏ qua bản nháp chưa lưu/chưa duyệt; sửa sau duyệt làm mất approval. Phép thử cố tình làm mất một phản hồi commit đã thành công rồi đối soát, mở lại store và retry cùng operation.
- Kết quả HTTP cuối có hai bộ sưu tập và hai outfit draft, membership/cover đúng, tổng năm ảnh crop được xử lý; IDs được lưu lại trong checkpoint. Manifest và settings view không có raw website token.

## Kiểm tra browser trang token

Harness: `apps/api/test/smoke/token-browser-smoke.ts`. Next chạy trên cổng loopback riêng, đi qua proxy cục bộ tới API/MongoDB tạm; toàn bộ env cần thiết được truyền rõ bằng giá trị test.

1. Đăng nhập cookie admin và tải trang token do Next render.
2. Tạo token, kiểm tra importer capabilities trả 200.
3. Ẩn token và xác nhận raw secret không còn trong DOM; danh sách chỉ giữ metadata.
4. Kiểm tra màn hình 390 × 844 không tràn ngang.
5. Xác nhận thu hồi qua dialog; HTTP DELETE trả 204; token lập tức bị từ chối với 401.
6. Tự mở và xem ảnh chụp desktop/narrow: nội dung tiếng Việt, form và trạng thái đọc được; không thấy clipping hoặc overlap.

Ảnh chụp:

- `desktop-token-smoke/empty-desktop.png`
- `desktop-token-smoke/active-desktop.png`
- `desktop-token-smoke/active-narrow.png`
- `desktop-token-smoke/revoked-narrow.png`

Các ảnh được chụp khi raw token đã ẩn. Hai lỗi đầu của harness là selector không phân biệt ô chứa nút và tên truy cập có thêm nhãn CSS ở màn hình hẹp; đã sửa locator theo markup/CSS thực, không sửa hay giảm assertion của ứng dụng.

## Cảnh báo và giới hạn

- Vitest hiện cảnh báo cấu hình Vite CommonJS. Bộ web còn có cảnh báo React `act()` và jsdom navigation tại các test cũ; các test vẫn thành công, không che log hoặc sửa assertion để bỏ cảnh báo.
- `next start` cảnh báo cấu hình `output: standalone`; runtime vẫn khởi động và phục vụ được phép thử. Deploy tiếp tục dùng đường chạy standalone hiện có trong Dockerfile.
- Chưa đo phần trăm coverage; không suy tỷ lệ coverage từ số lượng test thành công.
- Browser token smoke không kiểm chứng VPS/HTTPS thật. Phép thử HTTP dùng storage recorder, không kiểm chứng S3 thật hoặc chất lượng nhận dạng AI.
- Receipt được giữ để chống trùng; chưa có job tự dọn receipt/object bỏ dở. Quota reservation giữ bảo thủ nếu tiến trình dừng đúng giữa lúc giữ slot và ghi receipt; có thể cần tăng giới hạn cấu hình khi phục hồi trường hợp đó.

## Lệnh tái lập đã chạy

Từ `apps/api`:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=4 --reporter=default --reporter=json --outputFile=../../plans/reports/tester-261118-desktop-import-api.json
node node_modules/vitest/vitest.mjs run test/desktop-import-http.test.ts --reporter=default --reporter=json --outputFile=../../plans/reports/tester-261118-desktop-import-http.json
```

Từ `apps/web`:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=4 --reporter=default --reporter=json --outputFile=../../plans/reports/tester-261118-desktop-import-web.json
```

Từ gốc repo, sau khi có bản build web:

```powershell
node --conditions=source --import tsx apps/api/test/smoke/token-browser-smoke.ts
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit
```
