# Brainstorm: refactor giao diện chuyên nghiệp (client + admin)

Ngày: 2026-11-07. Trạng thái: đã chốt, chờ plan.

## Bài toán

Yêu cầu: client theo phong cách thời trang hiện đại, animation mượt. Admin theo chuẩn dashboard hiện đại. Cả hai responsive mọi tỉ lệ màn hình.

Hiện trạng (đã kiểm):
- Client chỉ có `/` (outfit nổi bật) và `/look/[slug]`, không header/footer/nav. Khách không có đường đi sang outfit khác.
- Lookbook 3 cột đo theo `assets-source/lookbook-samples/*-reference.png`. Có e2e so ảnh `e2e/visual-reference-screenshots.spec.ts`: chụp **cả trang** (dòng 27), đã emulate `reducedMotion: 'reduce'` (dòng 21).
- Admin: header ngang (`apps/web/src/app/admin/(protected)/layout.tsx`), 3 mục Outfit / Cài đặt / Quản trị viên. Không có số liệu thống kê, chưa track lượt bấm.
- Style: CSS Modules + `apps/web/src/styles/design-tokens.css`, tổng 835 dòng CSS (admin ~463). Không Tailwind, không thư viện animation.
- API public chỉ có `featured`, `slugs`, `:slug`, `settings` (`apps/api/src/routes/public-outfit-routes.ts`). Admin list đã phân trang + `total`.

## Quyết định đã chốt

| Mục | Chốt |
|-----|------|
| Phạm vi client | Thêm header + footer + trang danh sách `/looks` |
| Lookbook | Giữ bố cục 3 cột như ảnh mẫu, chỉ thêm animation |
| Trang đầu admin | Tổng quan từ dữ liệu sẵn có (không track click) |
| Phong cách client | Hiện đại mềm mại (be/pastel, bo góc mềm) |
| Cách làm style | A: giữ CSS Modules + token, thêm `motion` và `lucide-react` |
| Admin | Sidebar dashboard + dark mode |

## Phương án đã cân nhắc

| Phương án | Được | Mất | Kết luận |
|-----------|------|-----|----------|
| A. CSS Modules + token + `motion` | Một hệ style. Không phá lookbook và test so ảnh. Bundle nhẹ | Tự làm sidebar, drawer, toast, stat card (admin chỉ 5 màn hình, phần này nhỏ) | **Chọn** |
| B. Admin dùng Tailwind v4 + shadcn/ui | Có sẵn component dashboard, a11y tốt | Hai hệ style trong một app. Preflight Tailwind có thể lan sang client. Viết lại ~463 dòng CSS admin, sửa e2e | Loại |
| C. Toàn bộ Tailwind | Đồng nhất kiểu utility | Phải chuyển token lookbook đã đo, rủi ro test so ảnh cao nhất | Loại |

Thư viện đã kiểm bằng `npm view`:
- `motion` 14.10.1, peer `react ^18 || ^19`
- `lucide-react` 1.70.0, peer gồm `^19.0.0`
- Web đang dùng Next 16.4.5, React 19.3

## Thiết kế client

Visual:
- Nền be ấm, chữ nâu đậm (không đen tuyền). Thẻ bo góc lớn, nút pill, shadow mềm. Giữ font Be Vietnam Pro.
- **Lookbook đặt trong thẻ trắng bo góc** trên nền be. Lý do: ảnh người mẫu nền trắng, đặt thẳng lên nền be sẽ lộ khung.

Trang:
- Header sticky, ẩn khi cuộn xuống, hiện khi cuộn lên. Gồm tên site (Settings), Trang chủ, Tất cả outfit. Mobile: nút ☰ mở drawer.
- Footer: tên site, mô tả SEO, năm.
- `/`: lookbook outfit nổi bật, bên dưới là mục "Outfit khác" dạng lưới + nút "Xem tất cả".
- `/looks` (mới): lưới thẻ dùng `modelImage` làm ảnh bìa. Cột: 2 (mobile) / 3 (tablet) / 4 (desktop). Phân trang server-side `?page=` qua Server Component.
- `/look/[slug]`: lookbook giữ nguyên + breadcrumb + mục "Outfit khác".
- Cấu hình động: số outfit mỗi trang, số outfit trong mục "Outfit khác". Lưu trong Settings, admin sửa được. Mặc định 12 / 8.

Animation (thời lượng, độ trễ, easing đặt trong token):
- Lúc tải trang: tiêu đề fade-up, món đồ stagger, đường chỉ tự vẽ ra (`stroke-dashoffset`).
- Hover: món đồ nhích lên, đường chỉ đậm lên. Thẻ lưới phóng nhẹ ảnh.
- Thẻ lưới hiện dần khi cuộn tới. Chuyển trang fade.
- `prefers-reduced-motion` tắt hết, rule hiện có trong `globals.css`.
- Hiệu ứng đơn giản viết bằng CSS. `motion` dùng cho chỗ khó: chuyển trang, drawer, stagger.

## Thiết kế admin

- Khung:
  - Desktop: sidebar trái cố định, thu gọn còn icon được, nhớ lựa chọn.
  - Tablet: sidebar chỉ icon.
  - Mobile: topbar + drawer.
  - Chân sidebar: email + đăng xuất.
- Dark mode: nút chuyển sáng/tối, nhớ lựa chọn, mặc định theo hệ điều hành. Cần bộ token màu admin thứ hai. Chống nháy màu lúc tải trang: đọc lựa chọn trước khi render (cookie hoặc script inline).
- `/admin` = Tổng quan:
  - 4 thẻ số: Tổng outfit, Đã publish, Nháp, Thiếu link affiliate.
  - Thẻ outfit nổi bật hiện tại (ảnh + link sửa).
  - 5 outfit sửa gần nhất.
  - CTA "Tạo outfit".
- Danh sách outfit dời sang `/admin/outfits`. Desktop dạng bảng, mobile dạng thẻ dọc. Lọc/tìm vẫn server-side như hiện tại.
- Editor: desktop 2 cột (form trái, preview phải sticky). Mobile 3 tab "Thông tin / Món đồ / Xem trước".
- Phản hồi: toast khi lưu thành công/lỗi, skeleton khi tải.

## Backend cần thêm

- `GET /api/outfits?page=&size=`: outfit `published`, sắp xếp mới nhất, trả `slug`, `title`, `modelImage`, `total`. Kẹp `size` theo giới hạn.
- `GET /api/admin/stats`: tổng, published, draft, số outfit published thiếu `affiliateUrl` (draft thiếu link thì tính riêng), outfit featured, 5 bản cập nhật gần nhất.
- Settings thêm `looksPageSize`, `relatedOutfitsCount`, có validate trong `packages/shared`.
- Revalidate: thêm `/looks` vào danh sách đường dẫn khi outfit đổi.

## Thứ tự triển khai (1 plan, 2 nhánh)

1. Nền tảng: tách token client / admin (sáng + tối), token breakpoint + motion, cài `motion` + `lucide-react`.
2. API: 3 điểm trên + unit test + revalidate `/looks`.
3. Client: header, footer, `/looks`, mục "Outfit khác", thẻ trắng lookbook.
4. Client: animation lookbook + chuyển trang.
5. Admin: khung sidebar + dark mode + Tổng quan.
6. Admin: responsive danh sách, editor (tab mobile), settings (2 trường mới), users.
7. Test: cập nhật e2e (route `/admin/outfits`, test so ảnh chụp riêng `[data-lookbook]`), chạy `ui-consistency:verifying`, kiểm tra ở 320 / 390 / 768 / 1024 / 1440 px.

Phase 3–4 và 5–6 làm song song được sau phase 1–2 (không chung file, trừ `design-tokens.css` do phase 1 sở hữu).

## Rủi ro

| Rủi ro | Giảm thiểu |
|--------|------------|
| Test so ảnh hỏng do có thêm header/footer | Chụp riêng `[data-lookbook]`. Ảnh mẫu không đổi |
| Animation đường chỉ lệch khi layout đổi | `measure-connectors.ts` đã đo lại khi resize. Animation chỉ chạy một lần sau lần đo đầu |
| Đổi `/admin` thành Tổng quan làm vỡ link và e2e cũ | Cập nhật `admin-paths.ts` và e2e. Link cũ `/admin?...` có query lọc thì redirect sang `/admin/outfits` |
| Dark mode nháy màu lúc tải | Đọc lựa chọn từ cookie ở server layout và gắn `data-theme` trước khi render |
| File CSS vượt 200 dòng | Tách module theo vùng (shell, nav, card...) |
| Animation nặng trên máy yếu | Chỉ animate `transform` / `opacity`. Tôn trọng reduced-motion |

## Tiêu chí thành công

- E2E hiện có pass (17/17 sau khi cập nhật route). Test so ảnh lookbook không đổi so với ảnh mẫu.
- Không có cuộn ngang ở 320 px. Tap target ≥ 44 px trên mobile.
- Lighthouse SEO giữ 100 cho `/`, `/look/[slug]`, `/looks`.
- `ui-consistency:verifying` không còn lệch ngoài các điểm cố ý.
- Dark mode admin đủ tương phản (WCAG AA).

## Câu hỏi còn mở

- Logo: hiện chỉ có tên site dạng chữ. Có cần upload logo trong Settings không? Mặc định: dùng chữ.
- Bảng màu be/nâu cụ thể: chốt ở phase 1 bằng bản xem trước, hoặc theo bộ nhận diện bên nội dung (Kim) nếu có.
