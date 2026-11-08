# UI consistency verifying — editorial redesign (P6)

Ngày: 2026-11-08 · Checklist: `plans/261108-0923-editorial-luxury-redesign-and-new-sections/ui-consistency-checklist.md` (G-L)
Người kiểm: agent riêng, không phải agent viết code. Chưa có bước calibration (gài 1 lỗi để thử checker) từ phía điều phối, nên kết quả chưa được chứng minh là "nhìn thấy được lỗi".
Phạm vi đếm: `apps/web/src` (như checklist). Không đăng nhập admin, admin kiểm bằng code. Mục đã sửa trong `fullstack-developer-261108-review-fixes.md` không báo lại.

## Kết quả: 26 mục — 20 đạt, 6 chưa đạt (G4, H1, H4, J2, J4, K3)

Đã tick 20 mục đạt trong checklist. Bằng chứng chính cho các mục đạt:
- G1/G2: giá trị token khớp bảng (`client-theme-tokens.css:2-64`, `admin-theme-tokens.css:7-84`), 2 khối dark giống nhau. 0 hex/rgba trong mọi `*.module.css` (grep `#[0-9a-f]{3,8}|rgba?\(` trên `components`, `app`).
- G3: không `box-shadow` mới ngoài `--admin-shadow`/viền chọn có sẵn; bo góc đều qua token; 50% giữ ở 3 chỗ đã nêu.
- G5: public không còn `@media (max-width)` (chỉ lookbook 639.98 cố ý).
- H2: 11 rule tiêu đề public đều `--font-display` + `--font-weight-display`; render 390px: 3 h2 hiện ra đều Playfair 400 22px; `/`, `/looks`, `/collections` mỗi trang 1 `h1`.
- H3: CTA dùng `public-button.module.css` ở 9 file; rule pill riêng còn 1 chỗ là chấm hero (`hero-slider.module.css:99`, được phép).
- H4 (phần preload): curl `/`, `/looks`, `/collections` mỗi trang 1 `rel="preload" as="image"`.
- I4: render: ô email viền `rgb(138,130,124)` cao 44px, nút gửi chữ hoa, đen, 44px.
- J1/J3/J5/J6, K1/K2: đúng khung `collections/page.tsx`, `loading.tsx` giống hệt, `CollectionPagination` dùng lại, nav `Mail` sau "Bộ sưu tập".

## Khác biệt (file:line → cách sửa)

### Nên sửa trước khi chốt
1. **J4 — nút "Xoá vĩnh viễn" không phải kiểu nguy hiểm.** `components/admin/newsletter/newsletter-row-actions.tsx:138` dùng `btnSecondary`; cả 4 nút xoá khác dùng `btnDanger` (`collection-delete-action.tsx:56`, `item-edit-form.tsx:75`, `outfit-editor-toolbar.tsx:69`, `user-list.tsx:67`). Sửa: `styles.btnDanger`.
2. **J4 — nút không đổi chữ khi đang xử lý.** `newsletter-row-actions.tsx:133,143` chỉ `disabled`; quy ước "Đang …" (`collection-delete-action.tsx:57`, `outfit-editor-toolbar.tsx:73`, ghi trong `save-status-text.tsx:8`). Sửa: lưu action đang chạy, hiện "Đang huỷ…" / "Đang xoá…".
3. **G4 — tiêu đề admin dùng serif đậm.** `components/admin/admin.module.css:37` (`.title`, mọi `h1` admin) và `app/admin/login/login-page.module.css:22` (`.siteName`) đặt `--font-weight-bold` cạnh `--font-display`; G4 cấm bold cho serif, tiêu đề public đều dùng `--font-weight-display`. Sửa: `font-weight: var(--font-weight-display)`.
4. **H1 — CampaignBanner đặt tên vùng bằng `aria-label`.** `campaign-banner-view.tsx:78` truyền `label={heading}` trong khi tự render `h2` không `id` (`:82`); NewsletterSignup đã sửa theo kiểu `labelledBy` + `h2 id` (`newsletter-signup-view.tsx:26,29`). Sửa: `labelledBy={headingId}` + `<h2 id={headingId}>`.

### Mức thấp
5. **H1 — mũi tên "Xem tất cả" là chữ CSS, không phải `DecorativeIcon`.** `public-button.module.css:71-73` `content: '\2192'`; render xác nhận `::after = "→"`. Chữ sinh bởi CSS được tính vào tên của link, trình đọc màn hình có thể đọc "Xem tất cả mũi tên phải". Sửa: `content: '\2192' / ''` (alt rỗng) hoặc `DecorativeIcon` như checklist.
6. **H1 — vị trí "Xem tất cả" khác nhau:** CollectionTiles ở hàng tiêu đề (`collection-tiles-view.tsx:17`), OutfitList ở dưới lưới (`outfit-list-view.tsx:22-26`). Có lý do (link theo từng tab) — chỉ ghi nhận, không cần sửa.
7. **G4 — tên món lookbook vẫn serif đậm.** `lookbook.module.css:65` (`--font-weight-bold` + `--lookbook-item-name-font` = display). Q2 chỉ chốt đổi font; cần chủ repo chọn giữ đậm hay 400 khi duyệt ảnh re-baseline.
8. **G4 — phân trang có cỡ/giãn chữ nhãn nhưng thiếu `text-transform: uppercase`.** `looks-pagination.module.css:17-18`; breadcrumb, tab, nav đều có uppercase. Sửa: thêm uppercase (hoặc bỏ giãn chữ nếu cố ý giữ chữ thường).
9. **J2 — nút lọc ghi "Lọc".** `newsletter-list-filters.tsx:29`; 2/2 trang danh sách khác ghi "Tìm" (`collection-list-filters.tsx:24`, `outfit-list-filters.tsx:24`). Sửa: "Tìm".
10. **K3 — nhóm Bản tin xử lý khác nhóm tham chiếu.** `settings-newsletter-consent-fields.tsx:29` dùng `fieldset disabled` + mờ khi tắt; tham chiếu `settings-announcement-fields.tsx:18-19,29` chỉ làm mờ, vẫn sửa được, và bỏ mờ khi có lỗi. Khi tắt mà còn lỗi zod thì không sửa được nếu chưa bật lại. Câu hint của K3 ("Form đăng ký trên trang chủ chỉ hiện sau khi lưu câu đồng ý") không có, thay bằng checkbox bật/tắt + hint (`:22-28`); ghi chú "Chưa lưu" vẫn có (`:80`). Sửa: làm theo mẫu announcement (mờ, không disabled, bỏ mờ khi có lỗi `newsletterConsent.*`), hoặc ghi lại vào checklist là cố ý.
11. **H4 — `sizes` của CampaignBanner là hằng nằm trong view.** `campaign-banner-view.tsx:9`; checklist muốn đặt trong `*-image-sizes.ts` (Gallery đã làm: `gallery-image-sizes.ts`). Code cũ cũng có hằng inline (`text-with-image-view.tsx:10`, `collection-header.tsx:5`), nên chỉ áp cho code mới.
12. **Giá trị viết tay, không qua token:** `marquee.module.css:56-57` `6px` (lệch thang 4px, gần nhất 4/8 → `--space-1`/`--space-2`); `newsletter-signup.module.css:84-85` `24px` (= `--space-5`, dùng token).
13. **I3 — màu eyebrow trên nền đen khác nhau:** hero kế thừa trắng (`hero-slider-caption.module.css:12-17`), CampaignBanner dùng `--client-footer-muted` (`campaign-banner.module.css:27`). Chọn một kiểu.
14. **I2 — hover của ô Gallery khác thẻ outfit:** `gallery-mosaic.module.css:78,81` dùng `--duration-fast`, không bọc `@media (hover: hover)`; thẻ dùng `--duration-base` + `(hover: hover)` (`outfit-card.module.css:33,46`).
15. **G1 — token chết:** `--client-hero-overlay: rgba(59,47,42,0.45)` (`client-theme-tokens.css:35`) không còn ai dùng, đúng cặp checklist ghi "không đạt, bỏ". Xoá.

### Đúng nhưng không thuộc task này
- `min-width/min-height: 44px` viết tay (`looks-pagination.module.css:14-15`, `look-breadcrumb.module.css:37`) có từ trước; nên đổi sang `--client-tap-target` khi tiện.
- Outline viết tay `2px` (`outfit-list.module.css:45`, `hero-slider.module.css` dotButton) thay vì `--focus-ring-width`, có từ trước.
- `ConfirmDialog cancelLabel="Giữ lại"` (`newsletter-row-actions.tsx:81,90`) là chữ mới (các chỗ khác: mặc định "Huỷ", "Ở lại"). Có lý do: "Huỷ" sẽ trùng với "Huỷ đăng ký". Không phải lỗi.

## Focus
Public: `--color-focus` = ink trong shell (`public-shell.module.css:2`), đổi sang trắng ở footer, dải thông báo, `.onDark` (CTA hero/banner). Marquee có vòng focus riêng cho label (`marquee.module.css:92-95`). Admin: `themeRoot` đặt `--admin-focus` (`admin-shell.module.css:2`), áp cho cả trang login (`app/admin/layout.tsx`). Không có `outline: none` nào mới (chỉ `.main:focus` có từ trước). Đạt.

## Chưa kiểm được
- Admin chưa render (không đăng nhập): khoảng cách thật, dark mode, thẻ bảng mobile `data-label`, toast, dialog. Chỉ kiểm bằng code.
- Bố cục trang chủ đã publish chỉ có FeaturedLookbook, CollectionTiles, OutfitList, NewsletterSignup → **Marquee, Gallery, CampaignBanner chưa render**: overflow, chiều cao hàng mosaic, thứ tự ảnh/chữ của banner trên mobile chưa thấy. Chưa thấy hero.
- Ảnh chụp full-page: lưới card trống do animation theo cuộn (`animation-timeline: view()`), không phải lỗi; card chỉ kiểm bằng code + computed style.
- Dev console ở 390px: Next báo LCP là một ảnh món lookbook, không phải ảnh model được preload. Chỉ là cảnh báo dev, chưa đo ở build production.
- Chưa đo lại contrast; dùng bảng G1/G2 đã đo, chỉ kiểm giá trị token khớp.
- Chưa kiểm `/look/<slug>`, `/collections/<slug>`, 404 bằng trình duyệt (chỉ bằng code qua các module chung).
- Không làm so sánh cả nhóm theo từng loại trang ngoài các cặp đã nêu (danh sách admin: newsletter vs collections/outfits; section: mới vs cũ).

## Chi phí
Đã so sánh khoảng 25 file trang/component, mở khoảng 60 file dự án, chạy khoảng 30 lệnh tìm/grep, gọi 3 lần curl, 2 ảnh chụp trình duyệt + 5 lần chạy JS kiểm tra (con số ước lượng, không đếm chính xác).
