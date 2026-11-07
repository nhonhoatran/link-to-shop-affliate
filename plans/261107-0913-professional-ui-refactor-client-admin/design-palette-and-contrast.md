# Bảng màu chốt và tương phản (Phase 1)

Tính 2026-11-07, công thức WCAG 2.x (script node). Chữ cần >= 4.5:1, thành phần UI (viền input, focus) cần >= 3:1.
Token nằm ở `apps/web/src/styles/client-theme-tokens.css` và `admin-theme-tokens.css`.

## Client (sáng)
| Cặp | Màu | Tỉ lệ |
|---|---|---|
| ink / bg | #3b2f2a / #f6f1ea | 11.49 |
| ink / surface | #3b2f2a / #ffffff | 12.92 |
| ink / surface-soft | #3b2f2a / #ede4d8 | 10.26 |
| ink-muted / bg | #6b5d54 / #f6f1ea | 5.63 |
| ink-muted / surface | #6b5d54 / #ffffff | 6.33 |
| ink-muted / surface-soft | #6b5d54 / #ede4d8 | 5.03 |
| accent / bg | #8a5a3c / #f6f1ea | 5.18 |
| accent / surface | #8a5a3c / #ffffff | 5.82 |
| on-ink / ink (chữ nút pill) | #ffffff / #3b2f2a | 12.92 |
| focus / bg | #8a5a3c / #f6f1ea | 5.18 |

`--client-border` #e4d9cc chỉ là viền trang trí (không cần 3:1). Token `--color-*` và `--lookbook-*` của lookbook giữ nguyên.

## Admin (sáng / tối)
| Cặp | Sáng | Tối |
|---|---|---|
| text / bg | 16.03 | 15.42 |
| text / surface | 17.49 | 14.21 |
| text-muted / surface | 7.63 | 6.84 |
| text-muted / surface-2 (tối) | | 6.18 |
| text-muted / bg | 6.99 | 7.43 |
| border-strong / surface (UI 3:1) | 3.77 | 3.66 |
| border-strong / bg (UI 3:1) | 3.46 | |
| primary-contrast / primary | 18.88 | 15.42 |
| accent / surface | 7.90 | 7.64 |
| focus / surface | 6.70 | 7.64 |
| danger / surface | 6.47 | 6.29 |
| danger-text / danger-bg | 5.91 | 8.01 |
| success / surface | 5.02 | 9.99 |
| warning / warning-bg | 4.84 | 9.22 |
| nút danger (chữ / nền) | 6.47 | 6.83 |

Giá trị sáng giữ như cũ, trừ `--admin-border-strong` #a8a29e (2.52:1, không đạt) đổi thành #8a827c. `--admin-primary` sáng giữ #111111 (bảng ứng viên ghi #1c1917, nhưng giá trị cũ trong code là #111111). Token mới thêm: `--admin-surface-2`, `--admin-accent`, `--admin-focus`, `--admin-danger-text`, `--admin-danger-contrast`.

## Kết quả thử `light-dark()` (bước 4)
- Chrome 156 (Playwright): `CSS.supports('color','light-dark(red,blue)')` = true, nhưng **không dùng được qua custom property trong Next 16**.
- Nguyên nhân (đã kiểm CSS mà dev server phục vụ): Turbopack/lightningcss hạ cấp `light-dark()` thành `var(--lightningcss-light, A) var(--lightningcss-dark, B)`. Toggle chỉ được đặt trên `[data-theme]`, nhưng token khai trên `:root` nên giá trị bị tính tại `:root` (kết quả hai giá trị liền nhau, màu không hợp lệ). Đo trên trang thật: `--admin-bg` ra `rgba(0,0,0,0)`.
- **Dùng phương án dự phòng đã ghi trong plan:** giá trị sáng ở `:root`, khối dark lặp 2 lần (`[data-theme='dark']` và `@media (prefers-color-scheme: dark) [data-theme='system']`). Đo lại trên trình duyệt: không có `data-theme` / `light` ra sáng; `dark` ra `rgb(15,17,21)`; `system` theo `prefers-color-scheme` (sáng ra sáng, tối ra tối); trang public không bị ảnh hưởng.
- Khi sửa màu admin phải sửa cả hai khối dark trong `admin-theme-tokens.css`.

## Visual baseline
- Spec `e2e/visual-reference-screenshots.spec.ts` chụp `[data-lookbook]` (4 ảnh: dramatic, mesh-84 x 1440, 390), `maxDiffPixelRatio: 0.002`, `reducedMotion: reduce`.
- Chế độ: **`next dev`**, `E2E_BASE_URL=http://localhost:3000`, máy Windows (hậu tố `win32`, project `visual`). Mọi lần chạy sau phải dùng cùng chế độ và máy: `E2E_BASE_URL=http://localhost:3000 pnpm e2e --project visual`.
- Lần chụp đầu xanh 3 lần liên tiếp trên UI nguyên bản. Lần chạy sau bị lệch ảnh `mesh-84-390` vì badge dev của Next.js (`nextjs-portal`, cố định góc trái dưới, có hiệu ứng) lọt vào ảnh. Đã xoá `nextjs-portal` trong `waitForSettled` rồi chụp lại baseline; sau đó xanh 4 lần liên tiếp. Thay đổi giữa hai lần chụp chỉ là token/file mới, không đụng lookbook.

## Dependency và dung lượng
- `lucide-react@1.70.0`, `motion@14.10.1` ghim exact. Đủ 14 tên icon trong bước 8 đều tồn tại.
- `pnpm install` thêm mục `minimumReleaseAgeExclude` vào `pnpm-workspace.yaml` (lucide-react, motion, framer-motion, motion-dom) vì chính sách tuổi phát hành của pnpm; file này không thuộc ma trận Phase 1.
- `pnpm --filter @under30ss/web build` chạy xanh (Next 16.4.5 Turbopack). Next 16 không in bảng First Load JS nên **chưa đo được chênh lệch**: lệnh đo đọc thư mục build bị hook scout-block chặn. Cần đo thì mở quyền cho thư mục build hoặc đo tay: tổng gzip `static/**/*.js` có/không `MotionProvider`.
