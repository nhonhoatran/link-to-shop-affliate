# Brainstorm: trang chủ nhiều section tuỳ chỉnh + Bộ sưu tập

Ngày: 2026-11-07. Trạng thái: đã chốt, chuyển sang lập plan.

## Vấn đề
- Trang client (sau refactor 261107-0913) còn đơn giản: `/` = 1 lookbook nổi bật + "Outfit khác"; `/looks` lưới; `/look/[slug]` lookbook.
- Muốn trang chủ nhiều section, admin tự tuỳ chỉnh, có "logic" (nguồn dữ liệu theo luật), nhìn chuyên nghiệp. Tham khảo bố cục https://kamito.vn/.
- Khoảng cách dữ liệu: kamito là shop (danh mục, giá, % giảm, size, giỏ, blog). Dự án chỉ có `Outfit` (`apps/api/src/models/outfit-model.ts`: slug, title, modelImage, status, featured, items[] có affiliateUrl) và `Settings` singleton (siteName, SEO, ogImage, uploadMaxMb, looksPageSize, relatedOutfitsCount). Không có danh mục/giá/bài viết.

## Bố cục kamito.vn (đã đọc 2026-11-07, chỉ phần HTML; CSS không lấy được)
Dải khuyến mãi → header + mega menu → banner lớn (5 ảnh) → ô danh mục (8 ô ảnh+nhãn) → banner phụ → rail "NEW ARRIVAL" + "Xem tất cả" + tab lọc → lưới sale → "Top bán chạy" → blog có tab → footer nhiều cột (về, sản phẩm, chính sách, mạng xã hội). Tiêu đề section in hoa, mỗi rail có link "Xem tất cả".

## Quyết định đã chốt
| # | Quyết định |
|---|---|
| 1 | Dữ liệu mới: **Bộ sưu tập** (collection). Không thêm giá/brand món đồ đợt này |
| 2 | Phạm vi builder: **chỉ trang chủ**. `/looks`, `/look/[slug]` cố định |
| 3 | Section: banner/slider + dải thông báo; băng chuyền outfit theo luật (có tab, "Xem tất cả"); lookbook nổi bật + ô bộ sưu tập; nội dung (chữ+ảnh, FAQ, dải cam kết), footer nhiều cột + mạng xã hội sửa được |
| 4 | Blog: **đợt sau** (dự án con riêng) |
| 5 | Builder: **Puck `@puckeditor/core` 0.24.0 ghim exact**, có spike 1–2 ngày; rớt spike → phương án B |

## Phương án đã cân nhắc
| | Được | Mất | Kết luận |
|---|---|---|---|
| A. Puck (MIT, 0.24.0 phát hành 2026-10-29, repo push 2026-11-06, 13.6k sao) | Kéo-thả WYSIWYG, trực quan nhất; `@puckeditor/core/rsc` render server không `"use client"` (đã chạy thử trong Node); dữ liệu JSON tự lưu Mongo | Pre-1.0 (minor có thể vỡ); cần custom field (ảnh, outfit, bộ sưu tập); chỉnh giao diện editor theo dark mode admin | **Chọn**, có spike |
| B. Section registry tự làm (zod trong `packages/shared`, mảng JSON có thứ tự trong Mongo, form từng loại, `@dnd-kit` đã có) | Đồng bộ 100% admin hiện có, không phụ thuộc thư viện 0.x | Không WYSIWYG thật; code nhiều hơn (~8–9 ngày) | Dự phòng |
| Payload 3 | CMS đầy đủ | Thêm admin + auth + DB adapter thứ hai, trùng hệ thống; Node engine lệch | Loại |
| Strapi 5 | | Không hỗ trợ MongoDB (docs chính thức) | Loại |
| Builder.io | | SaaS | Loại |
| Craft.js | | Bỏ hoang (push cuối 2025-02-14) | Loại |
Chi tiết + nguồn: `plans/reports/researcher-261107-1341-homepage-section-builder-options.md`.

## Thiết kế đề xuất
### Dữ liệu
- `Collection`: `slug` (unique), `name`, `description`, `coverImage` (ImageRef), `order`, `status` (draft/published), `seoDescription`. Outfit thêm `collectionIds: ObjectId[]` (index). Một outfit thuộc nhiều bộ sưu tập.
- `HomePage` (singleton, hoặc `page_layouts` theo `pageKey='home'` để mở rộng sau): `draft` + `published` (JSON Puck `{ content, root }`), `publishedAt`, `updatedBy`. Admin sửa bản nháp, bấm "Đăng" mới ra public.
- Validate JSON section phía API bằng zod theo từng loại section (không tin JSON từ client).

### Loại section (mỗi loại là 1 component Puck + 1 renderer server)
| Section | Cấu hình admin (tất cả là giá trị động, có mặc định) | Logic dữ liệu |
|---|---|---|
| Dải thông báo | text, link, bật/tắt | — |
| Banner/slider | 1–N slide: ảnh desktop/mobile, tiêu đề, mô tả, nút (nhãn+link); tự chuyển + khoảng giây | — |
| Ô bộ sưu tập | tiêu đề, chọn tay hoặc "theo thứ tự", số ô, số cột desktop | Collection published |
| Băng chuyền outfit | tiêu đề, nguồn: mới nhất / theo bộ sưu tập / chọn tay; số outfit; tab (nhiều bộ sưu tập); link "Xem tất cả" tự sinh | Query server, chỉ published |
| Lookbook nổi bật | nguồn: outfit `featured` hoặc chọn tay | Tái dùng `LookbookLayout` |
| Chữ + ảnh | tiêu đề, nội dung (văn bản thuần/đoạn), ảnh, vị trí ảnh trái/phải, nút | — |
| FAQ | danh sách hỏi/đáp | Sinh JSON-LD `FAQPage` |
| Dải cam kết | 2–4 mục: icon (danh sách lucide cho phép), tiêu đề, mô tả | — |
- Footer nhiều cột + mạng xã hội: thuộc `Settings` (không phải section trang chủ), admin sửa ở Cài đặt.
- Trang `/collections/[slug]`: header bộ sưu tập + lưới outfit phân trang server (tái dùng `OutfitCardGrid`, `LooksPagination`), sitemap + metadata. Header client có thể thêm link "Bộ sưu tập" (cấu hình trong Settings).

### Render
- Public: Server Component đọc `published` → `Render` từ `@puckeditor/core/rsc` với config chỉ gồm renderer server. Section cần dữ liệu (băng chuyền, ô bộ sưu tập, lookbook) lấy dữ liệu qua loader server (cache + tag revalidate như `public-settings`). Không fetch phía client.
- Chưa có layout đã đăng → render **bố cục mặc định** (lookbook nổi bật + băng chuyền mới nhất + ô bộ sưu tập), trang chủ không bao giờ trống.
- Animation: theo luật refactor trước (CSS lúc tải trang, `motion` chỉ sau hydrate). Slider: CSS scroll-snap + nút; tự chuyển chỉ khi không `prefers-reduced-motion`, dừng khi hover/focus.
- Đăng bố cục → API gọi revalidate `/` (thêm vào `revalidate-contract`).

### Admin (luồng người dùng)
Menu "Trang chủ" → editor Puck: trái = danh sách khối, giữa = trang thật, phải = thuộc tính. Kéo khối vào → sửa → "Lưu nháp" / "Xem trước" / "Đăng". Menu "Bộ sưu tập" → danh sách + form (ảnh bìa qua media có sẵn) + chọn outfit. Trong editor outfit thêm ô chọn bộ sưu tập.

## Spike Puck (1–2 ngày, cổng chặn)
Phải đạt đủ 4 điều kiện, rớt điều nào → chuyển phương án B, báo lại:
1. `pnpm --filter @under30ss/web build` (Next 16) chạy với `@puckeditor/core/rsc`; trang public không kéo bundle editor (đo First Load JS trang chủ trước/sau).
2. Custom field: chọn ảnh qua `/api/admin/media`, chọn outfit/bộ sưu tập từ API admin.
3. Editor nằm trong `/admin` dùng session admin hiện có, không auth thứ hai; khoá canvas thành 1 cột dọc.
4. Editor đọc được token `--admin-*` (sáng/tối) ở mức chấp nhận được.

## Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Puck 0.x đổi API/dạng dữ liệu | Ghim exact; lưu `puckVersion` cùng JSON; test render snapshot dữ liệu mẫu |
| JSON section bẩn/độc hại | zod theo loại ở API; link chỉ cho `http(s)`/đường dẫn nội bộ; text render escape, không HTML thô |
| Trang chủ chậm vì nhiều section dữ liệu | Loader song song, cache + tag; ảnh hàng đầu eager, còn lại lazy |
| Lookbook pixel đổi | Lookbook nổi bật tái dùng component cũ; spec visual P1 vẫn phải xanh |
| Admin xoá bộ sưu tập đang dùng | Section tự ẩn khi nguồn rỗng; cảnh báo khi xoá |

## Tiêu chí thành công
- Admin dựng trang chủ ≥ 6 section, đổi thứ tự, ẩn/hiện, đăng — không cần dev.
- Không cấu hình gì → trang chủ vẫn đẹp (bố cục mặc định).
- Lighthouse SEO 100 trang chủ + `/collections/[slug]`; không cuộn ngang 320–1440; no-JS đọc được nội dung; visual lookbook xanh.
- Mọi số (số item, giây chuyển slide, số cột…) là cấu hình, có mặc định.

## Bước tiếp
1. `/ck:plan` từ báo cáo này: phase 0 spike Puck → Collection (API + admin + trang) → section + renderer → editor admin → test/docs.
2. Sau đợt này: blog (dự án con riêng); có thể giá/brand món đồ.

## Đổi quyết định 5 (2026-11-07, sau khi lập plan)
- Yêu cầu mới: admin **sửa được bố cục trên điện thoại**. Puck là editor 3 cột chỉ hợp màn lớn → nếu giữ Puck phải làm thêm editor danh sách + form cho mobile (2 editor, mỗi loại section sửa 2 nơi).
- Chốt: **chỉ phương án B (section registry tự làm) cho mọi màn hình**. Bỏ spike Puck, không thêm dependency `@puckeditor/core`. Máy tính: danh sách thẻ kéo đổi thứ tự + form + xem trước cạnh bên; điện thoại: nút chuyển "Chỉnh sửa ⇄ Xem trước"; dải thông báo không có nút đóng cho khách (YAGNI).
- Đăng bố cục: không hỏi xác nhận; đăng xong toast có nút "Hoàn tác", lưu bản đã đăng trước đó để khôi phục 1 cú bấm.
- Dải thông báo: **toàn site trên header**, sửa ở Cài đặt (không phải section trang chủ).
- Commit: không commit từng phase; commit một lần khi xong.

## Chốt thêm (2026-11-07)
- Nội dung section chỉ tiếng Việt (không đa ngôn ngữ).
- Header client thêm 1 link "Bộ sưu tập" tới trang `/collections` (lưới ảnh bìa các bộ sưu tập), không menu thả xuống; mobile vẫn hiện thẳng link.
