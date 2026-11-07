# ui-consistency:verifying — refactor UI client + admin (P7 bước 11)

Ngày 2026-11-07. Người kiểm: agent riêng, không phải agent viết trang. Chỉ đọc, không sửa source.
Checklist: `plans/261107-0913-professional-ui-refactor-client-admin/ui-consistency-checklist.md` (A client, B admin). Bound đếm: `apps/web/src` như checklist ghi.
Calibration (trang copy có cài 1 lỗi) là việc của dispatcher, agent này **không** chạy.

Cách kiểm: đọc code từng trang theo thứ tự checklist + render thật trên `http://localhost:3000` (dev) bằng Playwright 1.64.1 (script ở scratchpad, không nằm trong repo):
- Client: `/`, `/looks`, `/look/dramatic`, `/look/does-not-exist-xyz`, `/looks?page=999`, `/nope` × 320/390/768/1024/1440, `reducedMotion: reduce`.
- Admin: Tổng quan, Outfit, Tạo outfit, editor, Cài đặt, Quản trị viên, Đăng nhập × 5 bề rộng × theme sáng/tối (cookie `admin-theme`). Mở drawer (390) và ConfirmDialog "Xoá outfit" (1440) rồi bấm Huỷ, không xoá gì.

Quyết định lead đã chốt (gutter đổi ở 1024, không có module pill chung, `--admin-control-height` 44px, `login-form.tsx` giữ `router.replace('/admin')`, dark mode bằng khối `[data-theme]`, không có `(protected)/loading.tsx`, rail dùng chữ ẩn, toast không có viền nhấn bên, `--client-card-image-ratio: 2 / 5`) được coi là đúng, không báo.

---

## 1. Lệch không cố ý (cần sửa)

| # | Mức | Trang | Dòng checklist | Bằng chứng | Sửa đề xuất | Phase |
|---|---|---|---|---|---|---|
| 1 | **Cao** | 404 bên trong group `(public)`: `/look/<slug-không-có>`, `/looks?page=<quá-số-trang>` | A1 "Cả trang chỉ có **một** `main`" | `app/(public)/layout.tsx:5` bọc `PublicShell`, rồi `app/not-found.tsx:10-14` lại bọc `PublicShell` lần nữa. Render thật (cả 5 bề rộng): `main=2, header=2, footer=2`, 2 phần tử `id="main"` lồng nhau, ảnh chụp thấy 2 header + 2 footer chồng nhau. `/nope` (ngoài group) thì đúng 1. | Thêm `app/(public)/not-found.tsx` chỉ render `<PublicPage><PublicMessage … link={HOME_LINK} /></PublicPage>` (không shell). Giữ `app/not-found.tsx` có shell cho URL không khớp route nào. Thêm e2e đếm `main` trên `/look/khong-ton-tai`. | P3 |
| 2 | Trung bình | Admin, mọi trang trong `(protected)` ở theme tối | B12 "Màu chỉ dùng `--admin-*`" | ConfirmDialog ở dark: nền `rgb(18,18,18)`, chữ `rgb(255,255,255)` (màu `Canvas` mặc định của trình duyệt, không phải `--admin-surface` #171a21 / `--admin-text`), backdrop là `--admin-text` (#e6e8ee) × 0.35 nên **làm sáng** trang thay vì làm tối. Nguyên nhân: `admin-form.module.css:85-95` `.dialog` không đặt `background`/`color`, backdrop dùng `--admin-text`. | `.dialog { background: var(--admin-surface); color: var(--admin-text); }`; backdrop dùng một màu tối cố định qua token (vd thêm `--admin-backdrop` vào cả 3 khối theme) và cho drawer dùng chung (xem #6). | P6 (file `admin-form.module.css`), phát sinh do dark mode của P5 |
| 3 | Trung bình | Tổng quan | B10 "Badge trạng thái dùng `.badge`/`.badgeOk` (`admin-list.module.css:35-45`)" (L4) | `overview/overview.module.css:117-126` viết lại `.badge`/`.badgeOk`, nền `--admin-surface-2` và thiếu `display: inline-block`; bản dùng chung (`admin-list.module.css:35-45`) nền `--admin-bg`. Cùng chữ "Đã đăng" ra 2 kiểu nền giữa Tổng quan và danh sách Outfit. | Import `listStyles` từ `admin-list.module.css` trong `overview-recent-list.tsx:29`, xoá 2 class trong `overview.module.css`. | P5 |
| 4 | Thấp | Tổng quan | B4 "không có heading thì dùng `.panel`" (L4) | `overview.module.css:8-19` `.kpi` chép lại border/radius/surface/shadow/padding của `.panel` (`admin.module.css:40-46`) thay vì ghép class. | `className={\`${adminStyles.panel} ${styles.kpi}\`}`, `.kpi` chỉ giữ flex/gap/màu chữ/hover. | P5 |
| 5 | Thấp | Admin (toast, skeleton, khung) | A10 (áp cho cả dự án) "Thời lượng và easing chỉ lấy từ token"; mỗi module có motion tự có khối reduced-motion (6 trên 7 module có) | `shell/admin-toast-provider.tsx:28-33` `transition: { duration: 0.2 }`, `y: 8` viết số (token sẵn có: `--duration-route` 200ms, `--motion-distance` 16px, phía public đã đọc token qua `read-motion-tokens.ts`). `shell/admin-skeleton.module.css:5` `1.4s` viết số. `shell/admin-shell.module.css:17` có `transition` nhưng file **không** có khối `prefers-reduced-motion` (rule global `globals.css:40-47` vẫn che, nên người dùng ít bị ảnh hưởng). | Dời `readMotionTransition` ra chỗ dùng chung (vd `components/motion/`) và dùng cho toast; thêm token thời lượng shimmer; thêm khối reduced-motion cho `.frame`. | P5 |
| 6 | Thấp | Drawer menu admin (<768px) | B12 "Màu chỉ dùng `--admin-*`"; dialog khác trong họ dùng token | `shell/admin-shell.module.css:96-98` backdrop `rgba(0, 0, 0, 0.5)` viết số; ConfirmDialog (1 trên 1 dialog có sẵn) dùng token (`admin-form.module.css:92-95`). Hai dialog, hai kiểu backdrop. | Dùng chung một token backdrop (gộp với #2). | P5 |
| 7 | Thấp | Admin khung + Tổng quan | A11 "Đơn vị là `px`, không phải `rem`"; trước refactor `git grep "[0-9]rem" HEAD -- 'apps/web/src/*.css'` ra **0** | 5 chỗ `rem` mới: `overview.module.css:3` (12rem), `:107` (10rem), `shell/admin-shell.module.css:85` (18rem), `shell/admin-skeleton.module.css:25` (14rem), `shell/admin-toast.module.css:26` (24rem). | Đổi sang px trên base 4 hoặc token (24rem = 384px = `--admin-width-dialog`; 12rem = 192px = `--space-8` × 3…). | P5 |
| 8 | Thấp | Tạo outfit, khung admin | B11 "P5/P6 chuyển hết `'/admin…'` sang `ADMIN_PATHS`" (L1) | Grep `['"\`]/admin[/'"\`?]`: `components/admin/outfit-create-form.tsx:37` `router.push(\`/admin/outfits/${created.id}\`)`; `app/admin/_lib/admin-preference-actions.ts:17,26,33` (`path: '/admin'`, `revalidatePath('/admin', 'layout')`). `login-form.tsx:21` là ngoại lệ đã chốt. | `ADMIN_PATHS.outfitEdit(created.id)`; `ADMIN_PATHS.overview` cho cookie path + `revalidatePath`. | P6 (`outfit-create-form.tsx`, không có tên trong ma trận, rơi vào mục "components/admin/* còn lại" của P6); P5 (`admin-preference-actions.ts`) |
| 9 | Thấp | Danh sách Outfit (mobile), Tổng quan, khung admin | Plan P5/P6 Non-functional "Tap target ≥ 44px" (L1) | Render: link tên outfit trong bảng/thẻ cao **18px** ở mọi bề rộng (`outfit-list-table.tsx:40`); link tên trong "Sửa gần đây" cao 21px (≥768) / 42px (≤390) (`overview-recent-list.tsx:26`); skip link admin cao 37px (`shell/admin-shell.module.css:30-40`, padding `--space-2`) trong khi skip link public cao 44px. | Cho link tên `display: inline-flex; align-items: center; min-height: var(--admin-control-height)` (hoặc kéo vùng bấm ra cả hàng); skip link admin dùng `min-height: var(--admin-control-height)`. | P6 (bảng), P5 (overview, skip) |
| 10 | Thấp | Khung admin (main) | B12 "Padding main `--space-5`" (`admin.module.css:43` cũ) | `shell/admin-shell.module.css:27` `padding: var(--space-5) var(--space-4)` (lề ngang 24 → 16px ở desktop), `:138-140` 12px dưới 768. Plan/phase-05 không nhắc đổi lề này. | Nếu cố ý: ghi lý do vào phase-05. Nếu không: trả `padding-inline` về `--space-5` từ 768px. | P5 |
| 11 | Thấp | Khung admin, Tổng quan, toast | A11/B12 "Breakpoint viết số cứng kèm comment trỏ token" | 6 trên 16 media query trong file mới/sửa không trỏ token: `overview.module.css:128`, `shell/admin-shell.module.css:119,126`, `shell/admin-sidebar.module.css:151` (có comment nhưng không nêu `--bp-*`), `:185`, `shell/admin-toast.module.css:66`. 10 media query của P3/P6 đều có. | Thêm comment `/* 768px = --bp-md */`, `/* 1024px = --bp-lg */`. | P5 |
| 12 | Thấp | Sidebar admin | B12 "Viền 1px, 2px chỉ để nhấn mạnh" | `shell/admin-sidebar.module.css:56` vạch đánh dấu mục đang mở `inset 3px` — độ dày mới, không có trong họ. | Dùng 2px (độ nhấn mạnh sẵn có). | P5 |
| 13 | Thấp | Tổng quan | Chữ: hint admin không có dấu chấm cuối (7 trên 7 `hint` trong `components/admin`) | `overview-featured-card.tsx:27`, `overview-recent-list.tsx:21` ("Chưa có outfit nào."), `overview-kpi-grid.tsx:27` có dấu chấm cuối. | Bỏ dấu chấm cuối câu đơn; câu đôi ở `featured-card` có thể giữ dấu chấm giữa. | P5 |
| 14 | Thấp | Drawer menu admin | Chữ: một tên cho một thứ | Cùng một `AdminNav`: sidebar `aria-label="Quản trị"` (`admin-nav.tsx:28`, khớp B1), drawer `"Điều hướng quản trị"` (`shell/admin-nav-drawer.tsx:38`). | Dùng mặc định `"Quản trị"` ở drawer. | P5 |
| 15 | Thấp | Editor (loading) | B2 editor không có class bề rộng (`outfit-editor.tsx:120` là `<div>` trần) | `app/admin/(protected)/outfits/[id]/loading.tsx:6` dùng `styles.container` (max 896px) trong khi editor full width → skeleton hẹp hơn trang thật, nhảy layout khi tải xong. | Bỏ `styles.container` ở loading của editor. | P6 |

## 2. Khác checklist nhưng có lý do / cần lead xác nhận (không bắt sửa)

- **`/looks`, A8 "chỗ bắt lỗi cục bộ duy nhất phía public là mục Outfit khác"**: `components/public/public-shell.tsx:9-17` có thêm `try/catch` quanh `getPublicSettings()` cho header/footer. Lý do ghi ngay trong code (trang 404 cũng render shell, API chết thì 404 vẫn phải hiện). Không che lỗi của loader chính: page vẫn gọi loader riêng và ném lỗi. Đề nghị lead ghi nhận như ngoại lệ thứ hai của A8. P3.
- **Editor, B3 "hành động đặt trong toolbar"**: `outfit-editor-toolbar.tsx:35-38` tách h1 ra `.toolbar`, các nút ra `.actionsBar` sticky (`admin-editor.module.css:6-13`). Phase-06 yêu cầu toolbar sticky (L1); tách ra để tiêu đề dài không dính theo. Hợp lý, chỉ cần ghi vào phase-06. P6.
- **Editor <1024px**: phase-06 Architecture ghi "tablist sticky", nhưng `editor-tabs.module.css:1-5` không sticky (chỉ `.actionsBar` sticky). Ngoài checklist; lead xem có cần không. P6.
- **Cài đặt vs editor**: editor lỗi lưu thì vừa `FormError` vừa `toast.error` (`use-outfit-actions.ts:33-37`), Cài đặt lỗi thì chỉ `FormError` (không toast). Plan chỉ yêu cầu toast thành công cho Cài đặt, nên không trái plan; nêu để lead chọn một cách. P6.

## 3. Đúng nhưng không thuộc task này / chỉnh lại checklist

- **Breadcrumb `aria-label="Breadcrumb"`** (`public-copy.ts:31`) là chữ tiếng Anh, trong khi các nav khác đều tiếng Việt ("Điều hướng chính", "Phân trang", "Quản trị"). Do plan đặt (phase-03:31), nên không phải lệch của trang. Gợi ý đổi sang "Đường dẫn trang" nếu chủ repo đồng ý.
- **Checklist tự mâu thuẫn A4 vs A11**: A4 "không ghi đè `--color-*` trong shell", A11 "muốn đổi màu vòng focus thì đặt lại biến trên wrapper". Code làm theo A11 (`public-shell.module.css:2` `--color-focus: var(--client-focus)`), nên vòng focus trong lookbook cũng thành nâu #8a5a3c (5.82:1 trên nền thẻ trắng, đạt 3:1). Sửa câu A4 thành "trừ `--color-focus`".
- **Checklist B12 cũ**: `--admin-control-height` giờ là 44px (quyết định lead), không còn 40px.
- **A10 trạng thái ẩn lúc tải ngoài `motion-primitives`**: `lookbook-motion.module.css:5-7` ẩn SVG đường chỉ tới khi có `data-ready`. Do plan P4 đặt; không có JS thì SVG vốn rỗng nên không mất nội dung.
- **Link xem trang public trong editor** viết `href={\`/look/${state.slug}\`}` (`outfit-editor-toolbar.tsx:62`) thay vì `outfitPath()` (A6, L4). Có từ trước (`HEAD`, dòng 59).
- **Nút kéo thả trong editor 16×24px** (`sortable-item-row.tsx`, file không đổi) dưới 44px. Có từ trước.
- **Hydration mismatch trên editor**: console báo `aria-describedby="DndDescribedBy-0"` (client) vs `"DndDescribedBy-43"` (server) trên nút kéo của dnd-kit. File dnd không đổi trong task này; **chưa kiểm** được là lỗi có từ trước hay do số lần render thay đổi. Thường sửa bằng `id` cố định cho `DndContext`.
- **Nhỏ, P3**: `/looks` trình duyệt cảnh báo ảnh LCP lazy (`outfit-card.tsx:21-28` không có `preload`/`loading="eager"` cho hàng đầu; lookbook thì có `preload`, `lookbook-model-figure.tsx:18`). Comment `outfit-card-image-sizes.ts:1-2` tính mốc 1264px nhưng `.page` là `border-box` nên container đạt max ở 1200px (sizes hơi dư, không hỏng). `HOME_LINK.href` viết `'/'` (`public-copy.ts:16`) song song `HOME_PATH` (`public-nav-items.ts:9`).
- **Nhỏ, P5**: `overview-featured-card.tsx:15` `sizes="96px"` nhưng khung ảnh rộng 64px (`overview.module.css:53`).

## 4. Đã kiểm, khớp

Client: A2 (lookbook 288/358/736/960/960px ở 320/390/768/1024/1440, gutter đổi ở 1024), A3, A4, A5, A6, A7, A9, A10, A12; A11 trừ #1. Không có cuộn ngang ở cả 5 bề rộng. Mọi link/nút public cao ≥44px.
Admin: B1, B2, B3, B5, B6, B7, B8, B9, B10 (trừ #3), B13. Theme sáng/tối áp đúng trên wrapper (`rgb(245,245,244)` / `rgb(15,17,21)`), 1 `main` mỗi trang, 1 `h1` mỗi trang, không cuộn ngang ở 320–1440. Mọi token `var(--…)` dùng trong `apps/web/src` đều có định nghĩa (trừ `--font-be-vietnam-pro` do `next/font` sinh, `--i` đặt inline). Các cặp màu mới (badge success trên `--admin-surface-2`, tooltip, nút theme đang chọn, chữ muted trên `--client-surface-soft`) tính tay đều ≥4.5:1.

## 5. Không kiểm được (unevaluated)

- Không chạy calibration (việc của dispatcher).
- Không chạy no-JS, không đi Tab thật từng trang (chỉ đọc cấu trúc + đo kích thước), không chạy screen reader / axe.
- Animation chạy thật (draw-once, reveal, header ẩn khi cuộn, toast vào/ra) không quan sát: mọi lần render đều `reducedMotion: reduce`. Hover chưa render.
- Sticky (`.actionsBar`, preview `top: calc(...)`) chỉ đọc code, chưa cuộn thật để xem đè lên nhau hay không.
- Theme `system` khi OS tối chưa render (chỉ render `light`, `dark`).
- Lỗi `pageerror: Failed to execute 'measure' on 'Performance': 'LookPage' cannot have a negative time stamp` khi `notFound()` trong group: chỉ thấy ở dev, nghi là instrumentation của Next dev, chưa kiểm ở bản build.
- Stylesheet ngoài: chỉ có CSS font của `next/font/google`; mọi class dùng trong các trang đã tra ra rule trong project.

## Chi phí

- Trang so: 12 (client 5 loại kể cả 2 kiểu 404; admin 7). Toàn bộ trang cùng loại so chung ở cuối (mục 4) — 1 trang client lệch nặng (#1), các trang admin lệch nhẹ tập trung ở file P5.
- File project mở: khoảng 105 (≈95 file source + 9 file plan/checklist), con số ước lượng.
- Lệnh tìm (grep/git grep/git diff): khoảng 16, ước lượng. Lượt render: 5 script Playwright, khoảng 160 lượt tải trang.
- Chỉ có một checker (agent này); không có số liệu của checker khác.
