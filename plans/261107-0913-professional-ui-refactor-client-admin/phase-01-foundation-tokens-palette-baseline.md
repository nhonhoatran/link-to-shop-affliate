# Phase 1: Foundation (token, palette, primitive, visual baseline)

## Context Links
- Thiết kế chốt: `plans/reports/brainstorm-261107-0913-professional-ui-refactor-client-admin.md`
- Research: `research/researcher-01-motion-animation-report.md` (Q3, Q6, Q7), `research/researcher-02-admin-dashboard-shell-report.md` (mục 1, 2)
- Code: `apps/web/src/styles/design-tokens.css` (99 dòng), `apps/web/src/app/globals.css` (44 dòng), `apps/web/src/app/layout.tsx`, `e2e/visual-reference-screenshots.spec.ts`
- Ma trận: `./file-ownership-matrix.md`

## Overview
- Priority: P1 (chặn mọi phase). Status: Done (2026-11-07). Commit bỏ theo quyết định chủ repo. Effort: 5h. Chạy tuần tự.
- Ghi checklist ui-consistency, chốt bảng màu client + admin (sáng/tối) có số tương phản, thêm token motion/breakpoint, primitive dùng chung (motion CSS, dialog hook, icon, `MotionProvider`), cài `lucide-react` + `motion`, chụp baseline lookbook **trước khi** UI đổi.
- Phase này **không đổi giao diện đang thấy**. Chỉ thêm token và file mới. Ngoại lệ có chủ đích: màu admin dời sang file theme, giá trị sáng giữ y như cũ trừ `--admin-border-strong` (sửa vì chưa đạt 3:1).

## Key Insights
- Lookbook dùng `--color-page`, `--color-ink`, `--color-muted`, `--color-line` (halo connector, nền vòng hotspot). **Không đổi các token này.** Màu client mới dùng tên riêng `--client-*`.
- CSS animation có `animation-fill-mode: both` sẽ **ghi đè** `opacity`/`transform` thường. Ví dụ: rule làm mờ `.root[data-active-id] .card:not([data-active])` sẽ mất tác dụng. Vì vậy primitive dùng `backwards`: chỉ áp trạng thái `from` lúc đang chờ delay, chạy xong thì trả lại style thường.
- `@media` không đọc được custom property. Token breakpoint chỉ để ghi tài liệu, component phải viết số cứng kèm comment (đúng kiểu đang làm với `--lookbook-compact-below`).
- `--admin-border-strong` #a8a29e trên nền trắng chỉ đạt 2.52:1, dưới mức 3:1 mà WCAG 1.4.11 yêu cầu cho viền input (tính bằng script node, công thức WCAG 2.x).
- `light-dark()`: MDN ghi Baseline 2024 "Newly available" (từ 05/2024). Hàm chọn màu theo `color-scheme` của phần tử nơi màu được dùng, nên một bộ token phục vụ được cả sáng lẫn tối, không phải lặp khối `system`. **Chưa thử trên trình duyệt thật**, bước 4 phải thử.
- Spec visual hiện chụp **cả trang** (dòng 27). Khi có header/footer thì ảnh sẽ khác. Đổi sang chụp phần tử `[data-lookbook]` ngay bây giờ, khi UI còn nguyên, để có baseline thật.
- **`motion` được giữ (chốt 2026-11-07).** Research 01 Q7: motion SSR xuất style của `initial` → nếu `initial={{ opacity: 0 }}` thì nội dung tàng hình khi không có JS. Luật cứng cho mọi phase: **không dùng `motion` cho trạng thái ẩn lúc tải trang** (vào trang, stagger món, reveal thẻ, vẽ đường chỉ vẫn là CSS). `motion` chỉ cho tương tác sau hydrate: header ẩn/hiện khi cuộn (P3), toast vào/ra + rail sidebar (P5). Phần tử SSR luôn ở trạng thái hiện; dùng `initial={false}` khi cần.
- `ui-consistency:finding-patterns` là skill của plugin đã cài (đã tìm thấy `skills/finding-patterns/SKILL.md` trong `~/.claude/plugins/synced/...`). Skill yêu cầu chạy trước task UI đầu tiên của plan.

## Requirements
- Functional:
  - Token motion: thời lượng, easing, stagger step, quãng dịch, thời lượng vẽ đường chỉ, fade chuyển trang.
  - Token tài liệu breakpoint: 640 (đã có), 768, 1024, 1440.
  - Token màu client (sáng). Token màu admin (sáng + tối) qua `light-dark()`, scope theo `[data-theme]`.
  - Primitive: `.fadeUp`, `.fadeIn` (stagger theo `--i`), `.revealOnScroll` (`@supports (animation-timeline: view())`).
  - Hook `useModalDialog`: `showModal`, đóng bằng Esc/backdrop, trả focus về nút mở.
  - `DecorativeIcon` bọc icon lucide, luôn có `aria-hidden="true"` và `focusable="false"`.
  - `lucide-react` ghim đúng `1.70.0`. `motion` ghim đúng `14.10.1`.
  - `MotionProvider` (client component): `LazyMotion features={domAnimation} strict` + `MotionConfig reducedMotion="user"`. Component dùng `m.*`, không dùng `motion.*` (strict sẽ báo lỗi).
  - Spec visual chụp `[data-lookbook]` bằng `toHaveScreenshot` + baseline commit.
- Non-functional:
  - Không có cuộn ngang, không đổi pixel lookbook, file < 200 dòng.
  - Mọi animation bị tắt khi `prefers-reduced-motion: reduce`. Nội dung vẫn hiện khi tắt JS.

## Architecture
```
globals.css
  @import design-tokens.css        (lookbook + spacing + motion + breakpoint doc + admin non-color)
  @import client-theme-tokens.css  (:root --client-*)
  @import admin-theme-tokens.css   (:root --admin-* = light-dark(light, dark); [data-theme] color-scheme)
styles/motion-primitives.module.css  -> P3, P4 import class
hooks/use-modal-dialog.ts            -> P5 admin drawer (client mobile hiện thẳng link, không dialog)
components/ui/decorative-icon.tsx    -> P3, P5
components/motion/motion-provider.tsx -> bọc trong root layout; P3, P5 dùng m.* / useScroll
```
Luồng theme admin (P5 dùng): `cookie admin-theme` → admin layout gắn `data-theme` lên wrapper → CSS đặt `color-scheme` → `light-dark()` chọn giá trị.

```css
/* admin-theme-tokens.css (sketch) */
:root {
  --admin-bg: light-dark(#f5f5f4, #0f1115);
  --admin-surface: light-dark(#ffffff, #171a21);
  /* ... */
}
[data-theme='light'] { color-scheme: light; }
[data-theme='dark'] { color-scheme: dark; }
[data-theme='system'] { color-scheme: light dark; }
```
Trang public không đặt `color-scheme` nên luôn ra màu sáng (MDN: chưa có scheme thì `light-dark()` lấy giá trị đầu).

```css
/* motion-primitives.module.css (sketch) */
.fadeUp {
  animation: fade-up var(--duration-slow) var(--easing-out) backwards;
  animation-delay: calc(var(--i, 0) * var(--stagger-step));
}
.fadeIn { animation: fade-in var(--duration-route) var(--easing-standard) backwards; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .revealOnScroll { animation: fade-up linear backwards; animation-timeline: view(); animation-range: entry 0% cover 30%; }
  }
}
@keyframes fade-up { from { opacity: 0; transform: translateY(var(--motion-distance)); } }
@keyframes fade-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .fadeUp, .fadeIn, .revealOnScroll { animation: none; } }
```
Lưu ý: hướng dẫn trong primitive: không gắn hai class animation lên cùng phần tử. Cuộn ngược thì scroll reveal chạy lùi lại (vì gắn theo vị trí cuộn), chấp nhận được.

## Bảng màu ứng viên (tính 2026-11-07, công thức WCAG 2.x, script node trong scratchpad)
Client (sáng):
| Token | Giá trị | Cặp kiểm | Tỉ lệ |
|---|---|---|---|
| `--client-bg` | #f6f1ea | chữ ink | 11.49 |
| `--client-surface` | #ffffff | chữ ink | 12.92 |
| `--client-surface-soft` | #ede4d8 | ink / muted | 10.26 / 5.03 |
| `--client-ink` | #3b2f2a | (chữ chính) | |
| `--client-ink-muted` | #6b5d54 | trên bg / surface | 5.63 / 6.33 |
| `--client-accent` | #8a5a3c | chữ trên bg / surface | 5.18 / 5.82 |
| `--client-on-ink` | #ffffff | chữ trên nút pill nền ink | 12.92 |
| `--client-border` | #e4d9cc | viền trang trí (không yêu cầu 3:1) | |
| `--client-focus` | #8a5a3c | vòng focus trên bg | 5.18 |

Admin (sáng / tối):
| Token | Sáng | Tối | Cặp kiểm: sáng / tối |
|---|---|---|---|
| `--admin-bg` | #f5f5f4 | #0f1115 | text 16.03 / 15.42 |
| `--admin-surface` | #ffffff | #171a21 | text 17.49(*) / 14.21 |
| `--admin-surface-2` | #fafaf9 | #1f232c | muted tối 6.18 |
| `--admin-text` | #1c1917 | #e6e8ee | |
| `--admin-text-muted` | #57534e | #9aa3b2 | trên surface 7.63 / 6.84 |
| `--admin-border` | #d6d3d1 | #2a2f3a | trang trí |
| `--admin-border-strong` | **#8a827c** (cũ #a8a29e = 2.52) | #6b7385 | UI 3:1: 3.77 / 3.66 |
| `--admin-primary` | #1c1917 | #e6e8ee | |
| `--admin-primary-contrast` | #ffffff | #0f1115 | 17.49 / 15.42 |
| `--admin-accent` | #4338ca | #8fa8ff | trên surface 7.90 / 7.64 |
| `--admin-focus` | #1d4ed8 | #8fa8ff | 6.70 / 7.64 |
| `--admin-danger` | #b91c1c | #f87171 | trên surface 6.47 / 6.29 |
| `--admin-danger-bg` | #fef2f2 | #3b1d1f | chữ danger 5.91 / 8.01 (#fca5a5) |
| `--admin-success` | #15803d | #4ade80 | 5.02 / 9.99 |
| `--admin-warning` / `-bg` | #b45309 / #fffbeb | #fcd34d / #3a2e12 | 4.84 / 9.22 |
| nút danger chữ/nền | #fff / #b91c1c | #0f1115 / #f87171 | 6.47 / 6.83 |

(*) tỉ lệ text trên nút primary. Tất cả cặp chữ ≥ 4.5, cặp UI ≥ 3. Đây là **ứng viên**. Phase này xem trước trên trình duyệt rồi chốt vào `design-palette-and-contrast.md`. Nếu có bộ nhận diện của bên nội dung (Kim) thì thay giá trị và tính lại.

## Related Code Files
- Modify: `apps/web/src/app/globals.css`, `apps/web/src/styles/design-tokens.css`, `apps/web/src/app/layout.tsx`, `apps/web/package.json`, `pnpm-lock.yaml`, `e2e/visual-reference-screenshots.spec.ts`
- Create: `apps/web/src/styles/client-theme-tokens.css`, `apps/web/src/styles/admin-theme-tokens.css`, `apps/web/src/styles/motion-primitives.module.css`, `apps/web/src/hooks/use-modal-dialog.ts`, `apps/web/test/hooks/use-modal-dialog.test.tsx`, `apps/web/src/components/ui/decorative-icon.tsx`, `apps/web/src/components/motion/motion-provider.tsx`, `e2e/visual-reference-screenshots.spec.ts-snapshots/*.png`, plan dir `ui-consistency-checklist.md`, `design-palette-and-contrast.md`
- Delete: không

## Implementation Steps
1. Gọi skill `ui-consistency:finding-patterns` (nhánh "refactor across pages"). Reference: client = lookbook `/look/[slug]`; admin = trang Cài đặt (đơn giản nhất, có form + panel + toolbar). Ghi checklist vào `ui-consistency-checklist.md` trong plan dir. P3/P5/P6 phải đọc file này trước khi code.
2. Bật stack (Mongo + RustFS trong WSL docker, rồi `pnpm dev` hoặc compose đầy đủ). Ghi rõ đang dùng `E2E_BASE_URL` nào. Baseline và mọi lần chạy sau phải dùng **cùng chế độ** (dev hay build).
3. Sửa `e2e/visual-reference-screenshots.spec.ts`:
   ```ts
   await expect(page.locator('[data-lookbook]')).toHaveScreenshot(`lookbook-${slug}-${width}.png`, {
     animations: 'disabled',
     maxDiffPixelRatio: 0.002,
   });
   ```
   Giữ `emulateMedia({ reducedMotion: 'reduce' })` và `waitForSettled`. Chạy `pnpm e2e --project visual --update-snapshots` trên UI **hiện tại**, rồi chạy lại không có cờ để xác nhận xanh. Commit snapshot.
4. Tạo `admin-theme-tokens.css`. Dời các token **màu** `--admin-*` khỏi `design-tokens.css`, viết lại bằng `light-dark()`. Giữ token không phải màu (radius, width, control height) ở chỗ cũ. `--admin-shadow` dùng `light-dark()` ở phần màu. Thử nhanh trên trình duyệt: một `div[data-theme=dark]` có nền tối, trang public vẫn sáng. Nếu `light-dark()` không chạy như mong đợi qua custom property → dùng phương án dự phòng (giữ token cũ, thêm khối `[data-theme='dark']` và `@media (prefers-color-scheme: dark) [data-theme='system']`) và báo lead.
5. Tạo `client-theme-tokens.css` (`--client-*`: bg, surface, surface-soft, ink, ink-muted, accent, on-ink, border, focus, radius-lg/pill, shadow-soft, header-height, card-hover-scale, container-max). P3 chỉ dùng token, không tự đặt số. Thiếu token thì báo lead để thêm vào file này. Import cả hai file mới trong `globals.css`. **Không** đổi nền `body` (P3 đặt nền be trên wrapper public).
6. `design-tokens.css`: chỉ thêm `--duration-slow`, `--duration-draw`, `--duration-route`, `--stagger-step`, `--easing-out`, `--motion-distance`, `--toast-duration`, và comment breakpoint (`--bp-md: 768px`, `--bp-lg: 1024px`, `--bp-xl: 1440px`). Giá trị lookbook giữ nguyên từng ký tự (kiểm bằng `git diff`).
7. `globals.css`: giữ nguyên rule reduced-motion. Thêm `scroll-padding-top: var(--client-header-height)` cho `html`, để header sticky không che anchor và phần tử đang focus. Không thêm class tiện ích global, mỗi module đã có `srOnly` riêng.
8. `pnpm --filter @under30ss/web add lucide-react@1.70.0 --save-exact`. Kiểm tên icon cần dùng có tồn tại: `node -e "const l=require('lucide-react');console.log(['LayoutDashboard','PanelLeftClose','PanelLeftOpen','Menu','X','Sun','Moon','Monitor','Users','Package','Settings','Plus','ChevronLeft','ChevronRight'].filter(n=>!l[n]))"` (research đã kiểm 10 tên đầu, 4 tên sau **chưa kiểm**).
9. `components/ui/decorative-icon.tsx`:
   ```tsx
   import type { LucideIcon } from 'lucide-react';
   export function DecorativeIcon({ icon: Icon, size = 20 }: { icon: LucideIcon; size?: number }) {
     return <Icon aria-hidden="true" focusable="false" size={size} />;
   }
   ```
   Kích thước icon lấy từ token khi dùng trong CSS (`width: var(--icon-size)`). `size` chỉ là giá trị mặc định cho thuộc tính SVG.
10. `hooks/use-modal-dialog.ts`: trả `{ dialogRef, openerRef, open(), close(), onDialogClick }`. Mở thì `showModal()`, nhớ opener. Đóng (`close` event) thì focus lại opener. Bấm backdrop (`e.target === dialog`) thì đóng. Viết test jsdom (jsdom có thể thiếu `showModal` → polyfill trong test bằng cách gán `HTMLDialogElement.prototype.showModal`).
11. `layout.tsx` gốc: thêm `export const viewport = { themeColor: <giá trị client-bg> }`. Giá trị lấy từ một hằng duy nhất. Vì metadata không đọc được CSS var, ghi rõ đây là ngoại lệ trong comment. Bọc `children` trong `<MotionProvider>`. Không đổi cấu trúc khác.
11b. `pnpm --filter @under30ss/web add motion@14.10.1 --save-exact`. Tạo `components/motion/motion-provider.tsx` (`'use client'`, import từ `motion/react`):
   ```tsx
   'use client';
   import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
   export function MotionProvider({ children }: { children: React.ReactNode }) {
     return <LazyMotion features={domAnimation} strict><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
   }
   ```
   Kiểm `pnpm --filter @under30ss/web build` chạy được (research 01 chưa kiểm bản build với Next 16). Ghi chênh lệch dung lượng First Load JS trước/sau vào `design-palette-and-contrast.md` mục cuối.
12. Ghi `design-palette-and-contrast.md`: bảng chốt + tỉ lệ + ảnh xem trước nếu có.
13. Chạy `pnpm lint && pnpm typecheck && pnpm test` và spec visual. Commit: `chore: add theme tokens, motion primitives and lookbook visual baseline`.

## Todo List
- [x] Checklist ui-consistency ghi vào plan dir (`ui-consistency-checklist.md`, đọc code 2026-11-07)
- [x] Spec visual chụp `[data-lookbook]` + baseline xanh 2 lần
- [x] `admin-theme-tokens.css` (light-dark đã thử, bị lightningcss hạ cấp hỏng, dùng phương án dự phòng; xem design-palette-and-contrast.md)
- [x] `client-theme-tokens.css`
- [x] Token motion + breakpoint doc (lookbook không đổi)
- [x] `motion-primitives.module.css`
- [x] `use-modal-dialog.ts` + test
- [x] `decorative-icon.tsx`
- [x] `lucide-react@1.70.0` exact + kiểm tên icon
- [x] `motion@14.10.1` exact + `MotionProvider` trong root layout + build xanh
- [x] `design-palette-and-contrast.md`
- [x] lint, typecheck, test xanh
- [ ] Đo First Load JS delta của `motion`: chưa đo (Next 16 không in bảng, xem `design-palette-and-contrast.md` mục cuối). Follow-up
- [ ] Commit `chore: add theme tokens, motion primitives and lookbook visual baseline`: bỏ theo quyết định chủ repo

## Success Criteria
- `git diff apps/web/src/styles/design-tokens.css` không có dòng `--lookbook-*` hoặc `--color-*` nào bị đổi.
- `pnpm e2e --project visual` xanh với snapshot vừa tạo (4 ảnh: 2 slug × 1440/390).
- `apps/web/package.json` có `"lucide-react": "1.70.0"` (không có `^`).
- Mọi cặp màu trong bảng chốt: chữ ≥ 4.5:1, thành phần UI ≥ 3:1.
- Trang `/`, `/look/dramatic`, `/admin` nhìn y như trước (so mắt + spec visual).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| `light-dark()` qua custom property không chạy như mong đợi | Thấp × Cao | Thử ở bước 4. Có phương án dự phòng đã viết sẵn |
| Snapshot lệch giữa dev và build, hoặc giữa các máy | Trung bình × Trung bình | Chụp và chạy cùng chế độ, cùng máy. Ghi chế độ vào checklist. Snapshot có hậu tố `win32`. Máy khác phải chụp lại baseline từ commit trước P3 |
| Đổi `--admin-border-strong` làm admin khác đi chút | Chắc chắn × Thấp | Có chủ đích (sửa tương phản). Ghi vào changelog ở P7 |
| Dời token màu admin làm sót token | Thấp × Trung bình | `grep -rn "var(--admin-" apps/web/src` đối chiếu danh sách token sau khi dời |

## Security Considerations
- Chỉ thêm dependency `lucide-react` (đã kiểm peer `^19`). Ghim exact, lockfile commit.
- Không có dữ liệu người dùng.

## Rollback
- Revert commit phase. Snapshot và token mới bị gỡ cùng. Các phase sau chưa bắt đầu nên không ảnh hưởng dây chuyền.

## Next Steps
- Mở khoá P2 và P4 (song song). P3, P5, P6 đọc `ui-consistency-checklist.md` và `design-palette-and-contrast.md` trước khi code.
