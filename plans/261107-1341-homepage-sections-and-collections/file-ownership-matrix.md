# Ma trận sở hữu file

Đường dẫn tính từ gốc repo `D:\MyProject\affliate`. Viết tắt:
- `S` = `packages/shared/src`
- `A` = `apps/api/src`, `AT` = `apps/api/test`
- `W` = `apps/web/src`, `WT` = `apps/web/test`

Mỗi file chỉ thuộc **một** phase. Phase khác chỉ được đọc / import. Cần sửa file của phase khác thì báo lead. Lead quyết: sửa tuần tự sau khi phase chủ xong, hoặc chuyển chủ.

Ký hiệu: (M) sửa, (C) tạo mới, (D) xoá.

## Phase 1: Contract + hub + checklist
Shared (`S`):
- (C) `safe-href.ts`, `safe-href.test.ts`, `object-id-schema.ts`
- (C) `collection-schemas.ts`, `collection-contract.ts`, `collection-schemas.test.ts`, `home-layout-contract.ts`
- (C) `home-sections/`: `section-common-schemas.ts`, `hero-slider-section.ts`, `collection-tiles-section.ts`, `outfit-list-section.ts`, `featured-lookbook-section.ts`, `text-with-image-section.ts`, `faq-section.ts`, `commitments-section.ts`, `home-section-union.ts`, `home-section-defaults.ts`, `home-section-meta.ts`, `default-home-content.ts`, `index.ts`, `home-section-schemas.test.ts`
- (C) `fixtures/sample-collections.ts`, `fixtures/sample-home-sections.ts`, `fixtures/sample-announcement.ts`
- (M) `outfit-schemas.ts`, `outfit-schemas.test.ts`, `settings-schemas.ts`, `settings-schemas.test.ts`, `api-contract.ts`, `revalidate-contract.ts`, `index.ts`, `fixtures/index.ts`

Web (`W`, `WT`):
- (M) `W/app/api/revalidate/route.ts`, `WT/public/revalidate-route.test.ts`
- (M) `W/lib/seo/public-data-loaders.ts`, `W/lib/admin-paths.ts`
- (M) `W/styles/client-theme-tokens.css`, `W/styles/design-tokens.css`, `W/styles/admin-theme-tokens.css` (chỉ khi checklist cần)
- (C) `W/components/public/public-smart-link.tsx`, `collection-card.tsx`, `collection-card.module.css`, `collection-card-image-sizes.ts`, `collection-card-grid.tsx`
- (C) `WT/public/public-smart-link.test.tsx`, `WT/public/collection-card-grid.test.tsx`

Script:
- (C) `scripts/perf/measure-first-load-js.mjs`

Plan dir:
- (C) `ui-consistency-checklist.md`, `perf-baseline-first-load-js.md`

## Phase 2: API
Model, DB, lib:
- (C) `A/models/collection-model.ts`, `A/models/page-layout-model.ts`
- (M) `A/models/outfit-model.ts`, `A/models/settings-model.ts`, `A/db/mongo-connection.ts`, `A/lib/app-context.ts`

Service:
- (C) `A/services/collection-service.ts`, `collection-mapper.ts`, `collection-membership-service.ts`, `public-collection-service.ts`
- (C) `A/services/home-layout-service.ts`, `home-layout-publish-service.ts`, `home-layout-guards.ts`, `home-section-resolver-service.ts`, `home-section-image-mapper.ts`, `settings-chrome-service.ts`
- (M) `A/services/outfit-mapper.ts`, `outfit-service.ts`, `public-outfit-service.ts` (thêm `getPublishedOutfitById`), `revalidate-web-service.ts`, `settings-service.ts`

Route, app:
- (C) `A/routes/admin-collection-routes.ts`, `public-collection-routes.ts`, `admin-home-routes.ts`, `public-home-routes.ts`
- (M) `A/routes/admin-outfit-routes.ts`, `A/create-app.ts`

Test:
- (C) `AT/collections-admin-crud.test.ts`, `collections-membership-and-order.test.ts`, `collections-public.test.ts`, `outfit-collection-ids.test.ts`, `home-layout-admin.test.ts`, `home-layout-publish-restore.test.ts`, `home-layout-public-resolve.test.ts`, `settings-chrome-fields.test.ts`
- (M) `AT/helpers/test-app.ts`, `AT/outfits-public-and-revalidation.test.ts`

## Phase 3: Bộ sưu tập UI
Admin:
- (C) `W/app/admin/(protected)/collections/page.tsx`, `loading.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/loading.tsx`
- (C) `W/app/admin/_lib/admin-collection-api.ts`
- (C) `W/components/admin/collections/`: `collection-list-filters.tsx`, `collection-list-query.ts`, `collection-list-table.tsx`, `collection-order-buttons.tsx`, `collection-form.tsx`, `collection-form-state.ts`, `collection-outfits-panel.tsx`, `collection-delete-action.tsx`, `collections.module.css`
- (C) `W/components/admin/pickers/`: `admin-entity-picker.tsx`, `admin-entity-picker.module.css`, `use-entity-search.ts`, `outfit-picker.tsx`, `collection-picker.tsx`
- (M) `W/components/admin/outfit-details-form.tsx`, `W/hooks/admin/editor-state.ts`, `W/components/admin/map-errors-to-editor-tabs.ts`
- (M, **tuần tự 1/2**) `W/components/admin/admin-nav.tsx`, `WT/admin/admin-nav.test.tsx`

Public:
- (C) `W/app/(public)/collections/page.tsx`, `collections-page.module.css`, `[slug]/page.tsx`, `[slug]/collection-page.module.css`
- (C) `W/components/public/collection-header.tsx`, `collection-header.module.css`, `collection-copy.ts`, `public-breadcrumb.tsx`
- (M) `W/components/public/looks-pagination.tsx`, `W/components/public/look-breadcrumb.tsx`
- (C) `W/lib/seo/public-collection-loaders.ts`, `W/lib/seo/build-collection-metadata.ts`
- (M) `W/lib/seo/absolute-url.ts`, `W/app/sitemap.ts`

Test:
- (C) `WT/admin/collections/collection-form.test.tsx`, `collection-list-table.test.tsx`, `collection-outfits-panel.test.tsx`, `WT/admin/pickers/admin-entity-picker.test.tsx`
- (C) `WT/app/collections-page.test.tsx`, `collection-detail-page.test.tsx`, `admin-collections-pages.test.tsx`
- (C) `WT/lib/build-collection-metadata.test.ts`, `public-collection-loaders.test.ts`
- (M) `WT/admin/editor-state.test.ts`, `WT/admin/outfit-editor.test.tsx`, `WT/app/sitemap.test.ts`, `WT/public/looks-pagination.test.tsx`

## Phase 4: Renderer + trang chủ
`W/components/home-sections/`:
- (C) danh sách: `home-section-list.tsx`, `home-section-views.ts`, `home-section-copy.ts`, `section-shell.tsx`, `section-shell.module.css`
- (C) slider: `hero-slider-view.tsx`, `hero-slider-autoplay.tsx`, `hero-slider.module.css`, `hero-image-props.ts`
- (C) rail: `scroll-rail.tsx`, `scroll-rail.module.css`
- (C) bộ sưu tập, lookbook: `collection-tiles-view.tsx`, `featured-lookbook-view.tsx`
- (C) outfit: `outfit-list-view.tsx`, `outfit-list-tabs.tsx`, `outfit-card-rail.tsx`, `outfit-list.module.css`
- (C) chữ + ảnh: `text-with-image-view.tsx`, `text-with-image.module.css`, `split-paragraphs.ts`
- (C) FAQ: `faq-view.tsx`, `faq.module.css`
- (C) cam kết: `commitments-view.tsx`, `commitment-icons.ts`, `commitments.module.css`

Trang, loader, component public:
- (C) `W/lib/seo/public-home-loaders.ts`, `build-faq-json-ld.ts`, `faq-json-ld-script.tsx`
- (M) `W/app/(public)/page.tsx`
- (M) `W/components/public/outfit-card-grid.tsx`, `outfit-card.module.css`, `outfit-grid-columns.ts`

Test:
- (C) `WT/home-sections/home-section-list.test.tsx`, `hero-slider.test.tsx`, `outfit-list-view.test.tsx`, `faq-view.test.tsx`, `views-client-safe.test.tsx`, `text-with-image-view.test.tsx`, `commitments-view.test.tsx`
- (C) `WT/lib/build-faq-json-ld.test.ts`, `public-home-loaders.test.ts`
- (M) `WT/app/home-page.test.tsx`, `WT/public/outfit-card-grid.test.tsx`

## Phase 5: Dải thông báo, header, footer, Cài đặt
Public:
- (M) `W/components/public/public-shell.tsx`, `public-shell.module.css` (chỉ khi cần), `public-copy.ts`, `site-header.tsx`, `site-header.module.css`, `site-footer.tsx`, `site-footer.module.css`, `public-nav-items.ts`, `public-nav-links.tsx`
- (C) `W/components/public/site-announcement-bar.tsx`, `site-announcement-bar.module.css`, `site-footer-columns.tsx`, `site-social-links.tsx`

Admin:
- (M) `W/components/admin/settings-form.tsx`, `settings-listing-fields.tsx`
- (C) `W/components/admin/settings/`: `settings-form-state.ts`, `settings-announcement-fields.tsx`, `settings-collections-nav-fields.tsx`, `settings-footer-columns-editor.tsx`, `settings-social-links-editor.tsx`, `settings-repeatable-list.module.css`

Test:
- (C) `WT/public/site-footer.test.tsx`, `WT/public/site-announcement-bar.test.tsx`, `WT/admin/settings-footer-editor.test.tsx`, `WT/admin/settings-announcement-fields.test.tsx`
- (M) `WT/public/site-header.test.tsx`, `WT/admin/settings-form.test.tsx`

## Phase 6: Editor trang chủ (registry)
Route:
- (C) `W/app/admin/(protected)/home/page.tsx`, `home/loading.tsx`, `W/app/admin/home-preview/page.tsx`, `W/app/admin/_lib/admin-home-api.ts`

`W/components/admin/home-editor/`:
- (C) màn hình + toolbar: `home-editor-screen.tsx`, `home-editor-toolbar.tsx`, `home-editor-more-menu.tsx`, `home-editor-copy.ts`, `home-editor.module.css`
- (C) state + API: `use-home-layout-state.ts`, `use-home-layout-actions.ts`, `use-section-preview-data.ts`, `map-layout-errors.ts`, `move-section.ts`
- (C) danh sách: `section-list-panel.tsx`, `section-card.tsx`, `section-card.module.css`, `section-reorder-announcements.ts`, `add-section-dialog.tsx`
- (C) form: `section-form.tsx`, `section-array-field.tsx`, `home-section-field-specs.ts` (+ `field-specs/*`), `section-image-field.tsx`, `section-outfits-field.tsx`, `section-collections-field.tsx`
- (C) xem trước: `home-preview-pane.tsx`, `home-preview-pane.module.css`

Toast admin (thêm nút hành động, giữ chữ ký cũ):
- (M) `W/components/admin/shell/admin-toast-provider.tsx`, `use-admin-toast.ts`, `admin-toast.module.css`, `WT/admin/admin-toast.test.tsx`

Test:
- (C) `WT/admin/home-editor/`: `use-home-layout-actions.test.tsx`, `use-home-layout-state.test.ts`, `move-section.test.ts`, `map-layout-errors.test.ts`, `home-section-field-specs.test.ts`, `section-card.test.tsx`, `add-section-dialog.test.tsx`, `section-form.test.tsx`, `home-preview-pane.test.tsx`, `home-editor-toolbar.test.tsx`
- (C) `WT/app/admin-home-preview-page.test.tsx`
- (M, **tuần tự 2/2**, sau P3) `W/components/admin/admin-nav.tsx`, `WT/admin/admin-nav.test.tsx`

## Phase 7: Test, kiểm chứng, docs
- (C) `e2e/content-collections-flow.spec.ts`, `content-home-editor-flow.spec.ts`, `content-home-editor-mobile.spec.ts`, `content-home-sections-render.spec.ts`, `content-footer-and-nav.spec.ts`, `content.teardown.ts`
- (C) `e2e/support/collection-fixtures.ts`, `e2e/support/home-layout.ts`
- (M) `playwright.config.ts`, `e2e/support/admin-settings.ts`, `e2e/public-*.spec.ts` (chỉ khi selector buộc phải đổi, ghi lý do)
- (M) `docs/system-architecture.md`, `docs/code-standards.md`, `docs/deployment-guide.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`
- (C) `plans/reports/tester-261107-homepage-sections-e2e.md`, `plans/reports/ui-consistency-verifying-261107-homepage-sections.md`
- Lead: `plan.md` (trạng thái, kết quả)

## Không ai sửa (chỉ đọc)
- Lookbook: `W/components/lookbook/*` (gồm `lookbook-layout.tsx`, `lookbook.module.css`), `W/components/public/lookbook-card.tsx`
- Public: `W/components/public/{outfit-card,related-outfits-section,public-page,public-message,parse-looks-page-param,build-page-window}.tsx|ts`, `W/app/(public)/{layout,template,not-found}.tsx`, `W/app/(public)/look/[slug]/page.tsx`, `W/app/(public)/looks/page.tsx`, `W/app/not-found.tsx`, `W/app/robots.ts`, `W/app/layout.tsx`, `W/app/globals.css`
- Admin: `W/components/admin/{media-dropzone,media-thumb,confirm-dialog,admin-form-field,admin-panel,save-status-text,field-error,sortable-item-row,item-list-panel,editor-tabs,live-preview-panel,outfit-editor,outfit-editor-toolbar,outfit-list-*,pagination-links,admin.module.css,admin-editor.module.css,editor-tabs.module.css,admin-form.module.css,admin-list.module.css}`, `W/components/admin/shell/*` (trừ 3 file toast của P6), `W/app/admin/layout.tsx`, `W/app/admin/(protected)/layout.tsx`
- Hook, lib: `W/hooks/**` (trừ `editor-state.ts` của P3), `W/lib/{api-client-*,web-env,media-url}.ts`, `W/lib/seo/{build-outfit-*,outfit-json-ld-script,build-looks-metadata}.ts*`
- e2e: `e2e/visual-reference-screenshots.spec.ts` + snapshot
- API: `A/middleware/*`, `A/config/*`, `A/lib/runtime-defaults.ts` (đợt này không thêm env)

## Kết quả rà trùng (2026-11-07)
- Rà lại sau đổi quyết định (bỏ P0/Puck, dải thông báo sang P5, thêm restore + toast hành động) bằng script so basename + đường dẫn của 7 nhóm trên: không file nào nằm ở hai phase, trừ **một cặp tuần tự đã khai**: `admin-nav.tsx` + `admin-nav.test.tsx`. P3 sửa trước (thêm "Bộ sưu tập"), P6 sửa sau (thêm "Trang chủ"). P6 vốn chờ P3 nên không chạy song song.
- Điểm dễ đụng đã tách:
  - File hub của shared (`index.ts`, `api-contract.ts`, `revalidate-contract.ts`, `settings-schemas.ts`, `outfit-schemas.ts`) đều thuộc P1. P2–P6 chỉ import. Đổi contract phải qua lead → P1.
  - `create-app.ts`, `mongo-connection.ts`, `revalidate-web-service.ts`, `settings-service.ts`, `app-context.ts` thuộc P2 (backend gom một phase).
  - Web route `app/api/revalidate/route.ts` thuộc P1 vì nó chỉ thực thi contract revalidate.
  - Loader mới tách file theo tính năng (`public-collection-loaders.ts` của P3, `public-home-loaders.ts` của P4). `public-data-loaders.ts` chỉ P1 sửa (export helper).
  - `public-copy.ts` chỉ P5 sửa (nhãn vùng dải thông báo). Chữ mới khác nằm ở `collection-copy.ts` (P3), `home-section-copy.ts` (P4), `home-editor-copy.ts` (P6). Nhãn bộ sưu tập lấy từ Cài đặt + `DEFAULT_COLLECTIONS_LABEL` (P1).
  - Dải thông báo: schema + mặc định ở P1 (`settings-schemas.ts`), API ở P2 (`settings-chrome-service.ts`), UI public + form ở P5. P4 và P6 không đụng.
  - Hoàn tác lần đăng: contract P1 (`home-layout-contract.ts`), API P2 (`home-layout-publish-service.ts`, `admin-home-routes.ts`), UI P6 (toast + menu), e2e P7.
  - Toast admin (`components/admin/shell/admin-toast*`, `use-admin-toast.ts`) chỉ P6 sửa; token `--toast-action-duration` do P1 thêm vào `design-tokens.css`.
  - `site-header`, `site-footer`, `public-shell`, `public-nav-items` chỉ thuộc P5. P3 không đụng header: link "Bộ sưu tập" do P5 dựng từ `collectionsNavVisible`.
  - `PublicSmartLink` và `CollectionCard*` đặt ở P1 để P4 và P5 (link), P3 và P4 (thẻ bộ sưu tập) cùng dùng mà không phụ thuộc chéo trong Wave 2.
  - `outfit-card-grid.tsx` thuộc P4 (thêm `columnsDesktop`, mặc định giữ 4 cột). P3 chỉ dùng với mặc định.
  - `looks-pagination.tsx`, `look-breadcrumb.tsx` thuộc P3. Trang `/looks`, `/look/[slug]` không sửa.
  - 3 file token CSS thuộc P1. Cần token mới ở P3–P6 thì báo lead, P1 thêm.
  - `apps/web/package.json`, `pnpm-lock.yaml`: không phase nào sửa (không dependency mới).
  - Spec visual và snapshot: không ai sửa, mọi phase chỉ chạy.
