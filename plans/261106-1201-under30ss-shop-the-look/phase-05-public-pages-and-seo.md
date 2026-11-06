# Phase 05 — Public pages & SEO

## Context Links
- [plan.md](./plan.md) · [phase-01 contract](./phase-01-foundation-and-contracts.md) · [phase-04 LookbookLayout](./phase-04-lookbook-ui-components.md)

## Overview
- Priority: P1 · Status: Done — chờ kiểm runtime với dữ liệu thật, Lighthouse ở P7 · Effort: 6h · Wave 3 (song song P6) · blockedBy: P1, P4
- Route `/` + `/look/[slug]`, 404, metadata/OG/canonical, JSON-LD, sitemap, robots, route nhận revalidate.

## File Ownership
- `apps/web/src/app/page.tsx`, `apps/web/src/app/look/**`, `apps/web/src/app/not-found.tsx`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`, `apps/web/src/app/api/revalidate/**`, `apps/web/src/lib/seo/**`, `apps/web/test/public/**`
- Chỉ đọc/import: `packages/shared/**`, `components/lookbook/**`, `lib/api-client-server.ts`, `lib/media-url.ts`

## Key Insights
- Gọi API theo hợp đồng P1; P2 có thể chưa xong → unit test dùng fixture, chạy thật ở P7.
- Chưa có giá → không `Product`; dùng `CollectionPage` + `ItemList`.
- `rel="sponsored"` (đã trong P4) đúng hướng dẫn Google cho link affiliate.
- On-demand revalidate: tĩnh mà vẫn cập nhật ngay khi admin lưu.

## Requirements
- `/look/[slug]`: fetch `/api/public/outfits/:slug` (tag `outfit:<slug>`), 404 nếu không có; render `<LookbookLayout outfit headingLevel="h1">`.
- `/`: fetch featured; không có featured → trang trống thân thiện (không lỗi).
- `generateMetadata`: title `{outfit.title} | {settings.siteName}`, description `seoDescription` fallback settings, OG/Twitter image = ảnh người mẫu, canonical `/look/{slug}`; `/` canonical → `/look/{featured-slug}`.
- JSON-LD `CollectionPage` + `ItemList` (name, url = affiliate hoặc trang, image); escape `<` khi stringify.
- `sitemap.ts` từ `/api/public/outfits/slugs`; `robots.ts` chặn `/admin`, `/api`.
- `POST /api/revalidate`: so secret constant-time (`crypto.timingSafeEqual`), `revalidatePath` từng path trong body; thiếu/sai secret → 401.

## Related Code Files (create)
- `app/page.tsx`, `app/look/[slug]/page.tsx`, `app/not-found.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/api/revalidate/route.ts`
- `lib/seo/build-outfit-metadata.ts`, `lib/seo/build-outfit-json-ld.ts`, `lib/seo/outfit-json-ld-script.tsx`
- `test/public/build-outfit-json-ld.test.ts`, `test/public/build-outfit-metadata.test.ts`, `test/public/revalidate-route.test.ts`

## Implementation Steps
1. Kiểm doc Next.js hiện hành (context7): `generateMetadata`, `revalidatePath`, `sitemap.ts`, fetch tags.
2. Builders metadata + JSON-LD + test (fixture).
3. Pages + 404.
4. Sitemap, robots.
5. Revalidate route + test (đúng/sai secret).

## Todo List
- [x] Metadata + JSON-LD builders + tests
- [x] `/look/[slug]` + `/` + 404
- [x] Sitemap + robots
- [x] Revalidate route + test

## Success Criteria
- Test P5 pass; `pnpm --filter web typecheck` sạch.
- (Kiểm ở P7) `curl` HTML có đủ tên/mô tả/link; Lighthouse SEO ≥95.

## Risk Assessment
- Hợp đồng API khác thực tế P2 → lỗi lộ ở P7; giảm thiểu bằng type chung `api-contract.ts`.

## Security Considerations
- Secret revalidate chỉ qua network nội bộ; JSON-LD escape.

## Next Steps
- P7 e2e + Lighthouse.

## Ghi chú đồng bộ 2026-11-06
Đối chiếu với `apps/web/src/app/**`, `apps/web/src/lib/seo/**`, `apps/web/test/**`.
- Không dùng fetch tag `outfit:<slug>` (fix L4). Chỉ `revalidatePath` + safety `revalidate: PUBLIC_REVALIDATE_SECONDS` (`lib/seo/public-data-loaders.ts:17`). Spec Requirements ghi tag.
- `/` là `force-dynamic`; `/look/[slug]` dynamic có cache. Không có `generateStaticParams`.
- Thêm `components/public/**` (`public-page`, `public-message`, `public-copy`). Ngoài ownership ghi trong spec.
- Test nằm ở `test/public/**` (JSON-LD, metadata, revalidate) và `test/app/**` (sitemap, look page, admin-api, protected layout, admin list). `test/app/**` không có trong ownership P5/P6.
- Revalidate route: đọc `revalidateRequestSchema` (`{paths}` hoặc `{scope:'all'}`, fix M6); env lỗi → 500 không gọi `revalidatePath` (test có).
- Chưa kiểm: HTML thật có tên/mô tả/link (`curl`) với dữ liệu seed; Lighthouse SEO ≥95; Google rich results; sitemap với slug thật. Chuyển P7.
