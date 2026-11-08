# Phase 4: Renderer section + trang chủ public

## Context Links
- Contract P1: `home-sections/*`, `home-layout-contract.ts` (`ResolvedHomeSection`, `PublicHomeResponse`), `PUBLIC_CACHE_TAGS.home`, `PublicSmartLink`, `CollectionCardGrid`, fixture `sample-home-sections.ts`.
- API P2: `GET /api/public/home`.
- Checklist UI phần C (plan dir này), A4, A5, A10, A11 của checklist cũ.
- Code tham chiếu: `app/(public)/page.tsx`, `components/public/{outfit-card,outfit-card-grid,outfit-grid-columns,related-outfits-section,lookbook-card,public-message}.tsx`, `components/lookbook/lookbook-layout.tsx` (`headingLevel`), `styles/motion-primitives.module.css`, `lib/seo/{build-outfit-metadata,build-outfit-json-ld,outfit-json-ld-script}.ts*`.
- `docs/code-standards.md` mục "Animation lúc tải trang: chỉ CSS", "Motion", "Tắt JS và giảm chuyển động".

## Overview
- Priority: P1. Status: Completed (2026-11-07). Effort: 12h. Bắt đầu sau P1, code song song P2 bằng fixture. Đóng phase sau khi chạy thật với API P2.
- 7 View section (client-safe, không tự lấy dữ liệu) + `HomeSectionList` (server) + trang `/` đọc `GET /api/public/home`. Không có bố cục đã đăng thì vẫn ra bố cục mặc định, trang chủ không bao giờ trống.

## Key Insights
- View chỉ nhận `ResolvedHomeSection` (dữ liệu đã resolve, ảnh đã có `url`), nên dùng được ở 3 nơi: trang public (server), trang Xem trước (server), khung xem trước trong editor (client, P6). Không import `next/headers`, `lib/web-env`, loader.
  - `siteUrl` cho JSON-LD truyền qua prop từ `HomeSectionList`.
  - Test jsdom import từng View để chứng minh client-safe.
  - Prop `mode: 'public' | 'preview'` (mặc định `public`). `preview`: slider không tự chuyển, không sinh JSON-LD (khung xem trước không phải trang thật). `SectionShell` luôn gắn `data-section-id` để P6 bấm vào khối là chọn đúng thẻ.
- Heading: trang có một `h1` ẩn khỏi mắt (`settings.seoTitle`). Tiêu đề section là `h2`, thẻ con `h3`. `LookbookLayout` nhận `headingLevel="h2"`, `h1` ẩn của lookbook đổi cấp nhưng hình không đổi.
- Lookbook nổi bật dùng lại `LookbookCard` + `LookbookLayout` nguyên trạng. Spec visual chỉ chụp `/look/<slug>` (`e2e/visual-reference-screenshots.spec.ts:4-24`), nên trang chủ đổi không làm lệch baseline. Vẫn chạy spec mỗi phase.
- `OutfitCardGrid` cố định 4 cột (`outfit-grid-columns.ts`) → thêm prop `columnsDesktop` (CSS var). Logic `firstRow` dùng số cột thật. Mặc định 4 nên `/looks` không đổi.
- Animation: vào trang chỉ bằng class `revealOnScroll` / `fadeUp` có sẵn, mỗi phần tử một class. Không dùng `m.*` ở trang chủ (không có tương tác cần motion).
  - Slider và rail dùng `scroll-snap` + `scrollBy`. `behavior` là `smooth`, đổi thành `auto` khi `prefers-reduced-motion: reduce`.
- Slider tự chuyển chỉ khi `matchMedia('(prefers-reduced-motion: no-preference)')`. Dừng khi hover, focus-within, tab ẩn (`visibilitychange`). Có nút "Tạm dừng / Chạy tiếp" hiện rõ (WCAG 2.2.2, nội dung tự chuyển > 5 giây). `autoplaySeconds = 0` thì không có nút.
- Tab băng chuyền: nhóm `<input type="radio">` + CSS `:has()`, không cần JS, phím mũi tên đổi tab có sẵn. Mọi panel nằm trong HTML. CSS chỉ ẩn panel chưa chọn, đây là trạng thái UI, không phải trạng thái ẩn chờ animation. `:has()` có từ Chrome 105, Safari 15.4, Firefox 121.
- FAQ: `<details><summary>`, chạy không JS. JSON-LD `FAQPage` qua `serializeJsonLd` (escape `<`, `build-outfit-json-ld.ts:30-34`). Chỉ section `Faq` đang hiện mới sinh JSON-LD.
- Metadata `/` đổi sang `buildSiteMetadata` (quyết định 6). `OutfitJsonLdScript` chuyển vào View lookbook nổi bật để structured data giữ như cũ.
- LCP: section đầu tiên có ảnh dùng eager + `fetchPriority="high"` (slide đầu, hoặc hàng đầu lưới, hoặc ảnh người mẫu). Phần còn lại lazy. `HomeSectionList` tính `priority` theo vị trí.
- Ảnh slide có bản mobile: dùng `getImageProps` của `next/image` + `<picture>` (`<source media>` 767px = dưới `--bp-md`). `unoptimized: true` vẫn giữ.

## Requirements
### Functional
| View | Hiển thị | Ghi chú |
|---|---|---|
| `HeroSliderView` | Track scroll-snap, mỗi slide: ảnh, `heading` (h2 hoặc p theo checklist C), `text`, CTA pill; nút Trước/Sau, chấm vị trí, nút tạm dừng | `role="region"` + `aria-roledescription="carousel"` + `aria-label`. Slide `role="group"`, `aria-label="2 / 5"`. 1 slide thì không có điều khiển |
| `CollectionTilesView` | `h2` + `CollectionCardGrid columnsDesktop` + "Xem tất cả" → `/collections` khi `showViewAll` | |
| `OutfitListView` | `h2` + (1 tab: không có nhóm tab) rail hoặc lưới + "Xem tất cả" theo `tab.href` | `latest` → `/looks`. Theo bộ sưu tập → `/collections/<slug>`. Chọn tay → không có link |
| `FeaturedLookbookView` | `LookbookCard` + `LookbookLayout headingLevel="h2"` + JSON-LD outfit | |
| `TextWithImageView` | `h2`, các đoạn văn, ảnh trái/phải (≥768px), xếp dọc trên mobile, CTA | Tách đoạn ở dòng trống, không HTML |
| `FaqView` | `h2` + danh sách `details` | + `FaqJsonLdScript` |
| `CommitmentsView` | 2–4 cột icon + tiêu đề + mô tả, xếp 2 cột/1 cột trên mobile | Icon qua `DecorativeIcon`, map key → lucide trong `commitment-icons.ts` |

- `ScrollRail` (client island, slider và rail outfit cùng dùng): nút Trước/Sau gọi `scrollBy` một bề rộng khung nhìn. Ở đầu/cuối thì nút `disabled` (IntersectionObserver trên phần tử đầu/cuối). Nút có `aria-label`, nằm trong HTML từ server để không xô bố cục.
- `HomeSectionList({ sections, siteUrl, seoTitle, mode })`: `h1` ẩn, map `type` → View qua `HOME_SECTION_VIEWS`, gán `headingId` ổn định (`section-<id>`). `type` lạ → bỏ qua + `console.warn`.
- Trang `/`: `getHomePage()` + `getPublicSettings()` chạy `Promise.all`. Giữ `dynamic = 'force-dynamic'` (lý do có sẵn trong file).
- Loader `getHomePage = cache(() => apiGet(API_PATHS.public.home, { ...safetyRevalidate(), tags: [PUBLIC_CACHE_TAGS.home] }))`.

### Non-functional
- Mọi số (cột, giây tự chuyển, số outfit) lấy từ props section, không hằng trong View. Kích thước, khoảng cách, thời lượng lấy từ token (P1). Không hex trong CSS.
- Không cuộn ngang ở 320, 390, 768, 1024, 1440: rail cuộn bên trong khung, không dùng `100vw`.
- Tắt JS: mọi chữ và link đọc được. Slider thành dải cuộn ngang. Panel tab đầu hiện, tab khác chọn được bằng radio (CSS).
- Sau khi animation xong, opacity về 1 (e2e P7 đọc `getComputedStyle`).
- File < 200 dòng. CSS Module riêng cho từng View lớn.

## Architecture
```
app/(public)/page.tsx (server, force-dynamic)
  Promise.all(getHomePage(), getPublicSettings())
  <PublicPage><HomeSectionList sections siteUrl seoTitle/></PublicPage>
HomeSectionList (server)
  h1.visuallyHidden
  sections.map((s, i) => View = HOME_SECTION_VIEWS[s.type]; <View section={s} headingId priority={i === firstImageIndex} siteUrl/>)
HOME_SECTION_VIEWS (client-safe map, P6 import cho khung xem trước + trang Xem trước)
  HeroSliderView -> ScrollRail + HeroSliderAutoplay ('use client', chỉ chạy khi không reduced-motion)
  OutfitListView -> OutfitListTabs (radio + CSS) -> OutfitCardRail (ScrollRail) | OutfitCardGrid columnsDesktop
```

## Related Code Files
- Create:
  - `components/home-sections/`:
    - danh sách: `home-section-list.tsx`, `home-section-views.ts`, `home-section-copy.ts`, `section-shell.tsx`, `section-shell.module.css`
    - slider: `hero-slider-view.tsx`, `hero-slider-autoplay.tsx`, `hero-slider.module.css`, `hero-image-props.ts`
    - rail: `scroll-rail.tsx`, `scroll-rail.module.css`
    - bộ sưu tập: `collection-tiles-view.tsx`
    - outfit: `outfit-list-view.tsx`, `outfit-list-tabs.tsx`, `outfit-card-rail.tsx`, `outfit-list.module.css`
    - lookbook: `featured-lookbook-view.tsx`
    - chữ + ảnh: `text-with-image-view.tsx`, `text-with-image.module.css`, `split-paragraphs.ts`
    - FAQ: `faq-view.tsx`, `faq.module.css`
    - cam kết: `commitments-view.tsx`, `commitment-icons.ts`, `commitments.module.css`
  - `lib/seo/public-home-loaders.ts`, `lib/seo/build-faq-json-ld.ts`, `lib/seo/faq-json-ld-script.tsx`
  - Test (`apps/web/test/home-sections/`): `home-section-list.test.tsx`, `hero-slider.test.tsx` (autoplay, reduced-motion, pause), `outfit-list-view.test.tsx` (tab, link Xem tất cả, grid cột), `faq-view.test.tsx`, `views-client-safe.test.tsx`, `text-with-image-view.test.tsx`, `commitments-view.test.tsx`; `apps/web/test/lib/{build-faq-json-ld,public-home-loaders}.test.ts`
- Modify:
  - `app/(public)/page.tsx`
  - `components/public/outfit-card-grid.tsx`, `outfit-card.module.css`, `outfit-grid-columns.ts`
  - `apps/web/test/app/home-page.test.tsx`, `apps/web/test/public/outfit-card-grid.test.tsx`
- Delete: không. `getFeaturedOutfit` trong `public-data-loaders.ts` (file của P1) có thể không còn chỗ dùng: ghi follow-up, không xoá ở phase này.

## Implementation Steps
1. Đọc checklist C. `section-shell.tsx`: `<section aria-labelledby>` + `h2` + khoảng cách token. Thêm class ẩn khỏi mắt cục bộ, chép đúng khai báo `.srOnly` của admin (checklist B10). Không chép khối `.title` của lookbook (A12).
2. `OutfitCardGrid` thêm `columnsDesktop` (mặc định `OUTFIT_GRID_DESKTOP_COLUMNS`) + test.
3. View không dữ liệu: `TextWithImage`, `Faq` (+ JSON-LD, tắt khi `mode='preview'`), `Commitments`.
4. `ScrollRail` + `OutfitCardRail` + `OutfitListTabs` + `OutfitListView`.
5. `HeroSliderView` + `hero-image-props.ts` (`getImageProps`, `<picture>`) + `HeroSliderAutoplay`:
   - đọc `autoplaySeconds` từ props;
   - `setInterval` chỉ khi không reduced-motion, không hover/focus, tab đang hiện;
   - nút tạm dừng là `button` có `aria-pressed`.
6. `CollectionTilesView`, `FeaturedLookbookView` (gồm `OutfitJsonLdScript`).
7. `HOME_SECTION_VIEWS`, `HomeSectionList` (tính `priority`), `public-home-loaders.ts`.
8. Viết lại `app/(public)/page.tsx` + metadata site. Sửa `home-page.test.tsx`: bố cục mặc định ra lookbook + "Outfit khác" + "Xem tất cả" → `/looks`.
9. Test `views-client-safe`: import mọi View trong jsdom, render với fixture P1 ở cả hai `mode`, không lỗi, không gọi `fetch`; `mode='preview'` không có `setInterval`, không có `application/ld+json`.
10. Chạy thật với API P2: DB trống (bố cục mặc định), rồi đăng bố cục đủ 7 loại bằng `curl` (`PUT draft` + `publish`), xem ở 390 và 1440, tắt JS, bật reduced-motion. `pnpm lint && pnpm typecheck && pnpm test`, spec visual. Không commit (commit một lần cuối đợt, khi chủ repo yêu cầu).

## Todo List
- [x] Section shell + heading + ẩn h1
- [x] OutfitCardGrid `columnsDesktop`
- [x] View: chữ + ảnh, FAQ + JSON-LD, cam kết; prop `mode`
- [x] ScrollRail, rail outfit, tab radio, danh sách outfit
- [x] Slider + autoplay + tạm dừng + ảnh mobile
- [x] Ô bộ sưu tập, lookbook nổi bật
- [x] HomeSectionList, loader, trang `/`, test
- [x] Chạy thật với API, no-JS, reduced-motion, lint/typecheck/test/visual

## Success Criteria
- DB chưa có bố cục: `/` hiện lookbook nổi bật + "Outfit khác" + "Xem tất cả" như trước. e2e public cũ (41 test tính tới 2026-11-07) vẫn pass (P7 chạy lại).
- Bố cục 7 loại đã đăng render đúng thứ tự. Section ẩn không có trong HTML.
- `prefers-reduced-motion: reduce` → không có `setInterval` (test). Hover hoặc focus vào slider → dừng (test).
- HTML `/` có đúng một `h1`, mỗi section có `h2`. Có `<script type="application/ld+json">` FAQPage khi có FAQ.
- `views-client-safe.test.tsx` pass (P6 dùng được View trong khung xem trước).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Trang chủ mới làm rớt e2e public cũ (chữ, thứ tự) | Trung bình × Trung bình | Bố cục mặc định chép đúng nội dung cũ. Chạy `pnpm e2e --project public` trước khi đóng phase |
| Fetch `/api/public/home` bị cache cũ sau khi đăng | Trung bình × Trung bình | Tag `public-home` + path `/`. P7 e2e kiểm đăng → `/` đổi trong thời gian chờ (poll như e2e page-2 của plan trước) |
| `:has()` không chạy trên trình duyệt cũ | Thấp × Thấp | Không có `:has()` thì mọi panel cùng hiện, vẫn đọc được |
| First Load JS `/` tăng do island | Thấp × Thấp | Hai island nhỏ (rail, autoplay). P7 đo bằng script của P1, ngân sách mặc định +15 KB encoded so với số "trước" |
| View lỡ import code server-only | Thấp × Cao (P6 vỡ) | Test client-safe ở bước 9 |

## Security Considerations
- Mọi chữ do admin nhập render qua React (escape). Không `dangerouslySetInnerHTML`, trừ JSON-LD đã qua `serializeJsonLd`.
- Link đã qua `safeHrefSchema` ở API. View vẫn đi qua `PublicSmartLink` (link ngoài có `rel="noopener noreferrer"`).
- Trang chỉ đọc endpoint public (bản đăng).

## Rollback
- Hoàn tác bằng git (xoá file mới, `git restore` file đã sửa): `/` về trang cũ (lookbook nổi bật + "Outfit khác"). Bố cục đã đăng còn trong DB, không ảnh hưởng. `OutfitCardGrid` về 4 cột cố định.

## Next Steps
- P6 import `HOME_SECTION_VIEWS` (`mode='preview'`) cho khung xem trước và `HomeSectionList` cho trang Xem trước. P7 viết e2e trang chủ.
