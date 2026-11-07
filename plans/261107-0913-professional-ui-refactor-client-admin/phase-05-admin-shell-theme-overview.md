# Phase 5: Admin shell, dark mode, trang Tổng quan

## Context Links
- Brainstorm mục "Thiết kế admin". Research 02 (toàn bộ). Checklist `./ui-consistency-checklist.md`, bảng màu `./design-palette-and-contrast.md`.
- Code đã đọc: `apps/web/src/app/admin/layout.tsx` (`.root`), `app/admin/(protected)/layout.tsx` (header ngang, `getCurrentAdmin` + `getAdminSettings`), `(protected)/page.tsx` (list outfit hiện tại), `app/admin/login/page.tsx`, `app/admin/_lib/admin-api.ts`, `lib/admin-paths.ts` (chỉ có `LOGIN_PATH`), `components/admin/admin.module.css` (166 dòng, được 27 file import), `admin-nav.tsx`, `logout-button.tsx`, `save-status-text.tsx`; test `apps/web/test/app/protected-layout.test.tsx`, `admin-list-page.test.tsx`; `e2e/support/admin-helpers.ts` (chờ URL `/admin` sau khi đăng nhập).
- `apps/web/next.config.ts`: không bật Cache Components (đã kiểm).

## Overview
- Priority: P1. Status: Done (2026-11-07). Effort: 10h. Nhóm song song B, bước 1. Chạy sau P2. P6 chạy sau phase này.
- Khung: sidebar (đầy / rail) + topbar + drawer mobile. Dark mode 3 trạng thái qua cookie. Sidebar nhớ trạng thái qua cookie. Toast region. Skeleton dùng chung. Trang `/admin` thành Tổng quan. List chuyển sang `/admin/outfits`. URL list cũ `/admin?...` redirect sang. Làm mới trang đăng nhập.

## Key Insights
- `admin.module.css` được 27 file import (grep). **Giữ nguyên tên class dùng chung** (`btn`, `btnPrimary`, `btnSecondary`, `btnDanger`, `btnToggle`, `btnGroup`, `panel`, `panelHeader`, `panelTitle`, `title`, `toolbar`, `container`, `narrow`, `stack`, `hint`, `srOnly`). Chỉ dời class của khung (`header`, `siteName`, `nav`, `navLink`, `main`, `root`) sang `shell/*.module.css`. Nhờ vậy P6 không phải đổi import nào.
- Theme đặt ở `app/admin/layout.tsx` (layout gốc admin), để trang login cũng theo theme. Đọc cookie ở đây làm `/admin/login` thành dynamic. Chấp nhận được, trang login không cần tĩnh.
- `data-theme` gắn lên wrapper admin, **không** gắn lên `<html>`, nên public không bị ảnh hưởng. Token màu dùng `light-dark()` (P1). Wrapper đặt `min-height: 100dvh` và nền `--admin-bg`.
- Cookie chỉ set được trong Server Function hoặc Route Handler (research 02, Next docs `cookies`). Setter là Server Action, nhận `FormData`, nên không có JS vẫn chạy (form submit). Sau khi set gọi `revalidatePath('/admin', 'layout')` để layout render lại với cookie mới. Next có tự render lại khi set cookie trong action hay không: **chưa kiểm**, gọi thêm `revalidatePath` thì chắc ăn.
- `secure` của cookie: compose dev chạy web ở `NODE_ENV=production` qua HTTP :8080. Vì vậy **không** suy `secure` từ `NODE_ENV`, mà suy từ header `x-forwarded-proto === 'https'` (Caddy có gửi header này: **chưa kiểm** trong Caddyfile, bước 2 kiểm).
- `loading.tsx` không bọc layout cùng cấp. Layout đọc cookie + session, không có fallback riêng. Chấp nhận, vì phần chậm là page.
- Toast: hai live region luôn mount (`role="status"` cho thành công, tự ẩn; `role="alert"` cho lỗi, giữ tới khi đóng). `useAdminToast()` trả no-op khi không có provider, để test của P6 render component mà không phải bọc provider.
- e2e chờ chữ chính xác `'Đã lưu'` (`admin-outfit-flow.spec.ts`). Toast phải dùng chữ khác (vd "Đã lưu outfit"), nếu không `getByText` khớp 2 phần tử và rớt ở strict mode.
- Redirect URL cũ: `/admin?q=&status=&page=` → `/admin/outfits?...`. Form lọc cũ (`action="/admin"`) và link phân trang cũ vẫn chạy nhờ redirect này, kể cả trước khi P6 sửa chúng. Không đứt đoạn giữa P5 và P6.
- Rail chỉ icon: link có `aria-label` + tooltip CSS (`data-tip`). Khi mở rộng thì **bỏ** `aria-label` vì chữ đã hiện, tránh lệch tên (WCAG 2.5.3). Link đang mở có `aria-current="page"`.

## Requirements
- Functional:
  - Breakpoint: ≥1024 sidebar đầy hoặc rail theo cookie `admin-sidebar` (`expanded|rail`, mặc định `expanded`). 768–1023: ép rail. <768: ẩn sidebar, topbar có ☰ mở drawer `<dialog>` (dùng `useModalDialog` của P1).
  - Nav (một component cho sidebar, rail và drawer): Tổng quan `/admin` (`LayoutDashboard`), Outfit `/admin/outfits` (`Package`), Cài đặt `/admin/settings` (`Settings`), Quản trị viên `/admin/users` (`Users`). Tổng quan khớp đúng `/admin`, mục khác khớp theo tiền tố.
  - Chân sidebar: email, nút đăng xuất, chọn theme (3 nút Sáng / Tối / Theo hệ thống, icon `Sun`/`Moon`/`Monitor`, `aria-pressed`). Nút thu gọn (`PanelLeftClose`/`PanelLeftOpen`).
  - Theme: cookie `admin-theme` (`light|dark|system`, mặc định `system`), `httpOnly`, `sameSite: 'lax'`, `path: '/admin'`, `maxAge` 1 năm (hằng kỹ thuật, ghi lý do).
  - `/admin` Tổng quan: CTA "Tạo outfit" → `/admin/outfits/new`. 4 thẻ KPI: Tổng outfit → `/admin/outfits`; Đã đăng → `?status=published`; Bản nháp → `?status=draft`; Thiếu link affiliate: chỉ hiện số + gợi ý, có thêm số nháp thiếu link (Decision 11). Thẻ outfit nổi bật (ảnh + "Sửa", rỗng thì có lời nhắc). Danh sách 5 outfit sửa gần nhất (tên, trạng thái, ngày, link sửa).
  - `/admin/outfits`: nội dung list cũ, chuyển nguyên sang.
  - Redirect: `/admin` có bất kỳ khoá `q`, `status`, `page` → `redirect('/admin/outfits?' + giữ nguyên query)`.
  - `ADMIN_PATHS` trong `lib/admin-paths.ts`: `overview`, `outfits`, `outfitNew`, `outfitEdit(id)`, `settings`, `users`, `login` (giữ export `LOGIN_PATH`).
  - Skeleton dùng chung (`AdminSkeleton`: dòng, thẻ, bảng) + `(protected)/loading.tsx` cho Tổng quan.
  - Login: khung giữa màn hình, tên site, theo theme. **Không** sửa `login-form.tsx`.
- Non-functional: Server Component mặc định. Client chỉ cho nav active, drawer, toast. Không nháy theme lúc tải (theme được render sẵn từ server). Tương phản theo bảng P1. Tap target ≥ 44px. File < 200 dòng.

## Architecture
```
app/admin/layout.tsx (server, async)
  theme = readAdminTheme(await cookies())            // zod enum, mặc định 'system'
  <div className={shell.themeRoot} data-theme={theme}>{children}</div>

app/admin/(protected)/layout.tsx (server)
  [admin, settings] = Promise.all(getCurrentAdmin, getAdminSettings)
  sidebar = readSidebarState(await cookies())
  <AdminToastProvider>
    <div className={shell.frame} data-sidebar={sidebar}>
      <a skip-link href="#admin-main"/>
      <AdminSidebar siteName email theme sidebar/>   // aside: AdminNav + footer (theme, logout, toggle)
      <AdminTopbar siteName/>                         // header (banner), chỉ hiện <768: ☰ -> AdminNavDrawer
      <main id="admin-main">{children}</main>
    </div>
  </AdminToastProvider>
```
```ts
// app/admin/_lib/admin-preference-actions.ts (sketch)
'use server';
export async function setAdminTheme(formData: FormData): Promise<void> {
  const parsed = adminThemeSchema.safeParse(formData.get('theme'));
  if (!parsed.success) return;
  const store = await cookies();
  store.set(ADMIN_THEME_COOKIE, parsed.data, await preferenceCookieOptions());
  revalidatePath('/admin', 'layout');
}
// preferenceCookieOptions: { httpOnly: true, sameSite: 'lax', path: '/admin', maxAge: PREFERENCE_MAX_AGE_SECONDS,
//   secure: (await headers()).get('x-forwarded-proto') === 'https' }
```
Theme toggle: `<form action={setAdminTheme}>` với 3 `<button name="theme" value="...">`. Sidebar toggle: tương tự, `name="sidebar"`.

Data flow Tổng quan: `getAdminStats()` (P2) → `OverviewKpiGrid` (`grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr))`), `OverviewFeaturedCard`, `OverviewRecentList`.

CSS khung: `.frame { display: grid; grid-template-columns: var(--admin-sidebar-width) 1fr; }`, `[data-sidebar='rail']` → `var(--admin-rail-width)`. `@media (max-width: 1023.98px)` ép rail. `@media (max-width: 767.98px)` một cột, ẩn aside. Sidebar `position: sticky; top: 0; height: 100dvh`. Token width/rail lấy từ P1 (nếu chưa có thì thêm token cục bộ trong `admin-shell.module.css`, chỉ là kích thước bố cục).

## Related Code Files
- Modify: `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/(protected)/layout.tsx`, `apps/web/src/app/admin/(protected)/page.tsx`, `apps/web/src/app/admin/login/page.tsx`, `apps/web/src/lib/admin-paths.ts`, `apps/web/src/components/admin/admin.module.css`, `apps/web/src/components/admin/admin-nav.tsx`, `apps/web/src/components/admin/logout-button.tsx`, `apps/web/test/app/protected-layout.test.tsx`, `apps/web/test/app/admin-list-page.test.tsx`
- Create:
  - `apps/web/src/app/admin/(protected)/outfits/page.tsx`, `apps/web/src/app/admin/(protected)/loading.tsx`, `apps/web/src/app/admin/login/login-page.module.css`
  - `apps/web/src/app/admin/_lib/admin-preferences.ts` (tên cookie, schema zod, hàm đọc), `apps/web/src/app/admin/_lib/admin-preference-actions.ts`
  - `apps/web/src/components/admin/shell/`: `admin-shell.module.css`, `admin-sidebar.tsx`, `admin-sidebar.module.css`, `admin-sidebar-toggle.tsx`, `admin-topbar.tsx`, `admin-nav-drawer.tsx`, `admin-theme-toggle.tsx`, `admin-toast-provider.tsx`, `use-admin-toast.ts`, `admin-toast.module.css`, `admin-skeleton.tsx`, `admin-skeleton.module.css`
  - `apps/web/src/components/admin/overview/`: `overview-kpi-grid.tsx`, `overview-featured-card.tsx`, `overview-recent-list.tsx`, `overview.module.css`
  - Test: `apps/web/test/app/admin-overview-page.test.tsx`, `apps/web/test/admin/admin-preference-actions.test.ts`, `apps/web/test/admin/admin-toast.test.tsx`, `apps/web/test/admin/admin-nav.test.tsx`
- Delete: không (class khung trong `admin.module.css` được dời đi, không xoá file)
- Không sửa: `login-form.tsx`, `outfit-list-*.tsx`, `pagination-links.tsx`, `admin-list.module.css` (P6)

## Implementation Steps
1. Đọc checklist + bảng màu. `infra/caddy/Caddyfile` dùng `reverse_proxy web:3000` trần, không có `header_up` (đã đọc). Theo tài liệu Caddy, `reverse_proxy` mặc định gửi `X-Forwarded-Proto` và giữ `Host`, nhưng điều này **chưa kiểm thực tế**. Kiểm bằng cách log tạm header trong action khi chạy qua :8080. Chạy `pnpm dev` không qua Caddy thì không có header → `secure=false`, đúng cho `http://localhost:3000`. Nếu header không tới thì báo lead (phương án: env `ADMIN_PREF_COOKIE_SECURE` trong `web-env.ts`, file đó không thuộc phase nào).
2. `admin-paths.ts`: `ADMIN_PATHS`. `admin-preferences.ts`: `ADMIN_THEME_COOKIE='admin-theme'`, `ADMIN_SIDEBAR_COOKIE='admin-sidebar'`, `adminThemeSchema`, `sidebarStateSchema`, `readAdminTheme(store)`, `readSidebarState(store)`.
3. `admin-preference-actions.ts` (`'use server'`): `setAdminTheme`, `setSidebarState`. Test bằng cách mock `next/headers` (`cookies().set` spy). Kiểm: giá trị lạ bị bỏ qua, có đủ tuỳ chọn cookie.
4. `git mv "(protected)/page.tsx" "(protected)/outfits/page.tsx"` (giữ nguyên logic, chỉ sửa đường dẫn import tương đối `../_lib` → `../../_lib`). Sửa import trong `admin-list-page.test.tsx`. Chạy test xanh rồi mới tạo `(protected)/page.tsx` mới.
5. Viết lại `(protected)/page.tsx` thành Tổng quan + redirect:
   ```ts
   const raw = await searchParams;
   if (['q', 'status', 'page'].some((key) => key in raw)) redirect(`${ADMIN_PATHS.outfits}?${toSearch(raw)}`);
   ```
   Rồi gọi `getAdminStats()` và render 3 khối.
6. `admin.module.css`: dời class khung đi. Làm mới class dùng chung theo token: nút bo `--admin-radius`, focus ring `--admin-focus`, panel shadow theo theme, `.title` theo thang chữ admin. Giữ đúng tên class.
7. Shell: `admin-shell.module.css` (`themeRoot`: `min-height: 100dvh; background; color; --color-focus: var(--admin-focus)`), sidebar, rail, topbar, drawer, toggle. `AdminNav` nhận prop `variant: 'sidebar' | 'drawer'` và `collapsed`. Icon qua `DecorativeIcon`. Drawer đóng khi `usePathname()` đổi.
8. Toast: provider giữ hàng đợi `{ id, tone, text }`. Success tự ẩn sau `--toast-duration` (đọc token qua `getComputedStyle` khi mount). Error có nút đóng (`X`). Animation vào/ra dùng `motion` (chốt giữ 2026-11-07): `AnimatePresence` + `m.p` (opacity/transform), không cần CSS keyframes riêng. Hai live region là phần tử thường luôn mount, chỉ phần tử toast con là `m.*`. Reduced-motion do `MotionConfig` (P1) lo. Rail sidebar: đổi bề rộng bằng CSS `transition: width` (bố cục do cookie quyết từ server, không dùng `motion` cho trạng thái lúc tải).
9. `AdminSkeleton` + `(protected)/loading.tsx` (`aria-busy="true"`, `aria-label="Đang tải"`). Shimmer tắt khi reduced-motion.
10. Login page: `login-page.module.css` (card giữa màn hình, nền `--admin-bg`). Tên site lấy bằng `getPublicSettings()`, vì lúc chưa đăng nhập không gọi được `getAdminSettings` (cần session). `LoginForm` giữ nguyên.
11. Sửa `protected-layout.test.tsx` cho cấu trúc mới (nav "Quản trị", email, nút đăng xuất, `main`, nút theme có `aria-pressed`). Mock `next/headers` `cookies`. Thêm test nav (active đúng mục, rail có `aria-label`), toast (2 region luôn có trong DOM, success biến mất, alert còn lại), Tổng quan (số liệu, featured null, redirect khi có query cũ).
12. Kiểm tay: 1440 (đầy ↔ rail, reload vẫn nhớ), 1024, 900 (ép rail), 390 (topbar + drawer, Esc đóng, focus trả về ☰), tắt JS (đổi theme bằng submit form vẫn chạy), OS dark + `system`, contrast bằng DevTools.
13. `pnpm lint && pnpm typecheck && pnpm test`. Commit: `feat: add admin sidebar shell, theme preference and overview page`.

## Todo List
- [x] Kiểm `X-Forwarded-Proto` ở Caddy
- [x] ADMIN_PATHS + preferences + actions + test
- [x] Chuyển list sang `/admin/outfits`, test xanh
- [x] Tổng quan + redirect URL cũ + test
- [x] Dời class khung, làm mới class dùng chung (giữ tên)
- [x] Sidebar / rail / topbar / drawer / nav
- [x] Theme toggle + sidebar toggle (form + Server Action)
- [x] Toast provider + hook no-op + test
- [x] Skeleton + loading Tổng quan
- [x] Login restyle (không đụng login-form)
- [x] Kiểm tay 5 viewport, dark/light/system, no-JS
- [ ] Commit `feat: add admin sidebar shell, theme preference and overview page`: bỏ theo quyết định chủ repo

## Success Criteria
- `/admin/login` → đăng nhập → URL `/admin` (Tổng quan). `e2e/support/admin-helpers.ts` vẫn chạy không cần sửa.
- `/admin?status=draft` → 307 sang `/admin/outfits?status=draft`.
- Reload với cookie `admin-theme=dark` → HTML server trả về đã có `data-theme="dark"` (không nháy).
- Không có cuộn ngang ở 320px trên `/admin`, `/admin/outfits`.
- `grep -rn "styles.header\|styles.navLink\|styles.siteName" apps/web/src` không còn kết quả. 27 file đang import `admin.module.css` vẫn build được.
- Test unit cũ và mới xanh.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Server Action set cookie nhưng UI không cập nhật | Thấp × Trung bình | `revalidatePath('/admin', 'layout')`. e2e P7 kiểm |
| `secure` sai làm cookie không lưu trên HTTP LAN | Trung bình × Thấp | Suy từ `x-forwarded-proto`. Bước 1 kiểm |
| Đổi class dùng chung làm vỡ màn hình P6 trước khi P6 làm | Trung bình × Trung bình | Giữ tên. Chỉ đổi giá trị trực quan. Kiểm tay editor/settings/users sau bước 6 |
| Toast trùng chữ với `SaveStatusText` | Trung bình × Trung bình | Chữ toast khác ("Đã lưu outfit"). e2e P7 chạy lại flow |
| Layout đọc thêm cookie | Thấp × Thấp | Layout đã dynamic vì có session, không tốn thêm |

## Security Considerations
- Server Action là endpoint công khai: dùng zod enum để kiểm input, sai thì bỏ qua. Cookie chỉ chứa giá trị hiển thị, `httpOnly`, `path=/admin`. Next có sẵn kiểm Origin/Host cho Server Action. Caddy giữ `Host` nên kiểm này vẫn đúng: **chưa kiểm** qua Caddy, P7 có e2e qua :8080.
- Không có quyền nào phụ thuộc cookie theme/sidebar. Auth vẫn do API (`getCurrentAdmin`).
- Stats lấy qua `adminGet` (forward cookie session), lỗi 401 thì về trang login như hiện nay.

## Rollback
- Revert commit. `/admin` lại là list. Cookie `admin-theme`/`admin-sidebar` còn trong trình duyệt nhưng không ai đọc, vô hại. P6 phải revert trước nếu đã merge.

## Next Steps
- P6: list/editor/settings/users dùng `ADMIN_PATHS`, `useAdminToast`, `AdminSkeleton`. P7: e2e theme, drawer, rail, redirect.
