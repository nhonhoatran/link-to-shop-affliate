# Roadmap Under30ss

Trạng thái tính đến 2026-11-07. Chi tiết từng phase nằm trong `plans/261106-1201-under30ss-shop-the-look/`.

Liên quan: [Lịch sử thay đổi](./project-changelog.md) · [Kiến trúc](./system-architecture.md) · [Triển khai](./deployment-guide.md)

## Contents
- [Trạng thái phase](#trạng-thái-phase)
- [Cột mốc](#cột-mốc)
- [Việc chưa kiểm chứng](#việc-chưa-kiểm-chứng)
- [Việc hoãn sang sau v1](#việc-hoãn-sang-sau-v1)
- [Bước tiếp theo](#bước-tiếp-theo)
- [Ngoài phạm vi v1](#ngoài-phạm-vi-v1)

## Trạng thái phase

| Phase | Nội dung | Trạng thái | Kết quả kiểm chứng |
|-------|----------|------------|--------------------|
| P1 | Nền tảng và hợp đồng (monorepo, shared, compose dev, Caddy, RustFS) | Hoàn thành | Compose dev chạy đủ 5 service |
| P2 | Backend API | Hoàn thành | 83 unit test api pass |
| P3 | Ảnh mẫu và seed | Hoàn thành | `pnpm seed:samples` chạy thật. Ảnh người mẫu là ảnh cắt tạm |
| P4 | Lookbook UI | Hoàn thành | Khớp ảnh mẫu ở các điểm chính. Còn khác biệt, xem [việc hoãn](#việc-hoãn-sang-sau-v1) |
| P5 | Trang public và SEO | Hoàn thành | Lighthouse SEO 100 (`/` và `/look/dramatic`, desktop và mobile) |
| P6 | Admin UI | Hoàn thành | E2E luồng admin tạo, upload, đặt điểm, publish, thấy trên public |
| P7 | Tích hợp, test, deploy | Hoàn thành phần local. Deploy thật chưa làm | E2E 17/17. Compose prod đã kiểm bằng stack thử nghiệm. Sao lưu đã chạy thử |

Số liệu kiểm thử (2026-11-07): shared 32, api 83, web 166 unit test; E2E 17/17.

## Cột mốc

| Ngày | Cột mốc |
|------|---------|
| 2026-11-06 | P1 đến P6 hoàn thành. P7: compose prod, sao lưu, Playwright, Lighthouse, review và sửa vòng hai |
| 2026-11-06 | Lookbook khớp ảnh mẫu hơn (connector cong, mũi tên, hotspot, pin trên mobile) |
| 2026-11-07 | Xác nhận lại test và E2E. Viết tài liệu `docs/` (v1) |

## Việc chưa kiểm chứng

Các mục sau chưa được chạy trong môi trường thật. Không coi là đã xong.

| Mục | Lý do | Cần để kiểm chứng |
|-----|-------|-------------------|
| HTTPS thật với Let's Encrypt qua Caddy | Chưa có VPS và domain | VPS, DNS trỏ về, mở 80 và 443 |
| Đăng nhập admin qua HTTPS (cookie `secure`) | Cần HTTPS | Như trên |
| Cron sao lưu thật trên VPS | Chưa có VPS | VPS và cron. Xem [sao lưu](./deployment-guide.md#sao-lưu) |
| Xoá bản sao lưu cũ theo `BACKUP_RETENTION_DAYS` | Chưa có bản cũ để xoá | Chạy đủ số ngày hoặc giả lập thư mục cũ |
| Khôi phục bucket khi stack production đang chạy | Mới thử trên stack thử nghiệm | Lần diễn tập khôi phục định kỳ |

## Việc hoãn sang sau v1

| Mã | Mô tả | Tác động | Điều kiện mở |
|----|-------|----------|--------------|
| L8 | Object S3 mồ côi: xoá outfit hoặc thay ảnh không xoá object cũ trong bucket | Tốn dung lượng bucket theo thời gian. Không ảnh hưởng hiển thị | Chọn cách: xoá ngay khi thay hoặc xoá, hoặc job dọn định kỳ (cần đối chiếu với bản sao lưu) |
| L9 (một phần) | Thông báo lỗi theo trường từ server còn tiếng Anh, ví dụ `Email already exists` | Người dùng admin thấy lỗi một phần bằng tiếng Anh | Viết lại thông báo tiếng Việt cho các mã trả về trong `fields` |
| Đồng thời đặt nổi bật | Hai admin cùng đặt nổi bật: editor bên thua hiển thị trạng thái cũ tới khi tải lại. Dữ liệu vẫn đúng (một outfit nổi bật) | Hiển thị sai trên màn hình admin tạm thời | Làm mới trạng thái sau khi nhận 409 hoặc sau mỗi thao tác |
| Ảnh người mẫu và link thật | Ảnh hiện là ảnh cắt tạm (`scripts/assets/clean-model-lines.py`). Link affiliate còn trống, nên seed để outfit ở `draft` | Trang chưa dùng được cho khách thật. Visual chưa đạt 100% so với ảnh mẫu | Bên nội dung (Kim) gửi ảnh sạch và link. Thay ảnh, điền link, publish |
| Mobile dưới 640 px | Hiện pin thay thread. Mô tả ẩn | Khác ảnh mẫu trên mobile (có chủ đích, chờ quyết định thiết kế) | Quyết định thiết kế cho mobile |
| `next/image` không tối ưu | `unoptimized: true`, ảnh người mẫu 1600 px tải nguyên bản trên mobile | Tốn băng thông trên mobile | Resize theo viewport, hoặc bật optimizer. Cần đường tới media host từ container web (xem comment trong `apps/web/next.config.ts`) |
| Độ khớp lookbook với ảnh mẫu | Người mẫu trông nhỏ hơn do ảnh cắt tạm còn lề trắng. Cột phải xuống dòng nhiều hơn. Thread mảnh hơn ảnh mẫu. Vị trí hotspot đã khớp ảnh (có e2e `public-hotspot-alignment`) | Khác biệt nhỏ về thị giác | Thay ảnh sạch, chỉnh token cột và độ dày thread |
| Đổi mật khẩu admin | Không có API hay giao diện đổi mật khẩu (quyết định D3, ngoài v1) | Phải xoay vòng tài khoản (xem [triển khai, mục 5](./deployment-guide.md#5-đổi-mật-khẩu-admin)) | Quyết định có làm không. Nếu làm: endpoint đổi mật khẩu và UI |
| Quyền Mongo của API | API dùng tài khoản root của Mongo trong production | Rủi ro bảo mật nếu API bị khai thác | Tạo user có quyền tối thiểu cho database, đổi `MONGODB_URI` |
| Số phiên bản | `package.json` vẫn ghi `0.1.0`, dù tài liệu gọi bản này là v1 | Không ảnh hưởng chạy. Dễ gây nhầm lẫn khi đối chiếu | Quyết định có đổi `version` không |

## Bước tiếp theo

Theo thứ tự ưu tiên đề xuất:

1. **Triển khai thật trên VPS.** Cài Docker, trỏ DNS, chạy `docker compose ... up -d --build`, tạo admin, chạy kiểm tra trong [mục kiểm tra sau triển khai](./deployment-guide.md#kiểm-tra-sau-triển-khai). Đây là bước mở khoá toàn bộ mục "chưa kiểm chứng" ở trên.
2. **Lên lịch sao lưu và diễn tập khôi phục.** Cron chạy `bash infra/backup/backup-mongo-and-bucket.sh`. Khôi phục thử trên stack riêng ít nhất một lần.
3. **Nhận nội dung thật.** Ảnh người mẫu sạch và link affiliate từ bên nội dung (Kim). Điền link, publish các outfit, đặt một outfit nổi bật.
4. **Chốt quyết định sản phẩm** cần cho các mục hoãn: đổi mật khẩu trong UI (có làm không), thiết kế mobile dưới 640 px, cách dọn object S3 (L8).
5. **Bảo mật Mongo.** Tạo user quyền tối thiểu cho API.
6. **Hoàn thiện thông báo lỗi tiếng Việt** (L9) và làm mới trạng thái editor khi đặt nổi bật đồng thời.
7. **Tối ưu ảnh trên mobile** (`next/image`).

Đã chạy `ui-consistency:verifying`: admin và public trong các vòng sửa P6, lookbook chạy lại ngày 2026-11-07 sau khi chỉnh theo ảnh mẫu (chỉ còn lệch checklist ở các điểm cố ý: bỏ pulse, subtitle nghiêng, pin trên mobile).

## Ngoài phạm vi v1

Đã nêu trong kế hoạch P7 là "để sau": giá, tìm kiếm, trang danh sách outfit, thống kê lượt bấm (ví dụ endpoint chuyển hướng `/go/:itemId`). Chưa có thiết kế hay plan chi tiết cho các mục này.
