# Research 02: admin dashboard shell (Next 16.4.5 / React 19.3 / CSS Modules / lucide-react 1.70.0)

Ghi lại từ báo cáo của researcher (agent không được phép ghi file). Đã bổ sung kiểm chứng codebase ở cuối.

## Đã kiểm chứng
- npm: `next` 16.4.5, `react` 19.3.1, `lucide-react` 1.70.0 tồn tại. lucide export `LayoutDashboard, PanelLeftClose, PanelLeftOpen, Menu, X, Sun, Moon, Monitor, Users, Package`.
- lucide-react `Icon.mjs` KHÔNG tự thêm `aria-hidden` → luôn truyền `aria-hidden="true"`.
- nextjs.org `cookies` (2026-11-06): async. Đọc được trong Server Component. Set/delete chỉ trong Server Function hoặc Route Handler. Không bật Cache Components → `cookies()` trong layout làm route dynamic.
- nextjs.org `loading.js`: chỉ bọc page + layout con, KHÔNG bọc layout cùng cấp. Layout đọc cookie → không có fallback cho layout đó.
- MDN `<dialog>` + `showModal()`: nền inert, focus vào trong, Esc đóng, top layer. Baseline từ 2022-03. Không dựa vào `closedby`.
- WAI-ARIA APG tabs: tablist/tab/tabpanel, `aria-selected`, `aria-controls`, `aria-labelledby`. Mũi tên trái/phải xoay vòng, Home/End.
- Contrast (công thức WCAG 2.x):

| Cặp | Tỉ lệ | AA (4.5) |
|---|---|---|
| #e6e8ee / #0f1115 | 15.42 | đạt |
| #9aa3b2 / #171a21 | 6.84 | đạt |
| #7d8594 / #171a21 | 4.69 | sát ngưỡng |
| #64748b / #ffffff | 4.76 | sát ngưỡng |

Chưa tính: accent, danger, border. UI không phải chữ cần 3:1.

## 1. Dark mode không nháy, 3 trạng thái, chỉ admin
Chọn: cookie `admin-theme` (`light|dark|system`) đọc ở admin layout, gắn `data-theme` lên wrapper `.shell` (không gắn `<html>` → public không bị ảnh hưởng). Setter = Server Action, validate input, cookie `httpOnly`, `path: '/admin'`, `sameSite: 'lax'`, `secure` ở prod.

```css
.shell { color-scheme: light; /* light tokens */ }
.shell[data-theme='dark'] { color-scheme: dark; /* dark tokens */ }
@media (prefers-color-scheme: dark) {
  .shell[data-theme='system'] { color-scheme: dark; /* lặp lại dark tokens */ }
}
```
- Đổi lại: lặp ~20 dòng token dark cho `system`. `light-dark()` có thể bỏ lặp, chưa kiểm baseline.
- Nền `html/body` ngoài `.shell` không đổi màu → `.shell` phải `min-height: 100dvh`.

## 2. Token
- Token ngữ nghĩa `--admin-*` khai trên `.shell`, không hex trong component.
- Muted text dễ rớt AA nhất → kiểm trước.

## 3. Sidebar + drawer
- Trạng thái thu gọn: cookie `admin-sidebar=rail|expanded`, đọc ở layout. localStorage sẽ nháy.
- Breakpoint CSS: ≥1024 sidebar đầy/rail theo cookie; 768–1023 ép rail; <768 ẩn sidebar, hiện topbar + nút mở drawer.
- Drawer: `<dialog>` + `showModal()`, trả focus về nút mở khi đóng (tự làm). Click backdrop đóng (`e.target === dialog`, padding 0).
- Rail chỉ icon: `aria-label` khi thu gọn, tooltip CSS `data-tip`. Không đặt `aria-label` khi mở rộng (WCAG 2.5.3). `aria-current="page"`.
- Một component `NavLinks` dùng cho cả sidebar và drawer.

## 4. Bảng → thẻ trên mobile
Một markup, `td[data-label]` + `::before` ở <768px. Đổi `display` có thể mất ngữ nghĩa bảng ở một số screen reader → thêm `role="table|row|cell"` nếu cần. Lọc/phân trang giữ GET form server-side.

## 5. Toast + skeleton
- 2 live region luôn mount: `role="status"` (thành công, tự ẩn) và `role="alert"` (lỗi, giữ tới khi đóng). Không cần thư viện.
- `loading.tsx` per segment page, có `aria-busy`. Tắt shimmer khi reduced-motion.

## 6. Editor: tab mobile → 2 cột desktop
- Giữ mọi panel mount, ẩn bằng `hidden`; desktop ≥1024: ẩn tablist, `.panel[hidden]{display:block}`, grid 2 cột.
- Field `required` trong panel ẩn → validate native lỗi im lặng. Dùng `noValidate` + validate phía app, hiện lỗi theo tab (đánh dấu tab có lỗi).

## 7. KPI cards
`grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr))`. Container query (`container-type: inline-size`) cho bên trong thẻ (baseline chưa kiểm lại lần này).

## Kiểm chứng codebase (bổ sung)
- `apps/web/next.config.ts`: không bật Cache Components (chỉ `images.unoptimized`). → đọc cookie trong layout không cần Suspense.
- `app/admin/(protected)/layout.tsx` đã gọi `getCurrentAdmin()` (session) → layout đã dynamic, đọc thêm cookie không tốn thêm.

## Câu hỏi mở
- Giữ `system` (3 trạng thái, lặp token) hay 2 trạng thái? Đề xuất giữ 3, mặc định `system`.
- Bảng màu accent/danger/border dark: phải chạy kiểm contrast trước khi chốt.
