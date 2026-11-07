# Phase 3: Client shell & pages

## Context Links
- Brainstorm mục "Thiết kế client". Checklist: `./ui-consistency-checklist.md`. Bảng màu: `./design-palette-and-contrast.md` (P1).
- Code đã đọc: `apps/web/src/app/page.tsx`, `app/look/[slug]/page.tsx`, `app/not-found.tsx`, `app/sitemap.ts`, `components/public/*`, `lib/seo/absolute-url.ts`, `lib/seo/build-outfit-metadata.ts`, `components/lookbook/lookbook-layout.tsx`, `lookbook.module.css` (`.root` max-width 960, padding theo `--lookbook-gap`).
- Research 01 Q5 (header ẩn khi cuộn, phương án `useScroll`), Q7 (no-JS). Luật `motion` ở phase 1 mục Key Insights.

## Overview
- Priority: P1. Status: Done (2026-11-07). Effort: 9h. Nhóm song song A. Chạy sau P2, có thể chạy cùng P4 (file rời nhau) và P5/P6.
- Route group `(public)` với header/footer chung, trang `/looks` phân trang server-side, mục "Outfit khác", breadcrumb, thẻ trắng bọc lookbook, sitemap có `/` và `/looks`, trang 404 cùng khung.
- Phase này **sở hữu cả animation của header và thẻ lưới** (ẩn khi cuộn, reveal, hover ảnh), vì chúng nằm trong file component của phase này. P4 chỉ lo lookbook + fade chuyển trang.

## Key Insights
- Route group không đổi URL: `/`, `/look/[slug]` giữ nguyên, nên link SEO và revalidate path không đổi.
- `notFound()` trong `(public)` rơi về `app/not-found.tsx` gốc. File này chỉ được bọc bởi root layout, không có layout `(public)`. Vì vậy cả layout `(public)` và `not-found.tsx` cùng dùng một `PublicShell` để có header/footer (DRY). Lỗi 404 phía admin cũng hiện khung public, giống hiện tại (đang hiện `PublicMessage`).
- `PublicPage` đang render `<main>`. Layout mới đã có `<main>`, nên `PublicPage` đổi thành `div` container để không lồng hai `main`.
- **Giữ pixel lookbook**: hiện `.page` có padding ngang 16px. Ở 390px lookbook rộng 358px. Thẻ trắng phải có `padding: 0`, `max-width: var(--lookbook-max-width)`, không đổi gutter trang (16px trên mobile). Khoảng trắng bên trong đã có nhờ padding của `.root` lookbook. Không dùng `overflow: hidden` trên thẻ, tránh cắt halo/mũi tên. Spec visual P1 sẽ bắt mọi lệch.
- Nền trắng của lookbook lấy từ thẻ. `.root` lookbook trong suốt nên ảnh chụp `[data-lookbook]` vẫn nền trắng.
- Header ẩn khi cuộn: đặt `data-hidden` trực tiếp lên DOM, không qua state, nên không render lại mỗi frame. SSR và no-JS không có attribute → header luôn hiện. Có `focusin` thì hiện lại header.
- Chỉ có 2 link nav. Footer luôn có 2 link này, nên không có JS vẫn đi được trang khác (nút ☰ cần JS). Xem Decision 9.
- `/looks?page=` không hợp lệ → coi như trang 1. `page` vượt số trang (khi `total > 0`) → `notFound()`, tránh soft-404. Trang 1 có canonical `/looks`, trang n có `/looks?page=n`.
- Mục "Outfit khác" là phụ: API lỗi thì bỏ qua mục đó, trang chính vẫn render. Chỉ bắt lỗi ở mục này, không nuốt lỗi của lookbook chính.

## Requirements
- Functional:
  - Header sticky: tên site (Settings) link `/`. Nav "Trang chủ", "Tất cả outfit" có `aria-current="page"`. **Mọi kích thước màn hình: 2 link hiện thẳng** (chốt 2026-11-07: bớt 1 lần bấm, chạy cả khi tắt JS). Mobile <768px: tên site + 2 link gọn một hàng (chữ nhỏ hơn, vẫn tap ≥ 44px); hẹp quá 320px thì tên site xuống hàng trên. Không có nút ☰, không có dialog.
  - Có skip link "Bỏ qua tới nội dung" trỏ `#main`.
  - Footer: tên site, mô tả SEO, nav, năm (tính lúc render server).
  - `/`: lookbook nổi bật trong thẻ trắng → mục "Outfit khác" (`relatedOutfitsCount`, bỏ outfit nổi bật) → nút "Xem tất cả" `/looks`. Chưa có outfit nổi bật → giữ thông điệp trống + mục list nếu có outfit.
  - `/looks`: h1 "Tất cả outfit", lưới thẻ 2/3/4 cột (<768 / 768–1023 / ≥1024), thẻ = ảnh `modelImage` (giữ tỉ lệ ảnh, `object-fit: contain` trên nền trắng) + tên. Phân trang bằng link `?page=` có `rel=prev/next`, `aria-current` cho trang hiện tại. Danh sách rỗng → thông điệp trống.
  - `/look/[slug]`: breadcrumb (`nav aria-label="Breadcrumb"`: Trang chủ / Tất cả outfit / tên outfit) + lookbook trong thẻ + "Outfit khác" (bỏ slug hiện tại).
  - Thẻ lưới: tiêu đề là h2 trên `/looks`, h3 trong mục "Outfit khác" (dưới h2 của mục). Hover phóng nhẹ ảnh. Thẻ dưới màn hình hiện dần khi cuộn tới (class `.revealOnScroll` của P1).
  - Sitemap: thêm `/` và `/looks`, rồi tới từng look.
  - 404: dùng `PublicShell` + `PublicMessage`. Giữ chữ "Không tìm thấy trang" (e2e dùng).
- Non-functional: Server Component cho mọi trang và list. Client component chỉ cho nav active, header scroll. Tap target ≥ 44px. Không cuộn ngang ở 320px. Cỡ chữ ≥ 11px (e2e hiện có). SEO giữ 100. Thời lượng/easing lấy từ token.

## Architecture
```
app/layout.tsx (root, P1)
├─ app/not-found.tsx ──────────────► <PublicShell><PublicMessage/></PublicShell>
└─ app/(public)/layout.tsx ────────► <PublicShell>{children}</PublicShell>
     ├─ template.tsx (P4: fade)
     ├─ page.tsx           featured + related
     ├─ looks/page.tsx     searchParams.page -> getPublicSettings + getPublicOutfitPage
     └─ look/[slug]/page.tsx

PublicShell (server, async): settings = getPublicSettings()
  <a skip-link/> <SiteHeader siteName/> <main id="main" class=shell-main>{children}</main> <SiteFooter settings/>
SiteHeader (server) -> <HideOnScrollHeader>(client) [brand][PublicNavLinks(client)]
```
Data flow `/looks?page=2`: `searchParams` → `parseLooksPageParam` (lenient) → `settings.looksPageSize` → `getPublicOutfitPage(page, size)` → `totalPages = ceil(total/size)` → `page > totalPages && total > 0` thì `notFound()` → `OutfitCardGrid` + `LooksPagination`.

Data flow mục "Outfit khác": `settings.relatedOutfitsCount` → `getRelatedOutfits(excludeSlug, count)` (P2) → `RelatedOutfitsSection`. Lỗi thì trả `null` (bọc `try/catch` riêng mục này, log `console.error`).

```tsx
// hide-on-scroll-header.tsx (sketch, client) — uses motion (kept 2026-11-07)
const { scrollY } = useScroll();
const [hidden, setHidden] = useState(false); // SSR + first paint: visible
useMotionValueEvent(scrollY, 'change', (y) => {
  const prev = scrollY.getPrevious() ?? 0;
  if (Math.abs(y - prev) < SCROLL_JITTER_PX) return; // technical guard, not a business value
  setHidden(y > prev && y > headerHeight);
});
return (
  <m.header
    initial={false}
    animate={{ y: hidden ? '-100%' : '0%' }}
    transition={{ duration: durationBase, ease: easingStandard }}
    onFocusCapture={() => setHidden(false)}
  >{children}</m.header>
);
```
- `initial={false}`: HTML server render header ở vị trí hiện, không có style ẩn → tắt JS vẫn thấy header.
- `durationBase`/`easingStandard` đọc từ token (`getComputedStyle` lúc mount, giống cách P5 đọc `--toast-duration`), không đặt số trong component.
- Reduced-motion: `MotionConfig reducedMotion="user"` (P1) bỏ animation transform → header đổi vị trí tức thì.

## Related Code Files
- Move + modify: `apps/web/src/app/page.tsx` → `apps/web/src/app/(public)/page.tsx`; `apps/web/src/app/look/[slug]/page.tsx` → `apps/web/src/app/(public)/look/[slug]/page.tsx`
- Modify: `apps/web/src/app/not-found.tsx`, `apps/web/src/app/sitemap.ts`, `apps/web/src/components/public/public-page.tsx`, `public-page.module.css`, `public-message.tsx`, `public-message.module.css`, `public-copy.ts`, `apps/web/src/lib/seo/absolute-url.ts`, `apps/web/test/app/look-page.test.tsx`, `apps/web/test/app/sitemap.test.ts`
- Create: `apps/web/src/app/(public)/layout.tsx`, `apps/web/src/app/(public)/looks/page.tsx`, `apps/web/src/lib/seo/build-looks-metadata.ts`; trong `apps/web/src/components/public/`: `public-shell.tsx`, `public-shell.module.css`, `site-header.tsx`, `site-header.module.css`, `hide-on-scroll-header.tsx`, `public-nav-links.tsx`, `site-footer.tsx`, `site-footer.module.css`, `lookbook-card.tsx`, `lookbook-card.module.css`, `look-breadcrumb.tsx`, `look-breadcrumb.module.css`, `outfit-card.tsx`, `outfit-card-grid.tsx`, `outfit-card.module.css`, `related-outfits-section.tsx`, `related-outfits-section.module.css`, `looks-pagination.tsx`, `looks-pagination.module.css`, `parse-looks-page-param.ts`; test: `apps/web/test/app/looks-page.test.tsx`, `apps/web/test/app/home-page.test.tsx`, `apps/web/test/public/site-header.test.tsx`, `apps/web/test/public/outfit-card-grid.test.tsx`, `apps/web/test/public/looks-pagination.test.tsx`
- Delete: thư mục rỗng `apps/web/src/app/look/` sau khi `git mv`
- Không sửa (của phase khác): `components/lookbook/*` (P4), `app/(public)/template.tsx` (P4), `lib/seo/public-data-loaders.ts` (P2)

## Implementation Steps
1. Đọc `ui-consistency-checklist.md` và `design-palette-and-contrast.md`.
2. `git mv` hai page vào `(public)`. Sửa import trong `look-page.test.tsx` thành `@/app/(public)/look/[slug]/page`. Chạy test để chắc chắn vẫn xanh trước khi đổi UI.
3. `public-shell.tsx` + module: nền `var(--client-bg)`, chữ `var(--client-ink)`, `min-height: 100dvh`, grid 3 hàng (header / main 1fr / footer). Đặt `--color-focus: var(--client-focus)` trên wrapper (vòng focus nâu ở public). Token lookbook `--color-*` khác **không** ghi đè.
4. `site-header.tsx` + `hide-on-scroll-header.tsx` (dùng `m.header` + `useScroll`, xem sketch) + `public-nav-links.tsx`. Breakpoint 768 viết số trong `@media` kèm comment trỏ `--bp-md`. Không dùng `motion` cho bất cứ trạng thái ẩn nào lúc tải trang.
5. `site-footer.tsx`: năm `new Date().getFullYear()` trong server component. `/` là `force-dynamic` nên năm luôn đúng. Trang look có cache nhưng được làm mới định kỳ, chấp nhận.
6. `lookbook-card.tsx`: `<div className={styles.card}>{children}</div>`. Nền `--client-surface`, bo `--client-radius-lg`, shadow mềm, `max-width: var(--lookbook-max-width)`, `margin-inline: auto`, `padding: 0`.
7. `PublicPage` → container `div` (max-width trang, gutter `--space-4` mobile / `--space-6` desktop). `PublicMessage` → khối giữa trang, nút pill.
8. `outfit-card.tsx` (`Link` → `/look/<slug>` qua `outfitPath`, `next/image` theo kích thước ảnh, `sizes` theo 2/3/4 cột), `outfit-card-grid.tsx` (prop `headingLevel`, `items`), module: `aspect-ratio` theo `width/height` ảnh, hover `transform: scale(var(--client-card-hover-scale))` trên ảnh (có transition, tắt khi reduced-motion), class `revealOnScroll` từ P1 gắn lên `li`.
9. `related-outfits-section.tsx` (async server): h2 "Outfit khác", grid, link "Xem tất cả" (pill). Trả `null` nếu rỗng hoặc lỗi.
10. `looks-pagination.tsx`: Trước / dãy số trang rút gọn (1 … n-1 n n+1 … last) / Sau. Mỗi link cao ≥ 44px. `parse-looks-page-param.ts` dùng chung cho page và metadata.
11. `(public)/looks/page.tsx` + `build-looks-metadata.ts` (title "Tất cả outfit", description từ settings, canonical theo trang). `absolute-url.ts` thêm `looksPagePath(page)` (trang 1 → `LOOKS_PAGE_PATH`).
12. Sửa `(public)/page.tsx`, `(public)/look/[slug]/page.tsx`: bọc `LookbookCard`, thêm breadcrumb (chỉ trang look), `RelatedOutfitsSection`. Giữ nguyên JSON-LD và metadata.
13. `not-found.tsx`: `<PublicShell><PublicMessage .../></PublicShell>`.
14. `sitemap.ts`: `[{ url: '/' }, { url: '/looks' }, ...looks]`. Sửa `sitemap.test.ts`.
15. Test (Testing Library, gọi thẳng server component như test sẵn có): home có mục related và bỏ featured; looks page 1/2, page rác → 1, page quá lớn → `notFound`; header có nav + `aria-current`, HTML render ra không có style ẩn (`transform` khác 0); pagination `rel` + `aria-current`.
16. Kiểm tay ở 320 / 390 / 768 / 1024 / 1440: không cuộn ngang, header ẩn/hiện, 2 link vừa một hàng ở 320px, Tab qua header (header hiện lại khi focus). Chạy `pnpm e2e --project visual`: snapshot lookbook phải **khớp**.
17. `pnpm lint && pnpm typecheck && pnpm test`. Commit: `feat: add public shell, looks listing and related outfits`.

## Todo List
- [x] Đọc checklist + bảng màu
- [x] `git mv` vào `(public)`, test xanh
- [x] PublicShell, header (scroll bằng motion, nav 2 link), footer, skip link
- [x] LookbookCard (spec visual khớp)
- [x] OutfitCard/Grid + reveal + hover
- [x] RelatedOutfitsSection
- [x] `/looks` + pagination + metadata + canonical
- [x] Breadcrumb trang look
- [x] 404 trong khung
- [x] Sitemap `/`, `/looks`
- [x] Test unit mới + sửa test cũ
- [x] Kiểm tay 5 viewport, lint/typecheck/test xanh
- [x] Lighthouse SEO `/looks` đo lại 100 mobile + desktop (lần đo trước 92, xem phase-07)
- [ ] Commit `feat: add public shell, looks listing and related outfits`: bỏ theo quyết định chủ repo

## Success Criteria
- `pnpm e2e --project visual` khớp baseline P1 (lookbook không đổi pixel).
- `/looks?page=abc` → trang 1. `/looks?page=999` → 404 (khi có ít nhất một outfit).
- Tắt JS: header, footer, lưới thẻ, phân trang vẫn thấy và bấm được. Footer có link "Tất cả outfit".
- `document.scrollingElement.scrollWidth <= innerWidth` ở 320px trên `/`, `/looks`, `/look/dramatic`.
- Lighthouse SEO 100 trên `/looks` (P7 đo chính thức).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Thẻ trắng làm đổi bề rộng lookbook | Trung bình × Cao | `padding: 0`, giữ gutter. Spec visual chạy sau bước 6 |
| Header sticky che nội dung khi focus | Thấp × Trung bình | `scroll-padding-top` (P1) + hiện header khi `focusin` |
| Hai `<main>` lồng nhau | Trung bình × Thấp | `PublicPage` đổi thành `div`. Test kiểm chỉ có một `main` |
| Server component async trong `not-found.tsx` | Thấp × Trung bình | Next cho phép `not-found` async (**chưa kiểm** trên 16.4.5). Lỗi thì truyền settings mặc định |
| Gọi API thêm cho mục related làm chậm `/` | Thấp × Thấp | Chạy song song với featured bằng `Promise.all`. Fetch có cache (`safetyRevalidate`) |

## Security Considerations
- Chỉ đọc dữ liệu public. Link thẻ là link nội bộ, không phải affiliate (không cần `rel=sponsored`).
- Giá trị `page` parse thành số nguyên, không đưa thẳng vào URL API.

## Rollback
- Revert commit. Hai page tự về chỗ cũ nhờ `git mv` nằm trong cùng commit. API P2 còn đó cũng vô hại.

## Next Steps
- P4 gắn `template.tsx` vào `(public)`. P7 thêm e2e `/looks`, viewport, no-JS opacity, header ẩn/hiện.
