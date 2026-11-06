# Phase 04 — Lookbook UI components

## Context Links
- [plan.md](./plan.md) · [phase-01 tokens + fixture](./phase-01-foundation-and-contracts.md) · ảnh mẫu `assets-source/lookbook-samples/`

## Overview
- Priority: P1 · Status: Done — chờ kiểm visual 320/390px và độ cong connector ở P7 · Effort: 7h · Wave 2 (song song P2, P3) · blockedBy: P1 · blocks: P5, P6
- Bộ component trình bày lookbook, nhận `PublicOutfitDto` qua props, **không fetch**. P5 dùng cho trang public, P6 dùng làm preview admin.

## File Ownership
- `apps/web/src/components/lookbook/**`, `apps/web/test/lookbook/**`
- Chỉ đọc: `packages/shared/**`, `apps/web/src/styles/**`

## Public API (P5, P6 phụ thuộc — giữ đúng chữ ký)
```ts
// apps/web/src/components/lookbook/index.ts
export function LookbookLayout(props: { outfit: PublicOutfitDto; headingLevel?: 'h1' | 'h2' }): JSX.Element;
```
- Server Component được (chỉ phần tương tác là client con bên trong).
- P6 truyền outfit đang sửa (đã map sang `PublicOutfitDto`, link rỗng render `href="#"` + `aria-disabled`).

## Key Insights
- Nội dung (chữ, ảnh, link) render server; chỉ đường chỉ + hover là client → không JS vẫn đọc/bấm được.
- Vị trí món phụ thuộc chiều cao chữ → đường chỉ tính từ DOM thật.
- 375px: scale ảnh mẫu ~0.4 → chữ ~7px; giải pháp: giữ 3 cột, font clamp min ~11px, mô tả line-clamp 1, ẩn ở màn rất nhỏ (ngưỡng = CSS var).

## Requirements
- Grid 3 cột trái | người mẫu | phải (`minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr)`), max-width theo token; cột món `justify-content: space-between` theo chiều cao người mẫu.
- ItemCard: 1 `<a>` bọc ảnh + tên (đậm, uppercase) + subtitle + mô tả; `target="_blank" rel="sponsored nofollow noopener noreferrer"`; alt = tên.
- Hotspot: `<a>` tại `left:x%; top:y%`, `aria-label` = tên món, cùng href.
- Đường chỉ: SVG phủ grid, Bezier bậc 2 từ mép trong ảnh món → hotspot, marker mũi tên; ResizeObserver + ảnh `onLoad` + `document.fonts.ready` → vẽ lại.
- Hover/focus 2 chiều (món ↔ hotspot): ảnh món scale + `drop-shadow`; đường chỉ đậm + hotspot pulse; món khác mờ. Bật hover chỉ khi `@media (hover: hover)`; touch chạm mở link luôn.
- `prefers-reduced-motion`: tắt pulse/transition.
- Không horizontal scroll ở 320px.

## Architecture
```
LookbookLayout (server) — root[data-lookbook]
  ├ ItemColumn side=left → ItemCard[data-item-id]
  ├ ModelFigure → next/image (width/height từ DTO) + Hotspot[data-item-id]
  ├ ItemColumn side=right
  └ LookbookInteractions ('use client') → <svg> paths + quản lý data-active-id
compute-connector-paths.ts (thuần, test được)
```
```ts
// quadratic curve bowing outward like the reference
const cx = (sx + ex) / 2, cy = Math.min(sy, ey) - Math.abs(ex - sx) * curveRatio;
return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
```
CSS: `.root[data-active-id] [data-item-id]:not([data-active]) { opacity: var(--lookbook-dim-opacity) }` — mọi số đo/motion lấy từ token.

## Related Code Files (create)
- `components/lookbook/index.ts`, `lookbook-layout.tsx`, `lookbook-item-column.tsx`, `lookbook-item-card.tsx`, `lookbook-model-figure.tsx`, `lookbook-hotspot.tsx`, `lookbook-interactions.tsx`, `compute-connector-paths.ts`, `lookbook.module.css`
- `test/lookbook/compute-connector-paths.test.ts`, `test/lookbook/lookbook-layout.test.tsx`, `test/lookbook/lookbook-interactions.test.tsx`

## Implementation Steps
1. Đọc checklist ui-consistency + tokens từ P1.
2. Layout + column + card + model + hotspot (render với fixture `sample-public-outfit`).
3. `compute-connector-paths` + unit test (trái/phải, hotspot cao/thấp hơn món).
4. Interactions: đo rect, vẽ SVG, active id qua pointer + focus, bỏ hover trên touch.
5. CSS hiệu ứng, reduced motion, mobile clamp, line-clamp.
6. Test component: mỗi món + hotspot có đúng `href`/`target`/`rel`; hover món → set active; focus hotspot → món tương ứng active.

## Todo List
- [x] Component tĩnh (layout, card, model, hotspot)
- [x] compute-connector-paths + test
- [x] Interactions client
- [x] CSS hover/mobile/reduced-motion
- [x] Component tests pass

## Success Criteria
- Test P4 pass; render fixture không lỗi hydrate.
- Chữ ≥11px ở 390px; không tràn ngang 320px (kiểm visual thật ở P7).

## Risk Assessment
- Đường chỉ cắt nhau vì món dàn đều ≠ vị trí ảnh mẫu → chỉnh `curveRatio` (token); vẫn xấu → đề xuất trường "lệch dọc", hỏi trước khi thêm (đụng hợp đồng P1).
- Layout shift → width/height ảnh từ DTO.

## Security Considerations
- Text render qua React (escape); không `dangerouslySetInnerHTML`.

## Next Steps
- Mở P5, P6.

## Ghi chú đồng bộ 2026-11-06
Đối chiếu với `apps/web/src/components/lookbook/**` và `apps/web/test/lookbook/**`.
- Chữ ký `LookbookLayout({outfit, headingLevel})` giữ nguyên (P5, P6 đang dùng).
- Không có line-clamp 1 (spec yêu cầu). Mô tả ẩn dưới 640px (`lookbook.module.css`, một breakpoint duy nhất).
- Tên outfit (h1/h2) render sr-only, không hiện trên canvas. Token title không áp dụng cho phần này.
- Thêm file ngoài spec: `measure-connectors.ts`, `observe-lookbook-changes.ts` (fix M5: vẽ lại khi dời điểm/sắp xếp), `lookbook-link-props.ts` (fix L3: chỉ https), `lookbook-image-sizes.ts`.
- Test thêm: `lookbook-link-props.test.ts`, `observe-lookbook-changes.test.ts`, `lookbook-remeasure.test.tsx`.
- Chưa kiểm: đường cong connector có khớp ảnh mẫu không (`--lookbook-curve-ratio`); hiển thị 320/390px thật; `next build` với CSS module (P5 đã build được trang dùng component).
- Hotspot 24px, nhỏ với touch (ghi nhận, chưa đổi).
