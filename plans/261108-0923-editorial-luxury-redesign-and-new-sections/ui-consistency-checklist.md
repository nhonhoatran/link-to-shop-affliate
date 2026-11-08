# UI consistency checklist: editorial monochrome + section mới + trang Đăng ký nhận tin

Đọc code ngày 2026-11-08, trước P1. Ảnh chụp tại thời điểm đọc: lệch với code thì **code đúng**, tính lại từ code.

- Kế thừa, không chép lại: phần A/B ([refactor UI](../261107-0913-professional-ui-refactor-client-admin/ui-consistency-checklist.md)), C-F ([section trang chủ](../261107-1341-homepage-sections-and-collections/ui-consistency-checklist.md)). Phần dưới chỉ ghi điều **đổi** hoặc **mới**, đánh mã G-L.
- Phạm vi đếm: `apps/web/src`. Theme: custom properties trong 3 file token (`globals.css:1-3`). Không có `DESIGN.md`.
- Mức quyết định: **L1** plan đã chốt · **L3** trang tham chiếu · **L4** piece dùng chung · **L6** đa số (kèm số) · **L7** chọn tham chiếu vì chưa ai nêu.
- Dùng cho: P1 (G), P3 (G, H), P4 (G, H, I), P5 (G, J, K), P6 (tick toàn bộ).
- Cách làm: grep + đọc file tay (không có skill `ui-consistency` chạy được trong phiên này), contrast tính bằng script node theo công thức WCAG 2.x.

---

## G. Token và giá trị

- [x] **G1. Bảng màu public (L1).** Đổi giá trị, giữ tên token. Tỉ lệ đo 2026-11-08:
  | Cặp | Màu | Tỉ lệ | Ngưỡng |
  |---|---|---|---|
  | ink / bg | #111111 / #faf8f5 | 17.81 | 4.5 |
  | ink / surface | #111111 / #ffffff | 18.88 | 4.5 |
  | ink / surface-soft | #111111 / #f3f0eb | 16.61 | 4.5 |
  | ink-muted / bg | #5c5752 / #faf8f5 | 6.74 | 4.5 |
  | ink-muted / surface | #5c5752 / #ffffff | 7.14 | 4.5 |
  | ink-muted / surface-soft | #5c5752 / #f3f0eb | 6.28 | 4.5 |
  | on-ink / ink (nút đen, dải thông báo) | #ffffff / #111111 | 18.88 | 4.5 |
  | footer-fg / footer-bg | #faf8f5 / #111111 | 17.81 | 4.5 |
  | footer-muted / footer-bg | #a8a29e / #111111 | 7.49 | 4.5 |
  | border-strong / bg (viền ô nhập, checkbox) | #8a827c / #faf8f5 | 3.56 | 3 (UI) |
  | border-strong / surface-soft | #8a827c / #f3f0eb | 3.32 | 3 (UI) |
  | focus (ink) / bg | #111111 / #faf8f5 | 17.81 | 3 (UI) |
  | border / bg | #e7e2da / #faf8f5 | 1.22 | chỉ trang trí, không dùng làm viền điều khiển |
  | wordmark footer / footer-bg | #2a2a2a / #111111 | 1.32 | logotype, `aria-hidden`, miễn 1.4.3 |
  | chữ trắng / scrim ink alpha 0.6 trên ảnh trắng | → rgb(112) | 4.95 | 4.5 |
  | chữ trắng / overlay cũ `rgba(59,47,42,0.45)` trên ảnh trắng | | 2.55 | **không đạt**, bỏ |
- [x] **G2. Bảng màu admin (L1).** Sáng: text #111 / bg #faf8f5 17.81; muted #5c5752 / bg 6.74; border-strong #8a827c / bg 3.56; danger #b91c1c / bg 6.10; success #15803d / surface 5.02; warning #b45309 / warning-bg 4.84 (giữ). Tối: giữ bảng cũ, accent/focus #e6e8ee trên bg #0f1115 15.42, trên surface #171a21 14.21. Sửa **cả hai** khối dark (`admin-theme-tokens.css:34-56` và `:62-84`).
- [x] **G3. Hình khối (L1 + L6).** `--client-radius-pill` dùng 14 dòng / 11 module, `--client-radius-lg` + `--client-shadow-soft` 14 dòng / 9 module, `--admin-radius*` 32 dòng: đổi giá trị token (2px, `none`) là đủ. Chỗ tròn cố ý giữ: `border-radius: 50%` ở hotspot lookbook (`lookbook.module.css:100,111`), `admin-editor.module.css:88`, `editor-tabs.module.css:39`. Không thêm `box-shadow` mới; tách lớp bằng hairline `1px solid var(--client-border)`.
- [ ] **G4. Chữ (L1).** `--font-display` cho `h1`/`h2` hiển thị và wordmark; thân giữ `--font-sans` (`design-tokens.css:18`, `globals.css:20`). Weight tiêu đề `--font-weight-display` (400), không dùng `--font-weight-bold` cho serif. Nhãn/nav/nút/eyebrow: `text-transform: uppercase` + `--letter-spacing-label` + `--text-label`; hiện chỉ có 1 chỗ uppercase (`lookbook.module.css:68`), nên đây là quy ước mới. **DOM giữ chữ thường**, không nhập chữ hoa vào dữ liệu.
- [x] **G5. Breakpoint (L6).** Mobile-first `@media (min-width: 768px | 1024px)`: 14 `min-width` so với 1 `max-width` (`site-header.module.css:66`, P3 sẽ viết lại) trong `components/home-sections/*.css` + `components/public/*.css`, vd `outfit-card.module.css:56,64`. Mosaic của research dùng `max-width: 639.98px`: viết lại theo `min-width`.
- [x] **G6. Thiếu token.** P3-P5 cần token mới: báo lead, P1 thêm. Không hex trong module.

## H. Public: holder, tiêu đề, nút, ảnh, thẻ

- [ ] **H1. Holder section (L3: `SectionShell`, `section-shell.tsx:30-46`).** Giữ `aria-labelledby`/`aria-label`, `data-section-id`. Thêm `eyebrow` (chữ hoa nhỏ, `p` đứng trước `h2`, không phải heading) và vùng action phải (link "Xem tất cả" dạng text + mũi tên `DecorativeIcon`), hairline dưới hàng tiêu đề. Section full-bleed (Marquee, CampaignBanner) vẫn đi qua `SectionShell` (prop thoát container), không tự viết `<section>`.
- [x] **H2. Tiêu đề (L6).** `--page-title-size` dùng ở 10 module (8 public, 2 admin; grep `page-title-size`). Mỗi rule tiêu đề tự thêm `font-family: var(--font-display)`; **không** dùng rule `h1, h2` toàn cục (sẽ đè tên món lookbook vì `itemHeading` là h2/h3, `lookbook-layout.tsx:14`, và heading form admin). Hero/banner dùng `--display-title-size`. Một `h1` mỗi trang (C2 cũ còn hiệu lực).
- [x] **H3. Nút (Q1 đã chốt).** 14 dòng pill / 11 module tự viết (`grep "border-radius: var(--client-radius-pill)"`), gồm 5 CTA thật: `hero-slider.module.css:64`, `section-shell.module.css:28`, `text-with-image.module.css:33`, `related-outfits-section.module.css:24`, `public-message.module.css:27`; còn lại là nút icon, chấm, tab, pagination, skip link, link nav/social. Quyết (L4): CTA dùng `public-button.module.css` (`.button` + `.primary|.outline|.onDark|.textLink`, 44px, chữ hoa, giãn chữ, padding `--space-5`) và xoá rule pill riêng; nút icon dùng `.icon`; chấm/tab/pagination/nav giữ class riêng.
- [ ] **H4. Ảnh và LCP (L1 + L3).** Hiện 5 chỗ dùng `loading: 'eager'` + `fetchPriority: 'high'` (`hero-image-props.ts:27`, `text-with-image-view.tsx:40`, `collection-card.tsx:36`, `outfit-card.tsx:30`, `collection-header.tsx:20`), 1 chỗ `preload` (`lookbook-model-figure.tsx:18`), 0 chỗ `priority`. Quy tắc: chỉ **một** ảnh ưu tiên mỗi trang; `<Image>` đơn dùng `preload` (code mới: CampaignBanner, Gallery); `<picture>` art-direct (hero) giữ `fetchPriority="high"`; không dùng `priority`. Không sửa 5 chỗ cũ trừ khi phase chủ đang sửa file đó. `sizes` là hằng trong `*-image-sizes.ts` (mẫu `outfit-card-image-sizes.ts`). Ảnh outfit `object-fit: contain` (`outfit-card.module.css:36`), bìa bộ sưu tập `cover` (`collection-card.module.css:36`) + `object-position` token.
- [x] **H5. Thẻ (L1).** Khung 2:3 qua token, chú thích dưới ảnh (tên serif, meta chữ hoa nhỏ), không bo, không bóng. Không chữ đè ảnh trên thẻ (khác mockup, lý do contrast). Không giá, không số món, không thương hiệu (DTO `PublicOutfitCardDto` chỉ có `slug`, `title`, `modelImage`, `updatedAt`).
- [x] **H6. Header/footer (L1).** Wordmark = `siteName` (chữ, không ảnh). Footer đen đặt `--color-focus: var(--client-focus-on-ink)` cục bộ (mẫu `public-shell.module.css:2`). Không icon tìm kiếm/tim/giỏ, không chọn ngôn ngữ.

## I. Section mới

- [x] **I1. Marquee.** Pattern research mục 2: checkbox + label (Space bật/tắt), 2 nhóm, nhóm 2 `aria-hidden` và **không** chứa link/nút, chỉ animate `transform`, chiều cao token. Reduced-motion: `animation: none` trong module (rule toàn cục `globals.css:41-47` chỉ rút thời lượng, với `infinite` sẽ nhấp nháy). Id checkbox theo `section.props.id`. Không pause bằng hover.
- [x] **I2. Gallery.** CSS grid hàng cố định (`--client-mosaic-row`), span do hàm thuần `galleryMosaicSpans(n)` (`gallery-mosaic-layout.ts`, test mọi n 1-12): nhóm 3 ô, nhóm chẵn [rộng, thường, thường], nhóm lẻ [thường, thường, rộng]; desktop 4 cột, mobile 2 cột, ô rộng span 2; nhóm cuối 1 ô span cả hàng, 2 ô chia đôi hàng. Không ô cao, không `grid-auto-flow: dense` (thứ tự nguồn = thứ tự nhìn), không ô trống. Mẫu span là quyết định thiết kế, không phải giá trị nghiệp vụ. Bố cục mặc định: Gallery `latest` không lặp outfit của OutfitList (API loại trùng). Mỗi ô là link `/look/[slug]` qua `outfitPath()` (`lib/seo/absolute-url.ts`), `alt` = tên outfit (ảnh là nội dung link, khác thẻ outfit `alt=""` vì thẻ có heading). `sizes` theo bề rộng ô thật (research: ô thường ~280px, ô rộng ~580px ở 1440).
- [x] **I3. CampaignBanner.** Panel chữ nền đặc (`--client-surface-soft` hoặc ink), không chữ đè ảnh. Mobile: ảnh trên, chữ dưới. Khung ảnh `--client-banner-ratio`, `alt` từ props. CTA theo H3.
- [x] **I4. Form đăng ký (form public đầu tiên).** Grep `<form` trong `components/public`, `components/home-sections`, `app/(public)`: 0 file; `aria-live` trong `apps/web/src`: 1 chỗ (`hero-slider-autoplay.tsx:85`). Form chỉ hiện khi admin đã lưu câu đồng ý (API bỏ section khi chưa lưu). Quyết (L7, có lý do):
  - Nhãn hiện cho ô email (không chỉ placeholder); `type="email"`, `autoComplete="email"`, `inputMode="email"`, `required`.
  - Checkbox đồng ý **không tick sẵn**, `required`, nhãn bọc cả checkbox (vùng chạm 44px), link chính sách mở bằng `PublicSmartLink`.
  - Validate HTML gốc (không `noValidate`), khác admin (`settings-form.tsx:59` có `noValidate`): lý do chạy không JS, lỗi hiện tại field.
  - Kết quả server: `p[role=status][aria-live=polite][tabindex=-1]` ngay dưới nút; `ok` hiện `successMessage` của section, trống thì câu mặc định trong `home-section-copy.ts` (không viết cứng trong view); 3 thông báo lỗi lấy từ `home-section-copy.ts`; lỗi không dùng `role=alert` (không ngắt người đọc).
  - Nút gửi: đổi chữ "Đang gửi" + `disabled` khi pending (mẫu B8 cũ: form khác đổi chữ "Đang …").
  - Honeypot ẩn bằng CSS (class `srOnly` cục bộ, mẫu `section-shell.module.css:36`) + `aria-hidden` cho khối bọc, `tabIndex=-1`, `autoComplete="off"`.
  - Ô nhập dùng `--client-border-strong` (3:1), focus ring toàn cục.
- [x] **I5. Chế độ preview.** Mọi view mới client-safe; `mode='preview'`: form không gắn `action`, nút disabled, ghi chú "Xem trước, không gửi".

## J. Admin: danh sách người đăng ký

Tham chiếu (L3): `/admin/collections` (`app/admin/(protected)/collections/page.tsx`).
- [x] **J1. Khung.** `div.container > div.toolbar (h1.title + nút phụ "Xuất CSV") > div.panel > filters + bảng + phân trang` (`collections/page.tsx:23-42`). `metadata.title` = "Đăng ký nhận tin".
- [ ] **J2. Lọc server-side.** Form GET `role="search"` + `AdminFormField compact` (`collection-list-filters.tsx:10-14`). Query parser lenient (mẫu `collection-list-query.ts:25-32`).
- [x] **J3. Bảng.** `caption.srOnly`, `td role="cell" data-label` cho thẻ mobile, badge `listStyles.badge` (+ `badgeOk` cho "Đang nhận tin"), hàng rỗng `colSpan` (`collection-list-table.tsx:21,36,53-54`). Ngày qua `formatAdminDate(…, timeZone, true)` (`outfit-list-table.tsx:50`).
- [ ] **J4. Huỷ/xoá.** `ConfirmDialog` (10 file đang dùng), xoá `danger` (`collection-delete-action.tsx:60-65`); thành công `toast.success` (`:46`), lỗi inline `setError(describeApiFailure(err).message)` (`:49`); 401 → `useRedirectOnUnauthorized`. Sau thao tác: `router.refresh()` (ở lại trang, giữ bộ lọc).
- [x] **J5. Phân trang.** Dùng nguyên `CollectionPagination` (đã nhận `hrefForPage`, `collection-pagination.tsx:12`), không đổi tên. Gom với `pagination-links.tsx` để follow-up.
- [x] **J6. Nav.** Mục "Đăng ký nhận tin", icon `Mail` (lucide 1.70.0, có file icon), sau "Bộ sưu tập" (`admin-nav.tsx:17-24`).

## K. Admin: nhóm "Bản tin" trong Cài đặt

Tham chiếu (L3): `settings-announcement-fields.tsx` (nhóm field có điều kiện) và `settings-checkbox-field.tsx`.
- [x] **K1.** Component riêng, lưu bằng nút Lưu chung, lỗi zod map theo `newsletterConsent.text|privacyHref|privacyLabel` (mẫu `settings-form-errors.ts`).
- [x] **K2.** Textarea câu đồng ý có bộ đếm ký tự; dòng "Phiên bản hiện tại: N" + hint "Tự tăng khi đổi nội dung hoặc link" (chỉ đọc). Nhãn link để trống = dùng mặc định (hint như `uploadMaxMb`).
- [ ] **K3.** Hint nhóm Bản tin: "Form đăng ký trên trang chủ chỉ hiện sau khi lưu câu đồng ý". Chưa lưu lần nào (`newsletterConsentVersion: null`): textarea điền sẵn câu mặc định + ghi chú "Chưa lưu: form đăng ký chưa hiện trên trang chủ" thay cho dòng phiên bản.

## Chữ mới cần chủ repo duyệt
- `HOME_SECTION_META`: "Banner chiến dịch", "Dải chữ chạy", "Thư viện ảnh", "Đăng ký nhận tin" + mô tả.
- Mặc định section: Gallery "Thư viện ảnh" (6 ô), Newsletter heading/nút "Đăng ký", câu thành công mặc định (khi `successMessage` trống), câu đồng ý mặc định `DEFAULT_NEWSLETTER_CONSENT`, nhãn "Chính sách bảo mật" (Q4 còn mở).
- Copy UI: "Email", "Tạm dừng", "Tiếp tục", "Đang gửi", 4 thông báo kết quả (ok, invalid, rate, error), "Xem trước, không gửi".
- Admin: "Đăng ký nhận tin", "Xuất CSV", "Huỷ đăng ký", "Xoá vĩnh viễn", "Đang nhận tin", "Đã huỷ", nội dung 2 dialog, nhãn nhóm "Bản tin", hint version, hint "Form đăng ký trên trang chủ chỉ hiện sau khi lưu câu đồng ý", ghi chú "Chưa lưu".
- Giọng: câu ngắn, viết hoa chữ đầu, không chấm than (theo `EMPTY_HOME_COPY`, `public-copy.ts`).

## Lệnh tìm đã chạy
`border-radius: var(--client-radius-pill)`, `client-radius-lg|client-shadow-soft`, `admin-radius`, `box-shadow` (admin), `border-radius: 50%`, `page-title-size`, `text-transform|letter-spacing`, `font-family`, `composes:` (0), `from 'next/image'`, `fetchPriority|preload|priority=`, `<form` (public: 0), `aria-live`, `ConfirmDialog`, `toast.success`, `data-label`, `type="checkbox"`, `@media (min-width|max-width` (đều trên `apps/web/src`).

## Câu hỏi còn mở
- Q1, Q2 đã chốt (xem `plan.md`): H3 dùng module nút; lookbook đổi font, P6 re-baseline sau khi chủ repo duyệt ảnh.
- Q4 còn mở: chữ câu đồng ý + link chính sách (link để trống tới khi có trang chính sách).
- Hero hiện có 1 CTA; mockup có thêm link phụ "Bóc tách outfit này". Không thêm (YAGNI), trừ khi chủ repo yêu cầu.
