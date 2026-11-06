# Phase 06 report: Admin UI

## Routes (all `robots: { index: false, follow: false }` via `app/admin/layout.tsx`)
- `/admin/login` (`login/page.tsx`)
- `/admin` list, server-rendered (`(protected)/page.tsx`), searchParams `q/status/page`
- `/admin/outfits/new`, `/admin/outfits/[id]` (editor), `/admin/settings`, `/admin/users`
- `(protected)/layout.tsx`: server `getCurrentAdmin()` -> 401 redirects to `/admin/login` (via `adminGet` in `app/admin/_lib/admin-api.ts`, cookie forwarded, `cache()` so layout and users page share one `/api/auth/me` call). 404 -> `notFound()`.

## Files (apps/web)
- `src/app/admin/`: `layout.tsx`, `login/page.tsx`, `_lib/admin-api.ts`, `(protected)/{layout,page}.tsx`, `outfits/new/page.tsx`, `outfits/[id]/page.tsx`, `settings/page.tsx`, `users/page.tsx`
- `src/components/admin/`: `admin-form-field`, `field-error` (FieldError + FormError), `confirm-dialog`, `validation-messages`, `login-form`, `logout-button`, `admin-nav`, `outfit-list-{filters,table,query}`, `pagination-links`, `outfit-create-form`, `outfit-editor`, `outfit-editor-toolbar`, `item-list-panel`, `sortable-item-row`, `item-edit-form`, `outfit-details-form`, `anchor-placement-canvas`, `anchor-from-pointer`, `live-preview-panel`, `map-editor-state-to-public-dto`, `media-dropzone`, `settings-form`, `user-create-form`, `user-list`; CSS: `admin.module.css` (shell, buttons, fields, dialog), `admin-list.module.css`, `admin-dropzone.module.css`, `admin-editor.module.css` (extra modules, split to keep files near 200 lines)
- `src/hooks/admin/`: `editor-state` (pure reducer + OutfitInput mapping), `use-outfit-editor-state`, `use-outfit-actions` (validate, save, featured, delete), `use-unsaved-changes-guard`, `use-save-shortcut`, `use-form-submit` (shared by login/create/settings/user forms)
- `test/admin/`: 6 files, 35 tests
- Ticked all Todo + Status in `phase-06-admin-ui.md`. plan.md untouched. No deps/config/tokens/globals/lib edits. grep for private forms of address on owned dirs: no match.

## Checklist, line by line
- admin shell: `(protected)/layout.tsx` has `<header>` (site name, `<nav aria-label="Quản trị">` with Outfit / Cài đặt / Quản trị viên and `aria-current="page"` via `usePathname`, admin email, logout `<button>` in a `<form>`), `<main>`. Root `div` uses `--admin-bg`; panels `--admin-surface` + `--admin-border` + `--admin-radius`.
- page title: one `<h1>` per page in `.toolbar`, primary action right (list: "Tạo outfit"). Editor: h1 = outfit title, actions in the same toolbar row.
- buttons: native `<button>`, `next/link` for navigation, only `.btn .btnPrimary/.btnSecondary/.btnDanger`, `min-height: var(--admin-control-height)`, radius `--admin-radius-sm`; submit buttons disabled with "Đang …" label while pending.
- fields: all form fields (login, create, item edit, settings, user create, plus outfit details and list filters) go through `AdminFormField` (label above, `FieldError` under, control gets `id`, `aria-invalid`, `aria-describedby` = hint id + error id). Test: `admin-form-field.test.tsx`.
- validation: client uses shared zod (`loginInputSchema`, `outfitInputSchema`, `settingsInputSchema`, `createAdminInputSchema`); issues -> dotted-path map -> Vietnamese text (`validation-messages.ts`). `ApiError.fields` fills the same map. Publish without link/anchor: row marked (`data-invalid`, "Cần sửa", danger colours), first bad item auto-selected, its field shows the message. Tested for client and server `items.<i>.affiliateUrl`.
- form-level failure: `FormError` (`role="alert"`, `--admin-danger-bg`/`--admin-danger`) exported from `field-error.tsx`, used on top of every form and the editor.
- outfit list: `<form method="get" action="/admin" role="search">` (q + status + "Tìm"), `<table>` (thumbnail, title link, status badge, featured, updated), empty row "Chưa có outfit nào khớp.", `<nav aria-label="Phân trang">` links that keep q/status. No client state.
- confirm: `ConfirmDialog` on native `<dialog>` + `showModal()` (falls back to `open` attribute where `showModal` is missing, e.g. jsdom); danger button for delete outfit / delete item / delete admin / leave with unsaved changes.
- save status: `role="status"` in editor toolbar: "Đã lưu" / "Đang lưu…" / "Chưa lưu được" / "Có thay đổi chưa lưu"; details in the alert box.
- editor layout: CSS grid 3 panes, one column below 1100px (single literal `@media (min-width: 1100px)` in `admin-editor.module.css` with comment). Preview toggle "Máy tính"/"Điện thoại" (`aria-pressed`). Preview = `<LookbookLayout outfit headingLevel="h2">` fed by `mapEditorStateToPublicDto` (uses shared `toPublicOutfitDto`, so anchor-less items are dropped); warning above preview counts hidden items and each row says "Chưa đặt điểm".
- tokens: colour, spacing, type from tokens. Literals left: `1100px` breakpoint; border widths (`1px`/`2px`, no border-width token), sr-only `1px`; `sizes="48px"` on thumbnails (matches `--space-7`); mobile preview width `calc(var(--space-8) * 6)` (384px, no preview-width token); fr ratios in grid.
- copy: list below.
- noindex: yes.

## Behaviour
- Anchor: `anchorFromPointer` = `round1((clientX-left)/width*100)`, same for y, clamp 0..100. Click on the model sets the selected item; dots are draggable (pointer capture) and move with arrow keys (+-1); "Đặt điểm ở giữa ảnh" button for keyboard/no-pointer users.
- Drag-drop items: `@dnd-kit` two `SortableContext` (left/right) + droppable per side, Pointer (5px) + Keyboard sensors; cross-side drop inserts before the target item or at the end of an empty side. Orders renumbered 0..n-1 per side.
- Slug auto from `slugifyVietnamese(title)` until edited (create form only; editor never rewrites slug).
- Ctrl/Cmd+S -> save. Unsaved guard: `beforeunload` + document-capture click on same-origin links -> dialog "Rời trang khi chưa lưu?". `featured` is excluded from dirty (own endpoint).
- Đăng/Ẩn = full PUT with status override; status only changes after a successful save. "Xem trang" = `/look/<slug>` in new tab, shown only when published.
- Users: own row shows "Tài khoản của bạn" instead of Xoá (compares `/api/auth/me` id). Temp password is an `<input type=password>`, never logged.

## API calls per screen
- login: POST `/api/auth/login`. Shell: GET `/api/auth/me` (server), POST `/api/auth/logout`.
- list: GET `/api/admin/outfits?page&q&status` (server).
- create: POST `/api/admin/media?kind=model`, POST `/api/admin/outfits` (body: status draft, featured false, items []).
- editor: GET `/api/admin/outfits/:id` (server), PUT same, DELETE same, POST `/api/admin/outfits/:id/featured {featured}`, POST `/api/admin/media?kind=item|model`.
- settings: GET/PUT `/api/admin/settings`, POST `/api/admin/media?kind=model` (share image).
- users: GET `/api/admin/admins`, POST `/api/admin/admins`, DELETE `/api/admin/admins/:id`.

## New user-facing copy (Vietnamese, for review)
Shell: Under30ss; Outfit; Cài đặt; Quản trị viên; Đăng xuất; Đang thoát…; metadata titles: Quản trị / Đăng nhập / Outfit / Tạo outfit / Sửa outfit / Cài đặt / Quản trị viên.
Login: Đăng nhập; Email; Mật khẩu; Đang đăng nhập….
List: Outfit; Tạo outfit; Tìm theo tên; Trạng thái; Tất cả; Bản nháp; Đã đăng; Tìm; Danh sách outfit; Ảnh; Tên; Nổi bật; Cập nhật; Chưa có outfit nào khớp.; Phân trang; Trước; Sau; Trang {n} / {m}.
Create: Tạo outfit; Quay lại danh sách; Tên outfit; Đường dẫn (slug); Tự tạo từ tên, có thể sửa; Ảnh người mẫu; Ảnh người mẫu đã tải lên; Tạo và mở trình chỉnh sửa; Đang tạo….
Dropzone: Kéo ảnh vào đây hoặc bấm để chọn; Đang tải lên {file}…; "{file}" không phải là ảnh; Không tải được "{file}".
Editor toolbar: Outfit chưa đặt tên; Lưu; Đang lưu…; Đăng; Ẩn; Đặt nổi bật; Bỏ nổi bật; Xem trang; Xoá outfit; Đã lưu; Có thay đổi chưa lưu; Chưa lưu được; Chưa đăng được: kiểm tra các mục báo lỗi; Chưa lưu được: kiểm tra các mục báo lỗi; Không lưu được, vui lòng thử lại; Không đổi được trạng thái nổi bật; Không xoá được outfit.
Items: Món trong outfit; Danh sách món; Bên trái; Bên phải; Kéo món vào đây; Kéo để sắp xếp {tên}; Món {n} (default name); Món chưa có tên; Chưa đặt điểm; Cần sửa; + Thêm món; Kéo một hoặc nhiều ảnh món vào đây; Chi tiết món; Đổi ảnh món; Tên món; Dòng phụ; Mô tả; Link affiliate; Bắt đầu bằng https://. Bắt buộc khi đăng.; Đã đặt điểm trên người mẫu.; Chưa đặt điểm trên người mẫu.; Xoá món.
Canvas: Đặt điểm trên người mẫu; Ảnh người mẫu; Điểm của {tên}; Bấm lên người mẫu để đặt điểm cho "{tên}". Kéo chấm để chỉnh.; Chọn một món ở bên trái, rồi bấm lên người mẫu để đặt điểm.; Đặt điểm ở giữa ảnh.
Details: Thông tin outfit; Tên outfit; Đường dẫn (slug); Đổi slug sẽ đổi địa chỉ trang; Mô tả cho Google; Đổi ảnh người mẫu; Các điểm đã đặt giữ nguyên vị trí theo phần trăm.
Preview: Xem trước; Kích thước xem trước; Máy tính; Điện thoại; {n} món chưa đặt điểm nên chưa hiện trong bản xem trước và trên trang thật.
Dialogs: Huỷ; Xoá món này?; Món "{tên}" sẽ bị xoá khỏi outfit. Bạn vẫn có thể bỏ thay đổi bằng cách không lưu.; Xoá outfit này?; Outfit và toàn bộ món trong đó sẽ bị xoá, không khôi phục được.; Rời trang khi chưa lưu?; Các thay đổi chưa lưu sẽ mất.; Rời trang; Ở lại; Xoá quản trị viên?; {email} sẽ không đăng nhập được nữa.; Xoá.
Settings: Tên site; Tiêu đề SEO mặc định; Mô tả SEO mặc định; Giới hạn dung lượng ảnh tải lên (MB); Để trống để dùng giá trị mặc định của hệ thống; Ảnh chia sẻ (Facebook, Zalo); Ảnh chia sẻ hiện tại; Lưu cài đặt; Đã lưu.
Users: Danh sách quản trị viên; Ngày tạo; Thao tác; Tài khoản của bạn; Thêm quản trị viên; Mật khẩu tạm; Tối thiểu 8 ký tự. Gửi cho người dùng và nhờ họ đổi sau.; Đang thêm…; Không xoá được quản trị viên.
Validation: Không được để trống; Tối thiểu {n} ký tự; Tối đa {n} ký tự; Email không hợp lệ; Chỉ dùng chữ thường, số và dấu gạch ngang; Bắt buộc; Giá trị không hợp lệ; Link phải là địa chỉ https:// hợp lệ; Thiếu link affiliate; Chưa đặt điểm trên người mẫu; Mã món bị trùng; Có lỗi xảy ra, vui lòng thử lại.

## Test results (repo root)
- `pnpm --filter @under30ss/web typecheck`: `tsc -p tsconfig.json --noEmit`, exit 0, no output.
- `pnpm --filter @under30ss/web test`: `Test Files 13 passed (13)`, `Tests 82 passed (82)` (47 existing + 35 admin). Harmless jsdom line "Not implemented: navigation to another Document" (test clicks a real link while clean).
- `pnpm lint`: `eslint .` exit 0, no output.
- Admin tests: anchor from pointer (4: percent, 1 decimal, clamp, empty box) + canvas click/dot/arrow keys (4); DTO mapping (3); reducer (7); publish-without-link on right item (client link, client anchor, server `items.4.affiliateUrl`, successful publish) (4); unsaved guard (beforeunload, new-tab/ctrl ignored, in-app dialog confirm/cancel) (4); Ctrl/Cmd+S (1); form-field aria wiring (2); validation messages (3); list query (3).

## Unverified / concerns
1. Not run: `next build`, real browser, real API (P2). Server pages (`adminGet`, redirect, list, searchParams) have no automated test; verify in P7.
2. Validation text from shared schema is English; mapped to Vietnamese in `validation-messages.ts` by issue code and, for `affiliateUrl` custom issues, by looking for "https" in the shared message. Server `fields` messages are shown verbatim (language decided by P2). Server field keys are assumed to be dotted paths like `items.4.affiliateUrl`.
3. Upload "progress" is indeterminate ("Đang tải lên …") because `uploadMedia` uses `fetch`; real % would need XHR.
4. Browser back/forward is not guarded (only reload/close and in-app link clicks).
5. Mobile preview only narrows the container; `LookbookLayout` media query (<640px hides descriptions) follows the real viewport, so it will not trigger in the preview.
6. Dates in list formatted on the server with the server timezone (`vi-VN`, short); Docker UTC may show off-by-hours near midnight.
7. dnd-kit: cross-side drag shows no live preview until drop (no `onDragOver`). Pointer drag of dots tested only via press (jsdom has no layout); arrow keys and click placement tested.
8. Featured toggle is allowed on drafts; whether API rejects it is unknown.
9. Settings share image uploads with `kind=model` (only kinds are model/item); public-prefix key assumed by API.
10. CSS: `admin.module.css` is 203 lines (CSS only); border widths and mobile-preview width are literals (no tokens).

**Status:** DONE_WITH_CONCERNS
**Summary:** Login, protected shell, server-side outfit list, create, 3-pane editor (dnd, upload, click/drag anchors, live preview via LookbookLayout, publish blocking per item, Ctrl+S, unsaved guard), settings and users built. Typecheck, 82 web tests (35 new admin) and lint pass.
**Concerns/Blockers:** No `next build`, browser or live API run (P7); server-side pages untested; validation text translation relies on shared messages; upload progress indeterminate; server field-error key format assumed.
