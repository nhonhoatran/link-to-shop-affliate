# UI consistency checklist (client + admin)

Đọc code ngày 2026-11-07, **trước** khi có thay đổi UI nào. Đây là ảnh chụp tại thời điểm đọc: nếu checklist và code lệch nhau thì **code đúng**, tính lại từ code, đừng cãi theo bản này.

- Dùng cho: P3 (phần A), P5 + P6 (phần B). P4 chỉ cần dòng A4, A10, A11.
- Phạm vi đếm (bound): ứng dụng `apps/web` (Next.js) cùng thư viện nó dùng (`@under30ss/shared`, không có component UI). Mọi số "x of y" bên dưới đếm trong phạm vi này.
- Theme: CSS custom properties. `app/layout.tsx:3` import `globals.css`. `globals.css:1-3` import `styles/design-tokens.css`, `client-theme-tokens.css`, `admin-theme-tokens.css`. Không có `DESIGN.md` ở gốc repo (Glob `{DESIGN.md,design.md}` không ra gì).
- **Lưu ý P1 đang chạy song song:** lúc đọc, `client-theme-tokens.css`, `admin-theme-tokens.css`, `motion-primitives.module.css` đã có trong working tree (chưa commit), màu `--admin-*` đã dời khỏi `design-tokens.css`. Số dòng của 4 file `styles/*` và `globals.css` trích bên dưới là bản working tree lúc đọc, có thể còn xê dịch.
- Mức quyết định (theo `ui-consistency:decisions`): **L1** = plan/brainstorm đã chốt yêu cầu vậy. **L3** = trang tham chiếu quyết. **L4** = dùng piece dùng chung, không viết bản riêng. **L6** = đa số, kèm số file. Số trần sau tên piece dùng chung là L4.

---

## A. Client: trang public (`/`, `/looks`, `/look/[slug]`, 404)

trang public (dự án gom vào `components/public/*` và holder `PublicPage`) theo lookbook `/look/[slug]`, 3 thành viên trên 5 ứng viên trong `apps/web`, đọc 2026-11-07.
Ứng viên: `app/page.tsx`, `app/look/[slug]/page.tsx`, `app/not-found.tsx`, `app/robots.ts`, `app/sitemap.ts`. Đã loại `robots.ts` và `sitemap.ts` vì không render holder nào. Theo vùng: vùng lookbook có 2 trên 3 (home, look), vùng thông điệp có 2 trên 3 (home lúc rỗng, 404).

- [ ] **A1. Holder trang.** Hiện tại: `PublicPage` render `<main className={styles.page}>` (`components/public/public-page.tsx:5`), dùng ở 3 trên 3 trang (`app/page.tsx:24`, `app/look/[slug]/page.tsx:28`, và `not-found.tsx:7` đi qua `PublicMessage`, `public-message.tsx:13`). Sau P3: `<main id="main">` chỉ nằm trong `PublicShell`, `PublicPage` đổi thành `div`. Cả trang chỉ có **một** `main`. Quyết: L1 (phase-03 Key Insights), mẫu holder là L4.
- [ ] **A2. Gutter trang.** Hiện tại `.page { padding: var(--space-6) var(--space-4) }` giống nhau ở mọi bề rộng (`public-page.module.css:2`). Plan muốn `--space-4` trên mobile, `--space-6` trên desktop (L1). Muốn giữ pixel lookbook (cũng L1) thì **đổi gutter ngang ở ≥1024px (`--bp-lg`), đừng đổi ở 768**. Lý do: 1024 − 2×32 = 960 = `--lookbook-max-width` (`design-tokens.css:45`), nên từ 1024 trở lên lookbook không hẹp đi. Nếu đổi ở 768 thì lookbook hẹp đi 32px trong khoảng 768–1023px, mà baseline visual chỉ chụp 1440 và 390 (`e2e/visual-reference-screenshots.spec.ts:5`), nên lệch này không bị bắt.
- [ ] **A3. Heading.** Mỗi trang có một `h1`. Vùng lookbook: `LookbookLayout headingLevel="h1"`, h1 ẩn khỏi mắt (`lookbook-layout.tsx:18`, `lookbook.module.css:16-27`), 2 trên 2. Vùng thông điệp: `h1.title` của `PublicMessage` (`public-message.tsx:15`), 2 trên 2. Cấp heading của khối con truyền qua **prop** rồi tự hạ một cấp (`lookbook-layout.tsx:9,14`), chỉ có ở tham chiếu (L3). Vì vậy `OutfitCardGrid` nhận `headingLevel` (L1). h1 hiện chữ của `/looks` là vị trí mới. Lấy bộ chữ của h1 hiện chữ duy nhất phía public: `--page-title-size` + `--font-weight-bold` (`public-message.module.css:8-13`), và thêm `line-height: var(--line-height-tight)` như h1 admin (`admin.module.css:78-83`).
- [ ] **A4. Vùng lookbook.** `LookbookLayout` giữ nguyên, chỉ bọc trong `LookbookCard`. Thẻ có `padding: 0`, **không** `overflow: hidden`, vì SVG connector có `overflow: visible` (`lookbook.module.css:132`). `.root` lookbook không có background (`lookbook.module.css:1-14`). Halo và nền vòng hotspot lấy `--color-page` (`lookbook.module.css:135`, `design-tokens.css:59`), nên mặt thẻ phải trắng: `--client-surface` = `#ffffff` (`client-theme-tokens.css:4`). Không ghi đè `--color-*` trong shell, trừ `--color-focus` (theo A11: vòng focus lấy `--client-focus`, nên cũng áp cho vòng focus trong lookbook). Quyết: L1.
- [ ] **A5. Ảnh.** `next/image` lấy `width`/`height` từ DTO, `sizes` để thành hằng chuỗi trong file `*-image-sizes.ts` (`lookbook-image-sizes.ts:1-3`, dùng ở `lookbook-item-card.tsx:22`, `lookbook-model-figure.tsx:16`). Đây là 2 trên 2 chỗ dùng `Image` phía public (L6, 1 module). `OutfitCard` làm theo: hằng `sizes` cho 2/3/4 cột trong file riêng, kèm comment trỏ breakpoint. Không viết `sizes` inline như admin (`outfit-list-table.tsx:35`).
- [ ] **A6. Link.** Link nội bộ dùng `next/link` (`public-message.tsx:1,18`). Đường dẫn look luôn qua `outfitPath()` (`lib/seo/absolute-url.ts:46`, đang dùng ở `sitemap.ts:13`, `build-outfit-metadata.ts:51`, `build-outfit-json-ld.ts:5`), quyết L4. `/looks` thêm `looksPagePath()` vào cùng file (L1). `affiliateLinkProps` (`lookbook-link-props.ts:11-15`, `rel` sponsored) **chỉ** dùng cho link affiliate, không dùng cho thẻ outfit.
- [ ] **A7. Trạng thái rỗng / 404.** Dùng `PublicMessage` với hằng chữ trong `public-copy.ts`, 2 trên 2 (`app/page.tsx:22`, `not-found.tsx:7`). `/looks` rỗng cũng đi qua `PublicMessage` (hoặc chính khối `.box` đó), chữ thêm vào `public-copy.ts`, đừng viết inline. Giữ nguyên "Không tìm thấy trang" (`public-copy.ts:2`). Link CTA của thông điệp sẽ thành pill: xem câu hỏi Q1.
- [ ] **A8. Tải dữ liệu & lỗi.** Server component, các loader bọc `cache()` gọi bằng `Promise.all` (`app/page.tsx:21`, `look/[slug]/page.tsx:25`). Không có dữ liệu thì `notFound()` (`look/[slug]/page.tsx:26`). Loader chỉ trả `null` khi API 404, lỗi khác ném tiếp (`public-data-loaders.ts:19-27`). Cả hai cách đều 2 trên 2. Không có `error.tsx` nào trong `app/` (xem danh sách file). Vì vậy `try/catch` riêng của mục "Outfit khác" là chỗ bắt lỗi cục bộ duy nhất phía public (L1). Không được bọc loader chính.
- [ ] **A9. Nav, breadcrumb, phân trang (vị trí mới phía public).** Mẫu gần nhất trong bound, chỉ lấy *cơ chế*, còn *giá trị* dùng token `--client-*`:
  - nav: `<nav aria-label>` + `aria-current="page"` tính bằng `usePathname()` trong client component (`admin-nav.tsx:14-22`), 1 trên 1.
  - phân trang: `<nav aria-label="Phân trang">` + `Link` có `rel="prev"`/`rel="next"` (`pagination-links.tsx:16-27`), 1 trên 1. Dùng lại chữ "Phân trang", "Trước", "Sau".
  - `LooksPagination` là piece riêng, plan đã đặt tên (L1). Thêm `aria-current` và dãy số trang như plan.
- [ ] **A10. Motion.** Thời lượng và easing chỉ lấy từ token (`lookbook.module.css:51,58-60`, `motion-primitives.module.css:8,13`). Mỗi module có transition/animation đều tự có khối `prefers-reduced-motion: reduce`, 2 trên 2 (`lookbook.module.css:188-199`, `motion-primitives.module.css:40-46`), ngoài rule global (`globals.css:40-47`). Trạng thái ẩn lúc tải trang chỉ được dùng class của `motion-primitives.module.css`. Không gắn 2 class animation lên một phần tử (`motion-primitives.module.css:5`). Header dùng `m.header initial={false}` (L1).
- [ ] **A11. Giá trị.**
  - Spacing base 4: `--space-1..8` = 4, 8, 12, 16, 24, 32, 48, 64 (`design-tokens.css:33-40`), đều là bội của 4.
  - Màu chrome public chỉ dùng `--client-*`, màu lookbook vẫn dùng `--color-*`.
  - Đơn vị là `px`, không phải `rem` (`design-tokens.css:26-28`), nên cỡ chữ không theo cài đặt cỡ chữ của người đọc. Đây là thực trạng, không phải lỗi của task này.
  - Breakpoint viết số cứng kèm comment trỏ token (`lookbook.module.css:167`, `design-tokens.css:77-83`).
  - Focus: rule global `:focus-visible` dùng `--color-focus` (`globals.css:35-38`). Muốn đổi màu vòng focus thì đặt lại biến trên wrapper (L1), đừng viết `outline` riêng.
- [ ] **A12. Không chép từ lookbook:**
  - khối ẩn `.title` của nó (`lookbook.module.css:17-27`), đó là của riêng lookbook;
  - cỡ chữ `clamp(…vw…)` đo từ ảnh mẫu (`design-tokens.css:2-5,21-23`). Chrome public dùng `--page-title-size`, `--body-size`, `--text-sm`, `--text-xs`;
  - breakpoint 640 compact (`design-tokens.css:85-91`), đó là của lookbook;
  - `--lookbook-hover-scale` (`design-tokens.css:63`). Thẻ lưới dùng `--client-card-hover-scale` (`client-theme-tokens.css:16`).

Lệnh tìm đã chạy (chạy lại được): `styles\.(container|narrow|toolbar|title|stack|main|root)\b` trên `apps/web/src`; `from ['"](next/image|next/link)['"]|aria-current` trên `apps/web/src`; `@media|prefers-reduced-motion|clip-path: inset\(50%\)|clip: rect|\.srOnly|:hover|cursor:` trên `*.css`; `transition|animation:` trên `*.css` (count: 3 file).

---

## B. Admin: trang trong `(protected)` + login (Tổng quan, Outfit, editor, Cài đặt, Quản trị viên)

trang admin (route group `app/admin/(protected)/` gom chúng lại; tất cả đều có toolbar + h1) theo trang Cài đặt, 5 thành viên trên 7 ứng viên trong `apps/web`, đọc 2026-11-07.
Ứng viên: `(protected)/layout.tsx`, `(protected)/page.tsx` (list), `users/page.tsx`, `outfits/new/page.tsx`, `outfits/[id]/page.tsx` (editor), `settings/page.tsx`, `login/page.tsx`. Đã loại: `layout.tsx` (chỉ bọc các thành viên) và `login/page.tsx` (nằm ngoài group, holder là `main.main` riêng, `login/page.tsx:9`). Login vẫn được ghi ở dòng nào có liên quan. Theo vùng: vùng form có 3 trên 5 (settings, new, users); vùng bảng có 2 trên 5 (list, users); editor có vùng riêng.

- [ ] **B1. Khung (shell).** Hiện tại: `div.root` (`app/admin/layout.tsx:11`) + `header` + `main.main` (`(protected)/layout.tsx:11-17`). Dữ liệu lấy bằng `Promise.all(getCurrentAdmin, getAdminSettings)` (`(protected)/layout.tsx:8`). P5 thay bằng sidebar/topbar/drawer (L1). Giữ **một** `main`, `data-theme` gắn trên wrapper admin chứ không gắn lên `<html>`. Nav vẫn là `<nav aria-label="Quản trị">` + `aria-current="page"` (`admin-nav.tsx:16,22`).
- [ ] **B2. Bề rộng nội dung.** Chưa có quy ước chung cho cả họ: `narrow` 3 trên 5 (`users/page.tsx:14`, `outfits/new/page.tsx:10`, `settings/page.tsx:11`), `container` 1 (`(protected)/page.tsx:27`), editor không có class (`outfit-editor.tsx:38`). Tách theo vùng thì rõ: trang chỉ có form dùng `narrow` (3 trên 3), trang có bảng/lưới dùng `container` hoặc full. Vì vậy Tổng quan (lưới KPI + danh sách) dùng `styles.container`, `/admin/outfits` giữ `container` (L6 theo vùng).
- [ ] **B3. Toolbar + tiêu đề.** `div.toolbar` > `h1.title` có ở 5 trên 5, trên 5 file (`(protected)/page.tsx:28-29`, `users/page.tsx:15-16`, `outfits/new/page.tsx:11-12`, `settings/page.tsx:12-13`, `outfit-editor-toolbar.tsx:33-34`), login cũng vậy (`login-form.tsx:27-28`). Hành động của trang đặt **trong toolbar**, là `Link` hoặc `button` có `btn btnPrimary|btnSecondary` (`(protected)/page.tsx:30`, `outfits/new/page.tsx:13`). CTA "Tạo outfit" của Tổng quan viết y như list. Tên tab: `export const metadata = { title }` tĩnh, 5 trên 5, cộng template `'%s · Quản trị'` (`app/admin/layout.tsx:6`).
- [ ] **B4. Panel nội dung.** Class `.panel` dùng ở 5 trên 5 (`settings-form.tsx:54`, `outfit-create-form.tsx:42`, `(protected)/page.tsx:34`, `user-list.tsx:43`, editor đi qua `AdminPanel`). Panel có tiêu đề **luôn** dùng `AdminPanel` (`section aria-labelledby` + `h2` mặc định, `admin-panel.tsx:15-27`), 6 chỗ dùng trong 5 file. Không tự viết header cho panel. Thẻ KPI, thẻ nổi bật, danh sách gần đây của Tổng quan: có heading thì dùng `AdminPanel`, không có thì dùng `.panel` (L4). Heading trong dialog là `h2.panelTitle` (`confirm-dialog.tsx:45`).
- [ ] **B5. Field.** Mọi `input`/`textarea`/`select` đều đi qua render-prop `AdminFormField` (100%: grep `<(input|textarea|select)\b` trên `components/` ra 20 control trong 8 file, đều nằm trong `AdminFormField`; input file của dropzone cũng vậy, `media-dropzone.tsx:69,94`). Thứ tự: label ở trên, hint `.hint`, `FieldError` ở dưới, có sẵn `aria-invalid`/`aria-describedby` (`admin-form-field.tsx:26-47`). Hai field mới của Cài đặt viết **y như `uploadMaxMb`**: `type="number" min={1} step={1}`, có hint "Để trống để dùng giá trị mặc định của hệ thống" (`settings-form.tsx:77-93`), quyết L3. Plan ghi `inputMode="numeric"`, nhưng trang tham chiếu không có. Thêm cũng được, nhưng đừng thay `type="number"`.
- [ ] **B6. Submit & validate.** Form dùng `useFormSubmit` + zod schema từ `@under30ss/shared` + `noValidate`, 3 trên 3 form thành viên (`settings-form.tsx:26,54`, `outfit-create-form.tsx:27,42`, `user-create-form.tsx:20,36`), login cũng vậy. Editor có luồng riêng `useOutfitActions` (`use-outfit-actions.ts:44,52`). Lỗi API đi qua `describeApiFailure`, fallback là `GENERIC_ERROR` (`describe-api-failure.ts:6-9`). 401 thì về trang login (`use-form-submit.ts:40`). Toast **thêm vào**, không thay `FormError` (L1).
- [ ] **B7. Lỗi form & dòng trạng thái.** `FormError` đặt đầu form (`role="alert"`, `field-error.tsx:14-28`), có trong 7 file. Kết quả ngắn hiện qua `StatusMessage`/`SaveStatusText` (`role="status"`, `save-status-text.tsx:19-30`), 4 chỗ dùng trong 4 file. Chữ toast **khác** "Đã lưu" (`save-status-text.tsx:15`, e2e dùng chữ này), quyết L1.
- [ ] **B8. Nút submit & lúc đang chờ.** `btn btnPrimary` đặt cuối hàng `.formActions` (canh phải, `admin-form.module.css:76-83`). `.formActions` có 5 chỗ dùng trong 5 file (`settings-form.tsx:121`, `user-create-form.tsx:66`, `login-form.tsx:47`, `outfit-create-form.tsx:83`, `item-edit-form.tsx:74`). Lúc đang chờ thì `disabled`. Luật ghi sẵn trong code (`save-status-text.tsx:5-9`): form có dòng trạng thái (editor, Cài đặt) **giữ nguyên chữ nút**; nút khác đổi chữ "Đang …" (6 chỗ trong 6 file).
- [ ] **B9. Xoá / xác nhận.** `ConfirmDialog` (`<dialog>` + `showModal`, nút Huỷ `autoFocus`, `danger` → `btnDanger`) dùng 4 lần trong 4 file (`item-edit-form.tsx:79`, `outfit-editor.tsx:94`, `outfit-editor-toolbar.tsx:72`, `user-list.tsx:80`). Xoá user trên mobile vẫn qua dialog này. Drawer của P5 dùng `useModalDialog` (L1). Sau P1 dự án sẽ có 2 cơ chế mở dialog; plan không yêu cầu gộp, nên `ConfirmDialog` để nguyên.
- [ ] **B10. Bảng / dòng.** `table.table` (`admin-list.module.css:9-20`) có `caption.srOnly` + `th scope="col"`, 2 trên 2 bảng (`outfit-list-table.tsx:10-21`, `user-list.tsx:45-55`). Ngày tháng qua `formatAdminDate(…, ADMIN_TIME_ZONE)`, 2 trên 2 (`outfit-list-table.tsx:47`, `user-list.tsx:60`). Chế độ thẻ <768px là L1. Ẩn `thead` trong `@media` thì chép **đúng các khai báo** của `.srOnly` admin (`admin.module.css:159-166`), vì class không áp được trong media query. Không nghĩ ra cách ẩn thứ ba. Badge trạng thái dùng `.badge`/`.badgeOk` (`admin-list.module.css:35-45`).
- [ ] **B11. Đường dẫn & link.** Link nội bộ dùng `next/link`. Hiện có 11 dòng chứa `'/admin…'` viết cứng trong 9 file (grep `['"\`]/admin[/'"\`?]`, không tính `robots.ts`, `admin-paths.ts`), còn `LOGIN_PATH` có 3 chỗ dùng (`admin-paths.ts:1`). P5/P6 chuyển hết sang `ADMIN_PATHS` (L1). **Mâu thuẫn trong plan:** `login-form.tsx:21` (`router.replace('/admin')`) khớp grep ở Success Criteria của P6, nhưng P5 cấm sửa `login-form.tsx` và P6 không có file này trong danh sách. Cần lead chọn: cho một phase sửa dòng này sang `ADMIN_PATHS.overview`, hoặc ghi ngoại lệ vào tiêu chí.
- [ ] **B12. Giá trị.**
  - Màu chỉ dùng `--admin-*` (`admin-theme-tokens.css:5-24`, `light-dark()`).
  - Spacing base 4. Nhịp: field cách field `--space-3`, field tự giữ khoảng bằng `margin-bottom` (`admin-form.module.css:5`). Field cuối tới hàng nút `--space-4` (`:82`). Toolbar tới nội dung `--space-4` (`admin.module.css:68`). Padding panel `--space-4` (`:90`). Padding main `--space-5` (`:43`).
  - Viền `1px` (7 chỗ), `2px` chỉ để nhấn mạnh (`admin-editor.module.css:35,44`, `admin-dropzone.module.css:9`). Viết số luôn, không có token cho bề dày viền.
  - Bộ chữ:

    | Vai trò | Cỡ | Weight | Line-height | Màu | Nguồn |
    |---|---|---|---|---|---|
    | gốc | `--text-sm` | | | | `admin.module.css:5` |
    | tiêu đề trang | `--page-title-size` | bold | tight | | `admin.module.css:78-83` |
    | tiêu đề panel | `--body-size` | bold | tight | | `admin.module.css:102-107` |
    | label | `--text-sm` | medium | | | `admin-form.module.css:13-16` |
    | hint | `--text-xs` | | | muted | `admin.module.css:153-157` |
    | lỗi field | `--text-sm` | | | danger | `admin-form.module.css:44-48` |

  - Chiều cao control: `--admin-control-height` = 44px (`design-tokens.css`), dùng cho `.btn`, `.control`, `.display` và làm `min-height` của mọi link/nút bấm trong admin (đã chốt, đáp ứng tap target ≥44).
  - Breakpoint: hiện chỉ có 1100px (`admin-editor.module.css:8-9`). Plan đổi sang 1024 kèm comment trỏ `--bp-lg` (L1).
- [ ] **B13. Không chép từ trang Cài đặt:**
  - bề rộng `narrow` cho trang không phải form;
  - helper `edit()` tự đánh dấu dirty của nó (`settings-form.tsx:45-48`), copy cục bộ (bản tương tự ở `user-create-form.tsx:30-33`);
  - chữ label riêng của nó.

  Trang tham chiếu không tự viết lại piece dùng chung nào, nên không có "drift" nào phải sửa theo.

Lệnh tìm đã chạy: `<(AdminPanel|AdminFormField|FormError|FieldError|SaveStatusText|StatusMessage|StatusTag|ConfirmDialog)\b`, `useFormSubmit\(|describeApiFailure\(|GENERIC_ERROR|noValidate|\.safeParse\(`, `styles\.(btnPrimary|btnSecondary|btnDanger|btnToggle)\b`, `formStyles\.formActions`, `<(input|textarea|select)\b|styles\.srOnly|'Đang …'`, `admin\.module\.css['"]` (count: 27 file) trên `apps/web/src`.

---

## Câu hỏi chờ chủ repo trả lời (component mới / tách ra dùng chung)

Các component plan đã đặt tên và chỗ để (`PublicShell`, `SiteHeader`, `OutfitCard*`, `LooksPagination`, `AdminSidebar`, `AdminSkeleton`, toast, `EditorTabs`…) là L1, không hỏi lại. Chỉ còn một chỗ chưa có trong plan:

- **Q1. Class nút pill dùng chung phía public.** Sẽ tạo: `components/public/public-pill-link.module.css` (class `.pill`), đặt cạnh `public-message.module.css`. Dùng ở: `PublicMessage` (link CTA, phase-03 bước 7) và `RelatedOutfitsSection` (link "Xem tất cả", bước 9), tức 2 component trong 2 file. Nếu trả lời **không**: mỗi module tự viết style pill của mình, dùng chung token `--client-radius-pill`.

Nếu không ai trả lời được: làm theo nhánh **không**.

## Đề xuất (chủ repo duyệt cùng plan)

- **P1. `--admin-control-height` 40px → 44px** (`design-tokens.css:101`, file của P1). Plan yêu cầu tap target ≥44px (phase-05/06 Non-functional). Token này đang quyết chiều cao `.btn`, `.control`, `.display` (3 chỗ dùng trong 2 file). Sửa một token gọn hơn ghi đè `min-height` ở từng component. Nếu không duyệt: P5/P6 ghi đè cục bộ và phải ghi rõ lý do.

## Vị trí bỏ ra ngoài checklist

Login form (`login-form.tsx`) không thuộc họ và plan cấm sửa; P5 chỉ đổi khung trang login. Khu vực con của editor (canvas, dnd, dropzone) giữ nguyên, P6 chỉ dời chúng vào tab. Thiếu `error.tsx` là thực trạng, plan không xử lý.

## Chữ mới cần người duyệt

Do plan đặt, chưa có trong code: "Tất cả outfit", "Outfit khác", "Xem tất cả", "Bỏ qua tới nội dung", "Trang chủ", "Tổng quan", "Thiếu link affiliate", "Đã lưu outfit", "Đã lưu cài đặt", "Đã xoá outfit", "Số outfit mỗi trang (trang Tất cả outfit)", "Số outfit trong mục Outfit khác", "Thông tin", "Món đồ", "Xem trước", "Đang tải". Chữ trạng thái rỗng của `/looks` chưa có, cần viết mới trong `public-copy.ts`. Viết theo giọng của `EMPTY_HOME_COPY` (`public-copy.ts:6-9`): câu ngắn, viết hoa chữ đầu, không có dấu chấm than.
