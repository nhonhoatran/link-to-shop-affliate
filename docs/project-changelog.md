# Lịch sử thay đổi

Ghi lại các thay đổi đáng kể theo phiên bản. Mỗi mục ghi ngày, phạm vi và tác động. Số phiên bản trong `package.json` vẫn là `0.1.0`. Nhãn "v1" là tên của bản phát hành này trong tài liệu.

Liên quan: [Roadmap](./development-roadmap.md) · [Kiến trúc](./system-architecture.md) · [Triển khai](./deployment-guide.md)

## v1 (2026-11-07)

Bản đầu tiên của Under30ss Shop the look: lookbook dựng từ dữ liệu, admin quản lý outfit và ảnh, triển khai bằng Docker Compose với Caddy. Hoàn thành qua 7 phase (P1 đến P7), kế hoạch tại `plans/261106-1201-under30ss-shop-the-look/`.

### Tính năng

| Phase | Nội dung | Ngày hoàn thành |
|-------|----------|-----------------|
| P1 | Nền tảng monorepo (pnpm workspace), `packages/shared` (schema Zod, DTO, hằng API), Dockerfile api và web, Compose dev, Caddy, RustFS | 2026-11-06 |
| P2 | Backend Express 5: API public và admin, session, rate limit đăng nhập, upload ảnh (sharp → WebP), revalidate, seed | 2026-11-06 |
| P3 | Ảnh mẫu và seed: script xử lý ảnh trong `scripts/assets/`, `seed/sample-outfits.json`, `--image-root` | 2026-11-06 |
| P4 | Lookbook UI: người mẫu ở giữa, món hai bên, connector bằng SVG, hotspot, hover hai chiều | 2026-11-06 |
| P5 | Trang public và SEO: `/`, `/look/[slug]`, sitemap, robots, metadata, JSON-LD, revalidate theo sự kiện | 2026-11-06 |
| P6 | Admin UI `/admin`: đăng nhập, danh sách outfit phân trang phía server, editor (upload, đặt điểm neo, xem trước, lưu), settings, quản lý admin | 2026-11-06 |
| P7 | Tích hợp: compose prod, sao lưu, Playwright e2e, ảnh so sánh, Lighthouse, tài liệu | 2026-11-06 đến 2026-11-07 |

### Bảo mật

- Ba limiter đăng nhập (theo IP, theo IP + email, theo email từ mọi IP) và cookie thiết bị `u30.dev` ký HMAC. Chi tiết trong [Kiến trúc, mục xác thực](./system-architecture.md#xác-thực-và-giới-hạn-đăng-nhập).
- Hàng đợi argon2 có giới hạn đồng thời và độ dài hàng đợi. Quá tải trả 503.
- Kiểm `Origin` cho method ghi, chỉ nhận JSON (trừ multipart upload), `helmet`.
- Caddy chặn method ghi tới `/media`, trả 413 dạng JSON khi body quá giới hạn, không chuyển `/api/health` ra ngoài.
- Production: Mongo bật auth, không publish cổng Mongo và RustFS, cookie `secure`, HTTPS qua Caddy.
- Mật khẩu admin không nhận qua tham số dòng lệnh.

### Sửa lỗi và điều chỉnh sau review (P7, 2026-11-06)

Nguồn: báo cáo `code-reviewer-261106-1741-p7-rereview.md` và `fullstack-developer-261106-1743-p7-rereview-fixes.md`.

| Mã | Thay đổi |
|----|----------|
| M1 | Thêm cookie thiết bị `u30.dev`. Thiết bị đã đăng nhập thành công bỏ qua limiter theo email. Cảnh báo log khi limiter này chạm trần. Giảm nguy cơ một kẻ tấn công từ vài IP khoá admin |
| M2 | Build index partial unique của `featured` khi khởi động. Lỗi thì API không khởi động. Truy vấn featured có sắp xếp theo `updatedAt` |
| L1 | `/media` bỏ query string (rewrite `{path}` kèm `?`). Thêm `X-Content-Type-Options: nosniff` |
| L2 | Email rỗng hoặc sai kiểu không còn dùng chung một bucket toàn cục ở limiter theo email |
| L3 | Phản hồi 429 và 5xx không tính là lần đăng nhập sai |
| L4 | Cùng một thông điệp "vượt dung lượng" ở Caddy và API (`FILE_TOO_LARGE_MESSAGE`) |
| L5 | Warm-up hash giả khi khởi động, để lần đầu đăng nhập email lạ không chậm hơn |
| L6 | Guard đường dẫn ảnh seed dùng `realpath`. Tên file bắt đầu bằng `..` không còn bị chặn nhầm |
| L7 | Phản hồi 405 ở `/media` có header `Allow: GET, HEAD` |
| L9 | Thêm test chuẩn hoá email (hoa, thường, khoảng trắng dùng chung bucket) |
| Caddy | Ghim image `caddy:2.11.9` (trước là `caddy:2`) |
| Test | Tách ba file test vượt 200 dòng. Không mất test nào |
| Lint | Xoá import và biến thừa trong test. `pnpm lint` 0 cảnh báo |

Đã sửa thêm trong P7:
- `infra/docker-compose.prod.yml`, `infra/.env.prod.example`: override production, Mongo auth, không publish cổng Mongo và RustFS, Caddy trên 80 và 443.
- `infra/backup/backup-mongo-and-bucket.sh`: sao lưu Mongo và bucket, có khôi phục bằng lệnh trong header script.
- `e2e/`, `playwright.config.ts`: Playwright cho luồng admin, public, viewport, chế độ không JS, ảnh so sánh.

### Lookbook khớp ảnh mẫu (P7, 2026-11-06)

Nguồn: `fullstack-developer-261106-1800-lookbook-match-reference.md`.

- Connector chuyển từ quadratic sang cubic Bézier. Đường rời thẻ theo phương ngang, cong xuống hoặc lên theo vị trí điểm neo. Đầu mũi tên nằm đúng điểm neo.
- Hotspot trong suốt khi nghỉ. Khi món được chọn hiện vòng tròn nhỏ. Thêm halo sáng quanh SVG.
- Subtitle chữ nghiêng (italic).
- Tỉ lệ cột 31/44/25 (trước 29/42/29). Cỡ tiêu đề `clamp(11px, 1.9vw, 18px)`. `--lookbook-curve-ratio` 0.45 (trước 0.35). Các giá trị này nằm trong `apps/web/src/styles/design-tokens.css`.
- Dưới 640 px: ẩn thread, hiện pin cố định trên hotspot. Mô tả ẩn (có chủ đích).

### Kiểm chứng ở thời điểm phát hành

| Hạng mục | Kết quả |
|----------|---------|
| Unit test shared | 32 pass |
| Unit test api | 83 pass |
| Unit test web | 166 pass |
| E2E Playwright | 17/17 pass (chạy 2026-11-07) |
| Lighthouse SEO và accessibility | 100 (đo 2026-11-06), desktop và mobile, `/` và `/look/dramatic` |
| Caddy | `/api/health` từ ngoài trả 404. 413 trả JSON `PAYLOAD_TOO_LARGE`. `/media` chỉ GET và HEAD |

### Lưu ý khi nâng cấp lên v1

- Sau khi lên bản có cookie thiết bị, mỗi admin đăng nhập lại một lần để nhận cookie `u30.dev`.
- Biến mới `LOGIN_DEVICE_COOKIE_MAX_AGE_DAYS` (mặc định 90). Đã có trong `.env.example`, `apps/api/.env.example`, service `api` của compose.
- Compose prod yêu cầu biến `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `SITE_ADDRESS` (xem [Triển khai](./deployment-guide.md#2-tạo-envprod)).
- Volume Mongo đã có từ stack dev (không auth) không tự chuyển sang auth. Xem xử lý trong [Triển khai, xử lý sự cố](./deployment-guide.md#xử-lý-sự-cố).
- Dữ liệu seed mẫu ở trạng thái `draft` (link affiliate để trống). Cần điền link và anchor rồi publish.

### Đã biết (chưa xử lý trong v1)

Chi tiết và điều kiện mở nằm trong [Roadmap, mục việc hoãn](./development-roadmap.md#việc-hoãn-sang-sau-v1).

- Object S3 không được xoá khi xoá outfit hoặc thay ảnh (L8).
- Thông báo lỗi theo trường từ server còn một phần bằng tiếng Anh (L9, một phần).
- Hai admin đặt nổi bật đồng thời: editor bên thua hiển thị trạng thái cũ tới khi tải lại.
- Chưa test HTTPS thật và domain thật (chưa có VPS).
- Ảnh người mẫu hiện là ảnh cắt tạm. Ảnh sạch và link affiliate thật do bên nội dung (Kim) cung cấp.
