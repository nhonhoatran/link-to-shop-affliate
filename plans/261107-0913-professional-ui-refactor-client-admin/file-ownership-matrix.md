# Ma trận sở hữu file

Đường dẫn tính từ gốc repo `D:\MyProject\affliate`. `W` = `apps/web/src`, `WT` = `apps/web/test`. Mỗi file chỉ thuộc **một** phase. Phase khác chỉ được đọc / import. Cần sửa file của phase khác → báo lead, lead quyết (sửa tuần tự sau khi phase chủ xong, hoặc chuyển chủ).

Quy ước: (M) sửa, (C) tạo mới, (D) xoá, (MV) di chuyển bằng `git mv`.

## Phase 1: Foundation
- (M) `W/app/globals.css`
- (M) `W/styles/design-tokens.css`
- (C) `W/styles/client-theme-tokens.css`
- (C) `W/styles/admin-theme-tokens.css`
- (C) `W/styles/motion-primitives.module.css`
- (M) `W/app/layout.tsx`
- (M) `apps/web/package.json`, (M) `pnpm-lock.yaml`
- (C) `W/hooks/use-modal-dialog.ts`, (C) `WT/hooks/use-modal-dialog.test.tsx`
- (C) `W/components/ui/decorative-icon.tsx`
- (C) `W/components/motion/motion-provider.tsx`
- (M) `e2e/visual-reference-screenshots.spec.ts`, (C) `e2e/visual-reference-screenshots.spec.ts-snapshots/*`
- (C) plan dir: `ui-consistency-checklist.md`, `design-palette-and-contrast.md`

## Phase 2: API + shared + loaders
- (M) `packages/shared/src/api-contract.ts`, `settings-schemas.ts`, `revalidate-contract.ts`, `index.ts`
- (C) `packages/shared/src/public-outfit-list-contract.ts`, `admin-stats-contract.ts`, `settings-schemas.test.ts`
- (M) `apps/api/src/routes/public-outfit-routes.ts`, `create-app.ts`, `services/public-outfit-service.ts`, `services/settings-service.ts`, `services/revalidate-web-service.ts`, `models/settings-model.ts`, `lib/runtime-defaults.ts`, `config/env-config.ts`, `config/env-config.test.ts`
- (C) `apps/api/src/routes/admin-stats-routes.ts`, `services/admin-stats-service.ts`
- (M) `apps/api/test/outfits-public-and-revalidation.test.ts`; (C) `apps/api/test/public-outfit-list.test.ts`, `admin-stats.test.ts`, `settings-listing-fields.test.ts`
- (M) `apps/api/.env.example`, `.env.example`, `infra/docker-compose.yml`, `docs/deployment-guide.md`
- (M) `W/lib/seo/public-data-loaders.ts`, `W/app/admin/_lib/admin-api.ts`
- (M) `WT/app/admin-api.test.ts`, `WT/public/build-outfit-metadata.test.ts`; (C) `WT/lib/public-data-loaders.test.ts`

## Phase 3: Client shell & pages
- (MV+M) `W/app/page.tsx` → `W/app/(public)/page.tsx`
- (MV+M) `W/app/look/[slug]/page.tsx` → `W/app/(public)/look/[slug]/page.tsx`
- (C) `W/app/(public)/layout.tsx`, `W/app/(public)/looks/page.tsx`
- (M) `W/app/not-found.tsx`, `W/app/sitemap.ts`
- (M) `W/components/public/public-page.tsx`, `public-page.module.css`, `public-message.tsx`, `public-message.module.css`, `public-copy.ts`
- (C) `W/components/public/`: `public-shell.tsx`, `public-shell.module.css`, `site-header.tsx`, `site-header.module.css`, `hide-on-scroll-header.tsx`, `public-nav-links.tsx`, `site-footer.tsx`, `site-footer.module.css`, `lookbook-card.tsx`, `lookbook-card.module.css`, `look-breadcrumb.tsx`, `look-breadcrumb.module.css`, `outfit-card.tsx`, `outfit-card-grid.tsx`, `outfit-card.module.css`, `related-outfits-section.tsx`, `related-outfits-section.module.css`, `looks-pagination.tsx`, `looks-pagination.module.css`, `parse-looks-page-param.ts`
- (M) `W/lib/seo/absolute-url.ts`; (C) `W/lib/seo/build-looks-metadata.ts`
- (M) `WT/app/look-page.test.tsx`, `WT/app/sitemap.test.ts`; (C) `WT/app/looks-page.test.tsx`, `WT/app/home-page.test.tsx`, `WT/public/site-header.test.tsx`, `WT/public/outfit-card-grid.test.tsx`, `WT/public/looks-pagination.test.tsx`

## Phase 4: Client animation
- (M) `W/components/lookbook/lookbook-interactions.tsx`, `lookbook-item-card.tsx`, `lookbook-item-column.tsx`, `lookbook-layout.tsx`, `lookbook-model-figure.tsx`
- (C) `W/components/lookbook/lookbook-motion.module.css`, `use-lookbook-ready.ts`
- (C) `W/app/(public)/template.tsx`
- (M) `WT/lookbook/lookbook-interactions.test.tsx`, `lookbook-layout.test.tsx`, `lookbook-remeasure.test.tsx`; (C) `WT/lookbook/lookbook-draw-once.test.tsx`
- Không sửa: `lookbook.module.css`, `measure-connectors.ts`, `compute-connector-paths.ts`, `observe-lookbook-changes.ts`, `lookbook-hotspot.tsx`

## Phase 5: Admin shell, theme, overview
- (M) `W/app/admin/layout.tsx`, `W/app/admin/(protected)/layout.tsx`, `W/app/admin/(protected)/page.tsx` (thành Tổng quan + redirect)
- (C) `W/app/admin/(protected)/outfits/page.tsx` (nội dung list cũ chuyển sang), `W/app/admin/(protected)/loading.tsx`
- (M) `W/app/admin/login/page.tsx`; (C) `W/app/admin/login/login-page.module.css`
- (C) `W/app/admin/_lib/admin-preferences.ts`, `W/app/admin/_lib/admin-preference-actions.ts`
- (M) `W/lib/admin-paths.ts`
- (M) `W/components/admin/admin.module.css`, `admin-nav.tsx`, `logout-button.tsx`
- (C) `W/components/admin/shell/`: `admin-shell.module.css`, `admin-sidebar.tsx`, `admin-sidebar.module.css`, `admin-sidebar-toggle.tsx`, `admin-topbar.tsx`, `admin-nav-drawer.tsx`, `admin-theme-toggle.tsx`, `admin-toast-provider.tsx`, `use-admin-toast.ts`, `admin-toast.module.css`, `admin-skeleton.tsx`, `admin-skeleton.module.css`
- (C) `W/components/admin/overview/`: `overview-kpi-grid.tsx`, `overview-featured-card.tsx`, `overview-recent-list.tsx`, `overview.module.css`
- (M) `WT/app/protected-layout.test.tsx`, `WT/app/admin-list-page.test.tsx` (đổi import sang `outfits/page`); (C) `WT/app/admin-overview-page.test.tsx`, `WT/admin/admin-preference-actions.test.ts`, `WT/admin/admin-toast.test.tsx`, `WT/admin/admin-nav.test.tsx`

## Phase 6: Admin screens
- (M) `W/components/admin/outfit-list-filters.tsx`, `outfit-list-table.tsx`, `outfit-list-query.ts`, `pagination-links.tsx`, `admin-list.module.css`, `user-list.tsx`, `user-create-form.tsx`, `outfit-editor.tsx`, `admin-editor.module.css`, `live-preview-panel.tsx`, `outfit-editor-toolbar.tsx`, `settings-form.tsx`, `validation-messages.ts`, `admin-form.module.css`
- (C) `W/components/admin/editor-tabs.tsx`, `editor-tabs.module.css`, `map-errors-to-editor-tabs.ts`, `settings-listing-fields.tsx`
- (M) `W/hooks/admin/use-outfit-actions.ts`; (C) `W/hooks/admin/use-wide-editor-layout.ts`
- (M) `W/app/admin/(protected)/outfits/new/page.tsx`
- (C) `W/app/admin/(protected)/outfits/loading.tsx`, `outfits/[id]/loading.tsx`, `settings/loading.tsx`, `users/loading.tsx`
- (M) `WT/admin/admin-hooks-and-list-query.test.tsx`, `outfit-editor.test.tsx`, `outfit-editor-actions.test.tsx`, `settings-form.test.tsx`, `login-and-users.test.tsx`; (C) `WT/admin/editor-tabs.test.tsx`, `WT/admin/outfit-list-table.test.tsx`

## Phase 7: Tests, verify, docs
- (M) `e2e/public-viewport-and-no-js.spec.ts`, `e2e/admin-outfit-flow.spec.ts`, `e2e/public-lookbook-links-and-hover.spec.ts` (chỉ nếu cần), `e2e/support/admin-helpers.ts`, `playwright.config.ts`
- (C) `e2e/public-looks-and-navigation.spec.ts`, `e2e/public-responsive-viewports.spec.ts`, `e2e/public-connector-draw-once.spec.ts`, `e2e/admin-shell-theme-and-drawer.spec.ts`, `e2e/admin-shell-responsive.spec.ts`
- (M) `docs/system-architecture.md`, `docs/code-standards.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`
- (C) `plans/reports/ui-consistency-verifying-261107-*.md`

## Không ai sửa (chỉ đọc)
`W/components/lookbook/lookbook.module.css`, `measure-connectors.ts`, `compute-connector-paths.ts`, `W/components/admin/login-form.tsx`, `admin-form-field.tsx`, `admin-panel.tsx`, `confirm-dialog.tsx`, `save-status-text.tsx`, `W/app/api/revalidate/route.ts`, `W/app/robots.ts`, `W/lib/api-client-*.ts`, `W/lib/web-env.ts`, `apps/web/next.config.ts`, `apps/web/next-env.d.ts`.

## Kết quả rà trùng (2026-11-07)
- Rà tay từng file giữa 7 nhóm: **không có file nào xuất hiện ở hai phase**.
- Điểm dễ đụng đã tách:
  - `(protected)/page.tsx` và `outfits/page.tsx` cùng thuộc P5. P6 chỉ sửa component con.
  - `admin.module.css` thuộc P5 và giữ nguyên tên class dùng chung (`btn*`, `panel*`, `title`, `toolbar`, `container`, `narrow`, `stack`, `hint`, `srOnly`). Vì vậy 20+ file import nó ở P6 không phải đổi import.
  - `login-and-users.test.tsx` thuộc P6. P5 không đổi `login-form.tsx`.
  - `use-modal-dialog.ts` (chỉ P5 dùng sau khi bỏ menu dialog client), `decorative-icon.tsx` và `motion-provider.tsx` thuộc P1, để P3 và P5 cùng dùng mà không đụng nhau.
  - Spec visual thuộc P1. P7 chỉ chạy, không sửa.
