# Phase 4: Client animation (lookbook draw-once, stagger, route fade)

## Context Links
- Research 01: Q2 (fade trong `template.tsx`), Q4 (vẽ SVG một lần), Q6 (reduced motion + ảnh chụp), Q7 (no-JS, CLS).
- Code đã đọc: `apps/web/src/components/lookbook/lookbook-interactions.tsx` (136 dòng: đo trong `useEffect`, đo lại khi `ResizeObserver`, `load` (capture), `document.fonts.ready`, MutationObserver), `lookbook-layout.tsx`, `lookbook-item-column.tsx`, `lookbook-item-card.tsx`, `lookbook-model-figure.tsx`, `lookbook.module.css` (199 dòng, đã có reduced-motion ở cuối), `measure-connectors.ts` (dùng `getBoundingClientRect`).
- e2e liên quan: `e2e/public-lookbook-links-and-hover.spec.ts` (kiểm opacity < 1 của thẻ bị làm mờ), `e2e/public-hotspot-alignment.spec.ts` (đo figure/img/hotspot, ±2px).
- Primitive: `apps/web/src/styles/motion-primitives.module.css` (P1).

## Overview
- Priority: P2. Status: Done (2026-11-07). Effort: 4h. Nhóm song song A. Chỉ cần P1, chạy được cùng lúc với P2 và P3.
- Thêm: món đồ hiện lần lượt (stagger) lúc tải trang, ảnh người mẫu fade, đường chỉ tự vẽ **một lần** sau khi font + ảnh + animation món xong, mũi tên hiện sau khi vẽ xong, fade nội dung khi chuyển trang trong `(public)`.
- Khi đứng yên (animation xong hoặc reduced-motion), lookbook phải **giống hệt pixel** baseline P1.

## Key Insights
- `lookbook.module.css` đã 199 dòng. Mọi CSS mới vào `lookbook-motion.module.css`. File cũ không sửa.
- **Animation đè style thường.** Nếu fill `both` trên `.card` thì rule làm mờ (`opacity: var(--lookbook-dim-opacity)`) hết tác dụng và e2e hover rớt. Vì vậy:
  - Stagger gắn lên `li` (`.item`), không gắn lên `a.card`.
  - Primitive dùng fill `backwards` (P1).
  - Không gắn animation `opacity` lên `.hotspot`, `.connector`.
- **Transform làm lệch đường chỉ.** `measure-connectors.ts` đo bằng `getBoundingClientRect` (có tính transform). Lúc `li` đang dịch `translateY` mà đo thì đường chỉ lệch, và `ResizeObserver` không chạy lại khi transform đổi. Vì vậy:
  - Vẽ chỉ sau khi mọi animation trong root xong (`root.getAnimations({ subtree: true })`), rồi đo lại một lần.
  - Ảnh người mẫu chỉ fade `opacity`, không dịch, để e2e hotspot (±2px) không bị ảnh hưởng.
  - Không làm "nhích lên khi hover" cho món trong lookbook (Decision 6).
- `pathLength={1}` + `stroke-dasharray: 1` + animation `stroke-dashoffset 1 → 0`: không cần đo độ dài path. Dùng **CSS animation** (không dùng transition), vì `.connector` đã có `transition` cho `stroke-width`/`opacity`. Hai khai báo `transition` từ hai module sẽ đè nhau, còn `animation` là property riêng.
- Vẽ một lần: class vẽ chỉ gắn khi `ready` chuyển `true`, và không bao giờ gỡ. Path giữ `key={p.id}` nên resize chỉ đổi `d`, không mount lại, không chạy lại animation. Path mới thêm sau đó (vd trong preview admin) sẽ tự vẽ khi mount. Chấp nhận, còn đẹp hơn.
- Marker mũi tên vẽ ở cuối path ngay từ đầu, trông như mũi tên lơ lửng. Giải pháp: chỉ gắn `markerEnd` khi có `animationend` đầu tiên từ SVG, hoặc ngay lập tức nếu `prefers-reduced-motion: reduce` (lúc đó animation `none`, không có event).
- Trước khi `ready`, SVG `visibility: hidden`. Hiện tại đường chỉ có thể nháy sai vị trí trước khi ảnh tải xong, nên đây cũng là cải thiện.
- No-JS: không có path (SVG do JS vẽ, như hiện nay). Món dùng CSS keyframes nên tự chạy xong và hiện ra. Reduced-motion: `animation: none` → hiện ngay.
- jsdom không có `getAnimations`/`matchMedia` đầy đủ. Hook phải kiểm `typeof` trước khi dùng.
- `template.tsx` của route group chỉ bọc phần trong layout `(public)`: header/footer không fade, chỉ nội dung fade. Chỉ fade `opacity`, không đổi kích thước hay vị trí, nên không ảnh hưởng đo đường chỉ.

## Requirements
- Functional:
  - `li` món: class `fadeUp` + `style={{ '--i': globalIndex }}`. Thứ tự: cột trái từ trên xuống, rồi cột phải.
  - Figure người mẫu: `fadeIn`.
  - Connector: ẩn tới khi ready → vẽ một lần trong `--duration-draw` → hiện mũi tên.
  - `(public)/template.tsx`: `<div className={motion.fadeIn}>{children}</div>`.
- Non-functional: chỉ animate `transform`/`opacity`/`stroke-dashoffset`. Tôn trọng reduced-motion. Không đổi pixel khi đứng yên. File < 200 dòng (`lookbook-interactions.tsx` đang 136 dòng → tách hook).

## Architecture
```
LookbookInteractions (client)
  measurement (có sẵn)  ──┐
  useLookbookReady(root) ─┼─> ready: fonts.ready && imgs complete && animations finished
                          │     -> khi ready: measure() thêm 1 lần, set data-ready lên svg
  arrowsOn state ─────────┘  <- onAnimationEnd (svg, bubble từ path) | reduced-motion => true
  <svg data-ready? className={styles.connectors + motion.connectors}>
     <path pathLength={1} className={styles.connector + motion.connectorPath} markerEnd={arrowsOn ? url : undefined}/>
```
```css
/* lookbook-motion.module.css (sketch) */
.connectors:not([data-ready]) { visibility: hidden; }
.connectorPath { stroke-dasharray: 1; }
.connectors[data-ready] .connectorPath { animation: draw var(--duration-draw) var(--easing-out) backwards; }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .connectors[data-ready] .connectorPath { animation: none; } }
```
Khi đứng yên: `stroke-dasharray: 1` với `pathLength=1` là một nét liền dài đúng bằng path, giống nét liền cũ. **Chưa kiểm** bằng pixel, bước 6 kiểm qua spec visual. Nếu lệch thì chỉ đặt `stroke-dasharray` trong lúc đang chạy animation (đặt trong keyframes).

```ts
// use-lookbook-ready.ts (sketch)
export function useLookbookReady(getRoot: () => HTMLElement | null): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const root = getRoot(); if (!root || ready) return;
    let cancelled = false;
    const imagesDone = () => [...root.querySelectorAll('img')].every((img) => img.complete);
    const animationsDone = () =>
      Promise.all((root.getAnimations?.({ subtree: true }) ?? []).map((a) => a.finished.catch(() => undefined)));
    const check = async () => {
      await document.fonts?.ready;
      if (cancelled || !imagesDone()) return;
      await animationsDone();
      if (!cancelled) setReady(true);
    };
    root.addEventListener('load', check, true);
    void check();
    return () => { cancelled = true; root.removeEventListener('load', check, true); };
  }, [getRoot, ready]);
  return ready;
}
```
Lưu ý: ảnh lỗi cũng có `complete === true`, nên không bị treo. Đã ready thì không bao giờ quay về `false`.

## Related Code Files
- Modify: `apps/web/src/components/lookbook/lookbook-interactions.tsx`, `lookbook-item-card.tsx` (nhận `index`, gắn class + `--i` lên `li`), `lookbook-item-column.tsx` (truyền `indexOffset`), `lookbook-layout.tsx` (offset cột phải = số món trái), `lookbook-model-figure.tsx` (class `fadeIn`); test `apps/web/test/lookbook/lookbook-interactions.test.tsx`, `lookbook-layout.test.tsx`, `lookbook-remeasure.test.tsx`
- Create: `apps/web/src/components/lookbook/lookbook-motion.module.css`, `apps/web/src/components/lookbook/use-lookbook-ready.ts`, `apps/web/src/app/(public)/template.tsx`, `apps/web/test/lookbook/lookbook-draw-once.test.tsx`
- Delete: không
- Không sửa: `lookbook.module.css`, `measure-connectors.ts`, `compute-connector-paths.ts`, `observe-lookbook-changes.ts`, `lookbook-hotspot.tsx`, `components/public/*` (P3)

## Implementation Steps
1. Đọc `ui-consistency-checklist.md` (phần lookbook).
2. Tạo `use-lookbook-ready.ts` như sketch. Có guard `typeof root.getAnimations === 'function'`.
3. `lookbook-interactions.tsx`: dùng hook. Khi `ready` chuyển `true` thì gọi `measure()` thêm một lần. Gắn `data-ready` lên `<svg>`, thêm `pathLength={1}` và class `motion.connectorPath` vào path. State `arrowsOn`: bật khi có `onAnimationEnd` đầu tiên trên `<svg>`, hoặc ngay khi `ready` nếu `matchMedia('(prefers-reduced-motion: reduce)').matches`. Giữ nguyên thuộc tính `data-item-id`, `data-active` (e2e dùng).
4. Stagger: `LookbookLayout` tính `offset` cho cột phải. `LookbookItemColumn` truyền `index = offset + i`. `LookbookItemCard` gắn `className={`${styles.item} ${motion.fadeUp}`}` và `style={{ '--i': index } as CSSProperties}` lên `li`.
5. `LookbookModelFigure`: thêm `motion.fadeIn` lên `figure` (chỉ opacity).
6. `(public)/template.tsx` (Server Component, không cần `'use client'`).
7. Test jsdom: `lookbook-draw-once.test.tsx` kiểm (a) trước ready thì svg không có `data-ready`; (b) giả `fonts.ready` + ảnh complete → có `data-ready`; (c) resize (gọi callback ResizeObserver giả) → `data-ready` vẫn còn, path không mount lại (cùng node). Sửa test cũ nếu snapshot class/thuộc tính đổi.
8. Kiểm tay trên Chrome: tải `/look/dramatic` ở 1440 và 390 (ở 390 connector bị `display:none` theo CSS cũ, chỉ món stagger). Đổi kích thước cửa sổ, đường chỉ không vẽ lại. Bật reduced-motion trong DevTools → mọi thứ hiện ngay. Tắt JS → món hiện đủ.
9. `pnpm e2e --project visual` phải khớp baseline P1. Nếu lệch do dasharray thì làm theo phương án ghi trong Architecture.
10. Chạy e2e public hiện có nếu stack có dữ liệu `admin-flow` (`pnpm e2e --project public`): hover + hotspot vẫn xanh.
11. `pnpm lint && pnpm typecheck && pnpm test`. Commit: `feat: animate lookbook items and draw connectors once`.

## Todo List
- [x] `use-lookbook-ready.ts`
- [x] Interactions: data-ready, pathLength, markerEnd sau khi vẽ
- [x] `lookbook-motion.module.css`
- [x] Stagger `li` + fade figure
- [x] `(public)/template.tsx`
- [x] Test draw-once + sửa test cũ
- [x] Kiểm tay resize / reduced-motion (no-JS chưa kiểm tay, đã phủ bằng assert opacity trong e2e phase 7)
- [x] Spec visual khớp (4/4); hotspot và hover xanh trong e2e full 65/65 (2026-11-07)
- [ ] Commit `feat: animate lookbook items and draw connectors once`: bỏ theo quyết định chủ repo

## Success Criteria
- Spec visual P1 xanh (pixel lookbook không đổi khi đứng yên).
- Sau khi vẽ xong rồi resize: `path.getAnimations().length === 0` và `getComputedStyle(path).strokeDashoffset` = `0` (P7 viết e2e).
- `e2e/public-lookbook-links-and-hover.spec.ts` và `public-hotspot-alignment.spec.ts` xanh, không phải sửa.
- Reduced-motion: không có animation nào đang chạy ngay sau khi tải (`document.getAnimations()` rỗng hoặc toàn bộ `finished`).
- `lookbook-interactions.tsx` < 200 dòng.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Đo đường chỉ lúc món đang dịch | Trung bình × Cao | Ready chờ animation xong + đo lại. Test resize |
| `stroke-dasharray` làm khác pixel khi đứng yên | Thấp × Cao | Spec visual. Phương án chỉ đặt dasharray trong keyframes |
| `animationend` không bắn (tab ẩn, trình duyệt cũ) → không có mũi tên | Thấp × Trung bình | Thêm dự phòng `setTimeout` bằng thời lượng đọc từ token `--duration-draw` (đọc qua `getComputedStyle`, giống cách `measure-connectors` đọc token) |
| Preview admin (`live-preview-panel.tsx`) cũng chạy animation | Chắc chắn × Thấp | Chỉ chạy khi mount. Chấp nhận. Nếu khó chịu thì thêm prop `animate={false}` (báo lead, vì đụng file P6) |
| Fade `template.tsx` làm nháy nội dung khi điều hướng | Thấp × Thấp | `--duration-route` ngắn (~220ms), chỉ opacity |

## Security Considerations
- Không có. Không thêm dependency.

## Rollback
- Revert commit. Lookbook về đúng hành vi cũ. `template.tsx` bị xoá theo. P3 không phụ thuộc vào phase này.

## Next Steps
- P7: e2e draw-once khi resize, kiểm no-JS opacity, reduced-motion.
