# Brainstorm: Under30ss "Shop the look" v1

Ngày: 2026-11-06 · Nguồn yêu cầu: @Kim (2026-11-05) · Trạng thái: đã duyệt thiết kế

## 1. Vấn đề & yêu cầu

- Trang lookbook dựng bằng HTML/CSS từ dữ liệu, giống ảnh mẫu (2 ảnh: outfit "Dramatic" + outfit "Mesh 84").
- Người mẫu giữa, món đồ 2 bên: ảnh nhỏ, tên, 1–2 dòng mô tả, đường chỉ nối tới điểm trên người mẫu.
- Bấm ảnh/tên/điểm → mở link affiliate (sàn bất kỳ) ở tab mới.
- Điện thoại giữ bố cục, co theo màn hình.
- Ảnh mẫu phải cắt rời từng món để làm hiệu ứng hover.
- Để sau: giá, tìm kiếm, trang danh sách outfit, thống kê lượt bấm.

## 2. Phát hiện khi khảo sát

- Project trống (chỉ có thư mục tooling), chưa có git.
- Ảnh mẫu 941x1672 RGB, nền gần trắng tuyệt đối (253–255) → crop đặt trên nền trắng liền mạch.
- **Đường chỉ trắng in chết lên người mẫu** (chạy ngang áo, quần, chân ở cả 2 ảnh) → không dùng được làm ảnh người mẫu khi vẽ lại đường chỉ bằng code.
- Ảnh món cắt ra ~250–330px → đủ ở cỡ hiển thị ~150px, hơi mềm trên retina.
- Máy có Node 24, Python + Pillow + onnxruntime; chưa có rembg.
- MinIO CE: ngưng phát Docker image 10/2025, bảo trì 12/2025, repo archive ~02/2026 (nguồn blog bên thứ ba, chưa thấy thông báo chính chủ):
  - https://glukhov.org/data-infrastructure/object-storage/minio-dead/
  - https://blog.vonng.com/en/db/minio-resurrect/index.md
- RustFS 1.0 GA 2026-09-16, Apache-2.0, tương thích S3:
  - https://linuxiac.com/rustfs-1-0-s3-compatible-object-storage-reaches-ga/
  - https://gh.hhj520.top/makeplane/plane/pull/8820 (Plane chuyển MinIO → RustFS)

## 3. Các phương án đã cân nhắc

| Chủ đề | Phương án | Kết luận |
|---|---|---|
| Ảnh người mẫu | Xin ảnh gốc sạch / AI xoá chỉ / giữ ảnh có chỉ | **Xin ảnh gốc sạch**; tạm dùng bản có chỉ |
| Điện thoại | Giữ bố cục + cỡ chữ tối thiểu / thu nhỏ y chang (~7px) / đổi bố cục | **Giữ 3 cột, chữ min ~11px, mô tả cắt 1 dòng/ẩn** |
| Backend | Chỉ Next.js / Next.js + Express riêng | **Next.js + Express riêng** (đã chốt; đổi lại tốn thêm 1 service + proxy) |
| Dữ liệu | JSON tĩnh / admin + DB / Google Sheet | **Admin + MongoDB** |
| Storage | MinIO / RustFS | **Chuẩn S3, mặc định RustFS**, đổi qua MinIO/S3/R2 bằng env |
| Đăng nhập | Ngang quyền / phân quyền | **Vài admin ngang quyền** |
| Outfit | 1 outfit / mỗi outfit 1 slug | **Mỗi outfit 1 slug**, trang chủ = outfit nổi bật |
| Deploy | VPS compose / local / Vercel | **VPS + Docker Compose** |

## 4. Giải pháp chốt

### Kiến trúc
```
Browser → Caddy (HTTPS, 1 domain)
  /         → Next.js (public SSR + admin UI)
  /api/*    → Express (REST, auth, upload)
  /media/*  → RustFS (bucket public-read)
Express → MongoDB ; Express → RustFS (S3 API)
```
- Monorepo pnpm: `apps/web` (Next.js App Router), `apps/api` (Express), `packages/shared` (zod schema + type dùng chung).
- 1 domain qua Caddy → không CORS, cookie session dùng chung.
- Cấu hình S3 qua env: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`, `MEDIA_PUBLIC_BASE_URL`.

### Mô hình dữ liệu
- `outfits`: slug (unique), title, seoDescription, modelImage {key,w,h}, status (draft|published), featured, items[], timestamps.
- `items` (embedded): name, subtitle (dòng tiếng Anh như ảnh mẫu), description, image {key,w,h}, side (left|right), order, anchor {x,y} (% theo ảnh người mẫu), affiliateUrl (bắt buộc https).
- `admins`: email (unique), passwordHash (argon2), name.
- `settings`: siteName, SEO mặc định (title, description, ogImage).
- Sessions: express-session + connect-mongo, cookie httpOnly/secure/sameSite=lax.

### Trang public `/look/[slug]`, `/` = outfit featured
- SSR đủ nội dung; Express gọi endpoint revalidate của Next (secret) khi admin lưu → on-demand revalidate.
- Lưới 3 cột trái–người mẫu–phải; món sắp theo side + order; hotspot đặt theo anchor x%/y%.
- Đường chỉ: SVG overlay, đường cong + mũi tên, tính từ bounding rect thật của món → hotspot; ResizeObserver vẽ lại. Vẽ sau hydrate (trang trí).
- Mobile: giữ 3 cột, font clamp min ~11px, mô tả line-clamp 1 hoặc ẩn ở màn rất nhỏ.
- Hover: ảnh món scale + drop-shadow (ảnh nền trong suốt), đường chỉ đậm + hotspot pulse, món khác mờ, hover 2 chiều hotspot↔món; focus bàn phím có cùng hiệu ứng; touch: chạm mở link.
- Link: `target="_blank" rel="sponsored nofollow noopener"`.
- SEO: generateMetadata, OG image, sitemap.xml, robots.txt, canonical, JSON-LD `ItemList` (chưa dùng `Product` do chưa có giá).
- Font: Be Vietnam Pro qua `next/font`.

### Admin `/admin`
- Đăng nhập email/mật khẩu; admin đầu tiên tạo bằng lệnh seed.
- Danh sách outfit: lọc/phân trang phía server.
- Editor 3 vùng: danh sách món (sửa inline, kéo thả đổi thứ tự/đổi bên) | ảnh người mẫu (chọn món → bấm/kéo để đặt điểm nối) | xem trước trực tiếp.
- Upload kéo thả → Express kiểm MIME/kích thước → sharp chuyển WebP → RustFS.
- Thao tác: Đăng/Ẩn, Đặt làm nổi bật, validate tại field.

### Tài sản ảnh
- Cắt toàn bộ món ở 2 ảnh mẫu, tách nền trong suốt bằng rembg → WebP.
- Seed 2 outfit (chữ + anchor theo ảnh mẫu), affiliateUrl để trống chờ điền.
- Ảnh người mẫu: tạm dùng bản cắt có chỉ, thay bằng ảnh gốc sạch qua admin.

## 5. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Chưa có ảnh người mẫu sạch → chưa giống mẫu 100% | Phụ thuộc bên ngoài, thay qua admin |
| Ảnh món độ phân giải thấp | Hiển thị ~150px; lâu dài lấy ảnh gốc từ shop |
| Express riêng tăng độ phức tạp vận hành | Caddy 1 domain, compose 1 lệnh, shared zod |
| Món dàn đều theo cột, không khớp vị trí dọc chính xác như ảnh mẫu | Thử bản dàn đều trước; nếu cần thêm trường "lệch dọc" |
| rembg cắt viền xấu ở món mảnh (dây chuyền, móc khoá) | Soát từng ảnh; món mảnh có thể giữ nền trắng |
| Link affiliate độc hại/sai | Chỉ nhận URL https, validate zod 2 phía |

## 6. Tiêu chí hoàn thành

- [ ] Trang giống ảnh mẫu trên desktop + mobile (so ảnh chụp màn hình 1440px, 390px)
- [ ] Bấm từng món (ảnh, tên, hotspot) mở đúng link ở tab mới
- [ ] Admin tạo/sửa outfit, upload ảnh, đặt điểm nối bằng click, đăng/ẩn
- [ ] Lighthouse SEO ≥ 95; trang public có đủ nội dung khi tắt JS
- [ ] `docker compose up` chạy đủ web, api, mongo, rustfs, caddy

## 7. Bước tiếp theo & phụ thuộc

1. Lập plan chi tiết (/ck:plan).
2. Xin Kim ảnh người mẫu gốc chưa vẽ chỉ (2 outfit) + link affiliate từng món.
3. Khi tạo git repo: xác nhận account GitHub + email commit + tên repo trước khi init.

## Câu hỏi chưa giải quyết

- Domain + VPS cụ thể (cấu hình RAM/CPU) chưa có.
- Kim có muốn thêm trường "lệch dọc" để món khớp vị trí như ảnh mẫu không — chờ xem bản dàn đều.
- Nội dung settings SEO mặc định (tên site, mô tả) chưa có.
