# Ma trận sở hữu file

Đường dẫn tính từ gốc repo `D:\MyProject\affliate`. Viết tắt: `S` = `packages/shared/src`, `A` = `apps/api/src`, `AT` = `apps/api/test`, `W` = `apps/web/src`, `WT` = `apps/web/test`.

Mỗi file thuộc **một** phase. Phase khác chỉ đọc/import. Cần sửa file của phase khác: báo lead, lead quyết (sửa tuần tự sau khi chủ xong, hoặc chuyển chủ). Ký hiệu: (C) tạo, (M) sửa, (D) xoá, (C?) / (M?) chỉ khi điều kiện trong phase xảy ra.

## Phase 1: Nền
Shared:
- (C) `S/home-sections/campaign-banner-section.ts`, `S/home-sections/marquee-section.ts`, `S/home-sections/gallery-section.ts`, `S/home-sections/newsletter-signup-section.ts`
- (M) `S/home-sections/section-common-schemas.ts`, `S/home-sections/hero-slider-section.ts`, `S/home-sections/collection-tiles-section.ts`, `S/home-sections/outfit-list-section.ts`, `S/home-sections/text-with-image-section.ts`, `S/home-sections/faq-section.ts`
- (M) `S/home-sections/home-section-union.ts`, `S/home-sections/home-section-defaults.ts`, `S/home-sections/home-section-meta.ts`, `S/home-sections/default-home-content.ts`, `S/home-sections/index.ts`, `S/home-sections/home-section-schemas.test.ts`
- (C) `S/newsletter-contract.ts`, `S/newsletter-contract.test.ts`
- (M) `S/home-layout-contract.ts`, `S/settings-schemas.ts`, `S/settings-schemas.test.ts`, `S/api-contract.ts`, `S/index.ts`
- (C) `S/fixtures/sample-editorial-sections.ts`, `S/fixtures/sample-newsletter.ts`; (M) `S/fixtures/index.ts`

Web:
- (M) `W/styles/design-tokens.css`, `W/styles/client-theme-tokens.css`, `W/styles/admin-theme-tokens.css`, `W/app/layout.tsx`, (M?) `W/app/globals.css`
- (C) `W/components/public/public-button.module.css` (Q1 đã chốt)
- (M) `W/components/admin/home-editor/home-section-field-specs.ts`, `W/components/admin/home-editor/section-summary.ts`
- (M) `W/components/admin/home-editor/field-specs/common-fields.ts`, `W/components/admin/home-editor/field-specs/hero-slider-fields.ts`, `W/components/admin/home-editor/field-specs/outfit-list-fields.ts`
- (C) `W/components/admin/home-editor/field-specs/campaign-banner-fields.ts`, `W/components/admin/home-editor/field-specs/marquee-fields.ts`, `W/components/admin/home-editor/field-specs/gallery-fields.ts`, `W/components/admin/home-editor/field-specs/newsletter-signup-fields.ts`
- (M) `W/components/admin/home-editor/use-section-preview-data.ts` (`DATA_TYPES` suy từ `HOME_SECTION_META.resolvesData`)
- (M) `WT/admin/home-editor/home-editor-fixture.ts` (`sampleSection` tìm cả 2 mảng fixture)

Tuần tự 1/2 (chỉ thêm nhánh rỗng):
- (M) `A/services/home-section-resolver-service.ts`
- (M) `W/components/home-sections/home-section-views.ts`

## Phase 2: API
- (C) `A/models/newsletter-subscriber-model.ts`
- (C) `A/services/newsletter-subscribe-service.ts`, `A/services/newsletter-admin-service.ts`, `A/services/newsletter-csv-export.ts`, `A/services/settings-newsletter-consent-service.ts`, `A/services/home-section-gallery-resolver.ts`
- (C) `A/routes/public-newsletter-routes.ts`, `A/routes/admin-newsletter-routes.ts`, `A/middleware/newsletter-rate-limit-middleware.ts`, `A/lib/mongo-query-helpers.ts`
- (M, tuần tự 2/2) `A/services/home-section-resolver-service.ts`
- (M) `A/services/home-section-resolve-context.ts`, `A/services/home-section-outfit-list-resolver.ts`, `A/services/settings-service.ts`, `A/models/settings-model.ts`
- (M) `A/services/collection-service.ts`, `A/services/outfit-service.ts`, `A/services/home-layout-service.ts`
- (M) `A/lib/runtime-defaults.ts`, `A/create-app.ts`, `A/db/mongo-connection.ts`
- (C) `AT/newsletter-subscribe.test.ts`, `AT/newsletter-rate-limit.test.ts`, `AT/newsletter-admin.test.ts`, `AT/newsletter-csv-export.test.ts`, `AT/home-layout-new-sections-resolve.test.ts`, `AT/settings-newsletter-consent.test.ts`; (M?) `AT/helpers/test-app.ts`
- (M) `.env.example`, `apps/api/.env.example`, `infra/docker-compose.yml`, `docs/deployment-guide.md`

## Phase 3: Shell + trang public
- (M) `W/components/public/site-header.tsx`, `W/components/public/site-header.module.css`, `W/components/public/site-footer.tsx`, `W/components/public/site-footer.module.css`, `W/components/public/site-footer-columns.tsx`, `W/components/public/site-social-links.tsx`, `W/components/public/site-announcement-bar.module.css`, `W/components/public/public-shell.module.css`, `W/components/public/public-page.module.css`
- (M?) `W/components/public/public-nav-links.tsx`, `W/components/public/public-copy.ts`
- (M) `W/components/public/outfit-card.tsx`, `W/components/public/outfit-card.module.css`, `W/components/public/collection-card.tsx`, `W/components/public/collection-card.module.css`, `W/components/public/collection-header.module.css`, `W/components/public/lookbook-card.module.css`
- (M) `W/components/public/look-breadcrumb.module.css`, `W/components/public/looks-pagination.module.css`, `W/components/public/public-message.tsx`, `W/components/public/public-message.module.css`, `W/components/public/related-outfits-section.tsx`, `W/components/public/related-outfits-section.module.css`
- (C?) `W/components/public/site-footer-wordmark.tsx`
- (M) `W/components/lookbook/lookbook.module.css`
- (M) `W/app/(public)/looks/looks-page.module.css`, `W/app/(public)/collections/collections-page.module.css`, `W/app/(public)/collections/[slug]/collection-page.module.css`; (M?) `W/app/(public)/not-found.tsx`, `W/app/not-found.tsx`
- (M?) `WT/public/site-header.test.tsx`, `WT/public/site-footer.test.tsx`, `WT/public/site-announcement-bar.test.tsx`, `WT/public/outfit-card-grid.test.tsx`, `WT/public/collection-card-grid.test.tsx`, `WT/public/related-outfits-section.test.tsx`, `WT/public/looks-pagination.test.tsx`; (C?) `WT/public/site-footer-wordmark.test.tsx`
- (M?) `WT/lookbook/lookbook-layout.test.tsx`, `WT/app/looks-page.test.tsx`, `WT/app/look-page.test.tsx`, `WT/app/collections-page.test.tsx`, `WT/app/collection-detail-page.test.tsx`

## Phase 4: Section trang chủ
- (C) `W/components/home-sections/campaign-banner-view.tsx`, `W/components/home-sections/campaign-banner.module.css`, `W/components/home-sections/marquee-view.tsx`, `W/components/home-sections/marquee.module.css`
- (C) `W/components/home-sections/gallery-view.tsx`, `W/components/home-sections/gallery-mosaic.module.css`, `W/components/home-sections/gallery-image-sizes.ts`, `W/components/home-sections/gallery-mosaic-layout.ts`
- (C) `W/components/home-sections/newsletter-signup-view.tsx`, `W/components/home-sections/newsletter-signup.module.css`, `W/components/home-sections/newsletter-submit-button.tsx`
- (C) `W/lib/newsletter/subscribe-newsletter-action.ts`, `W/lib/newsletter/newsletter-client-ip.ts` (ngoài `components/home-sections/` để không vướng `views-client-safe.test.tsx`)
- (M, tuần tự 2/2) `W/components/home-sections/home-section-views.ts`
- (M) `W/components/home-sections/home-section-list.tsx`, `W/components/home-sections/home-section-copy.ts`, `W/components/home-sections/section-shell.tsx`, `W/components/home-sections/section-shell.module.css`
- (M) `W/components/home-sections/hero-slider-view.tsx`, `W/components/home-sections/hero-slider.module.css`, `W/components/home-sections/hero-slider-autoplay.tsx`, (M?) `W/components/home-sections/hero-image-props.ts`
- (M) `W/components/home-sections/outfit-list.module.css`, `W/components/home-sections/outfit-list-tabs.tsx`, `W/components/home-sections/outfit-list-view.tsx`, `W/components/home-sections/scroll-rail.module.css`, `W/components/home-sections/collection-tiles-view.tsx`; (M?) `W/components/home-sections/featured-lookbook-view.tsx`, `W/components/home-sections/outfit-card-rail.tsx`, `W/components/home-sections/scroll-rail.tsx`
- (M) `W/components/home-sections/text-with-image-view.tsx`, `W/components/home-sections/text-with-image.module.css`, `W/components/home-sections/faq-view.tsx`, `W/components/home-sections/faq.module.css`, `W/components/home-sections/commitments-view.tsx`, `W/components/home-sections/commitments.module.css`
- (M) `W/app/(public)/page.tsx`, `W/lib/api-client-server.ts`
- (C, tạm, xoá trước khi đóng phase) `W/app/newsletter-prg-spike/page.tsx`
- (C) `WT/home-sections/campaign-banner-view.test.tsx`, `WT/home-sections/marquee-view.test.tsx`, `WT/home-sections/gallery-view.test.tsx`, `WT/home-sections/newsletter-signup-view.test.tsx`, `WT/home-sections/gallery-mosaic-layout.test.ts`, `WT/lib/newsletter/subscribe-newsletter-action.test.ts`, `WT/lib/newsletter/newsletter-client-ip.test.ts`, `WT/lib/api-client-server-post.test.ts`
- (M) `WT/home-sections/views-client-safe.test.tsx`, `WT/home-sections/home-section-list.test.tsx`, `WT/home-sections/hero-slider.test.tsx`, `WT/app/home-page.test.tsx`; (M?) `WT/home-sections/outfit-list-view.test.tsx`, `WT/home-sections/faq-view.test.tsx`, `WT/home-sections/commitments-view.test.tsx`, `WT/home-sections/text-with-image-view.test.tsx`, `WT/lib/public-home-loaders.test.ts`

## Phase 5: Admin
- (C) `W/app/admin/(protected)/newsletter/page.tsx`, `W/app/admin/(protected)/newsletter/loading.tsx`, `W/app/admin/_lib/admin-newsletter-api.ts`
- (C) `W/components/admin/newsletter/newsletter-list-filters.tsx`, `W/components/admin/newsletter/newsletter-list-query.ts`, `W/components/admin/newsletter/newsletter-list-table.tsx`, `W/components/admin/newsletter/newsletter-row-actions.tsx`, `W/components/admin/newsletter/newsletter-copy.ts`
- (C) `W/components/admin/settings/settings-newsletter-consent-fields.tsx`
- (M) `W/lib/admin-paths.ts`, `W/components/admin/admin-nav.tsx`
- (M) `W/components/admin/settings-form.tsx`, `W/components/admin/settings/settings-form-state.ts`, `W/components/admin/settings/settings-form-errors.ts`
- (M?) `W/components/admin/home-editor/home-editor.module.css`, `W/components/admin/home-editor/section-card.module.css`, `W/components/admin/home-editor/home-preview-pane.module.css`
- (M?) `W/components/admin/admin.module.css`, `W/components/admin/admin-list.module.css`, `W/components/admin/admin-form.module.css`, `W/components/admin/admin-editor.module.css`, `W/components/admin/editor-tabs.module.css`, `W/components/admin/admin-dropzone.module.css`, `W/components/admin/overview/overview.module.css`
- (M?) `W/components/admin/shell/admin-shell.module.css`, `W/components/admin/shell/admin-sidebar.module.css`, `W/components/admin/shell/admin-toast.module.css`, `W/components/admin/shell/admin-skeleton.module.css`, `W/app/admin/login/login-page.module.css`
- (C) `WT/admin/newsletter/newsletter-list-table.test.tsx`, `WT/admin/newsletter/newsletter-row-actions.test.tsx`, `WT/admin/newsletter/newsletter-list-query.test.ts`, `WT/admin/settings-newsletter-consent-fields.test.tsx`, `WT/app/admin-newsletter-page.test.tsx`
- (M) `WT/admin/admin-nav.test.tsx`, `WT/admin/settings-form.test.tsx`; (M?) `WT/admin/home-editor/*` (trừ `home-editor-fixture.ts` của P1 và `home-section-field-specs.test.ts`: không ai sửa)

## Phase 6: Test, kiểm chứng, docs
- (C) `e2e/content-newsletter-signup.spec.ts`, `e2e/content-newsletter-admin.spec.ts`, `e2e/content-editorial-sections-render.spec.ts`, `e2e/support/newsletter-fixtures.ts`, `e2e/support/editorial-home-layout.ts`
- (M) `e2e/content.teardown.ts`; (M?) `e2e/content.setup.ts`, `e2e/support/admin-settings.ts`, `e2e/support/home-layout.ts`, `e2e/public-*.spec.ts`, `e2e/content-*.spec.ts` cũ (ghi lý do), `playwright.config.ts`
- (M) `e2e/visual-reference-screenshots.spec.ts-snapshots/*` (Q2 đã chốt; chỉ sau khi chủ repo duyệt ảnh)
- (M) `docs/system-architecture.md`, `docs/code-standards.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`
- (C) `plans/reports/tester-261108-editorial-redesign-e2e.md`, `plans/reports/ui-consistency-verifying-261108-editorial-redesign.md`
- Lead: `plans/261108-0923-editorial-luxury-redesign-and-new-sections/plan.md`

## Không ai sửa (chỉ đọc)
- `W/components/ui/*`, `W/components/motion/*`, `W/styles/motion-primitives.module.css`, `W/hooks/**`, `W/lib/**` (trừ `api-client-server.ts` + `lib/newsletter/**` của P4, `admin-paths.ts` của P5), `W/app/api/revalidate/route.ts`, `W/app/robots.ts`, `W/app/sitemap.ts`, `W/app/(public)/{layout,template}.tsx`, `W/app/(public)/look/[slug]/page.tsx`
- `W/components/lookbook/*` trừ `lookbook.module.css` (P3); `W/components/public/{hide-on-scroll-header,public-smart-link,public-page,collection-card-grid,outfit-card-grid,public-breadcrumb,look-breadcrumb,looks-pagination}.tsx` (P3 chỉ đổi CSS module đi kèm)
- `WT/admin/home-editor/home-section-field-specs.test.ts` (test tổng quát, P1 phải làm nó xanh mà không sửa)
- `e2e/visual-reference-screenshots.spec.ts` (file spec), `A/middleware/{login-rate-limit,origin-check,error-handler,require-admin,json-only,session,validate-body}-middleware.ts`, `A/config/*`, `infra/caddy/Caddyfile`
- `package.json`, `apps/*/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (không dependency mới), `scripts/perf/measure-first-load-js.mjs` (P6 chỉ chạy)

## Kết quả rà trùng (2026-11-08)
- Rà bằng script node (mở rộng viết tắt, gom mọi đường dẫn trong backtick theo phase, so trùng; đối chiếu thêm với danh sách "Không ai sửa"): 231 đường dẫn (chạy lại sau bản sửa theo red team), 2 trùng, đúng bằng 2 cặp tuần tự dưới đây; không đường dẫn nào vừa có chủ vừa nằm trong danh sách chỉ đọc. Mục dạng `{a,b}` trong danh sách chỉ đọc kiểm tay.
- Cặp tuần tự đã khai (không chạy song song vì P1 xong trước Wave 2):
  - `A/services/home-section-resolver-service.ts`: P1 thêm 4 nhánh rỗng → P2 thay bằng resolver thật.
  - `W/components/home-sections/home-section-views.ts`: P1 thêm 4 entry render `null` → P4 thay bằng view thật.
- Chuyển chủ có lý do (khác phân công gốc):
  - Field spec + summary editor (`home-section-field-specs.ts`, `section-summary.ts`, `field-specs/**`) nằm trong `components/admin/**` nhưng thuộc P1: là bản soi 1:1 schema, test tổng quát đòi field cho mọi prop ngay khi union đổi.
  - `public-button.module.css` nằm trong `components/public/**` nhưng thuộc P1 (Q1): P3 và P4 cùng dùng trong Wave 2.
  - `home-editor-fixture.ts` (test helper P5) thuộc P1 (red team H1): union đổi làm `sampleSection` vỡ ngay trong P1, P1 phải sửa để xanh.
  - `use-section-preview-data.ts` thuộc P1 (red team F4): `DATA_TYPES` suy từ cờ `resolvesData` trong meta, cùng nhịp với union.
  - Server Action + helper IP newsletter ở `W/lib/newsletter/**` (P4), không ở `components/home-sections/` (red team H2): regex của `views-client-safe.test.tsx` giữ nguyên.
  - `docs/deployment-guide.md` thuộc P2 (env mới), không thuộc P6.
  - `WT/app/*` chia theo chủ đề: trang public cho P3, `home-page` cho P4, `admin-*` cho P5; `sitemap.test.ts`, `protected-layout.test.tsx` không ai sửa.
- Điểm dễ đụng đã tách:
  - File hub shared (`index.ts`, `api-contract.ts`, `settings-schemas.ts`, `home-layout-contract.ts`) chỉ P1. Đổi contract phải qua lead → P1.
  - `settings-form*` (form) thuộc P5; `settings-service.ts`/`settings-model.ts` (API) thuộc P2; schema thuộc P1.
  - `api-client-server.ts` chỉ P4 sửa (thêm `apiPost`); admin dùng `apiFetch` phía browser, không đụng.
  - `outfit-card*`, `collection-card*` thuộc P3; P4 chỉ dùng (rail, lưới, gallery tự có markup riêng).
  - Pagination admin: P5 import thẳng `CollectionPagination`, không đổi tên/xoá file (red team F12).
  - 3 token CSS chỉ P1. Thiếu token ở P3-P5: báo lead, P1 thêm.
  - Route spike tạm `W/app/newsletter-prg-spike/page.tsx` chỉ P4, xoá trước khi đóng phase.
