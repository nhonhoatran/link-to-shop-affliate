# Phase 3: Bộ sưu tập, admin + trang public

## Context Links
- Contract P1: `collection-schemas.ts`, `collection-contract.ts`, `ADMIN_PATHS.collections*`, `COLLECTIONS_PAGE_PATH`, `CollectionCardGrid`. API P2: bảng endpoint.
- Checklist UI phần D, E (plan dir này) + phần A, B của checklist cũ.
- Code tham chiếu:
  - Admin: `app/admin/(protected)/outfits/page.tsx`, `components/admin/{outfit-list-filters,outfit-list-table,pagination-links,settings-form,outfit-details-form,media-dropzone,media-thumb,confirm-dialog}.tsx`, `hooks/admin/{editor-state,use-form-submit}.ts`.
  - Public: `app/(public)/looks/page.tsx`, `components/public/{looks-pagination,look-breadcrumb,outfit-card-grid}.tsx`, `lib/seo/{build-looks-metadata,absolute-url}.ts`, `app/sitemap.ts`.

## Overview
- Priority: P1. Status: Completed (2026-11-07). Effort: 13h. Bắt đầu sau P1, code song song P2 bằng fixture. Đóng phase sau khi chạy thật với API P2.
- Admin quản lý bộ sưu tập (danh sách, form, ảnh bìa, gán outfit, thứ tự). Editor outfit có ô chọn bộ sưu tập. Public có `/collections` và `/collections/[slug]` phân trang phía server, metadata, sitemap.

## Key Insights
- Danh sách admin làm như `/admin/outfits`: form GET (`outfit-list-filters.tsx:7-9`) + `PaginationLinks`, server dựng lại, không lọc phía client.
- Picker (chọn outfit, chọn bộ sưu tập) tìm phía server: gõ → gọi API admin (`?q=&size=`) → nhận đúng một trang. JS chỉ kích request. Debounce là hằng kỹ thuật, ghi lý do trong code.
- `LooksPagination` gắn cứng `looksPagePath` (`looks-pagination.tsx:17,28`) → thêm prop `pathForPage`, mặc định giữ hành vi cũ.
- `LookBreadcrumb` gắn cứng 3 mục (`look-breadcrumb.tsx`) → tách `PublicBreadcrumb({ trail })`. `LookBreadcrumb` thành wrapper mỏng, trang `/look/[slug]` không đổi.
- `/collections` dùng `looksPageSize` (quyết định 8). Nhãn trang và breadcrumb: `settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL`.
- Ảnh bìa upload bằng `MediaDropzone kind="model"` (cạnh dài tối đa `IMAGE_MAX_EDGE_MODEL`). Không thêm `kind` mới (YAGNI).
- `editor-state.ts` hiện 172 dòng. Thêm `collectionIds` vào state, `toOutfitInput`, `snapshotOf` (để đổi picker làm editor "dirty") còn < 200 dòng. Chỉ gửi `collectionIds` khi khác giá trị ban đầu (giảm rủi ro ghi đè, xem P2 Risk).

## Requirements
### Luồng admin (từ góc nhìn người dùng)
- Tạo bộ sưu tập, 4 click + gõ:
  1. Bấm menu "Bộ sưu tập" (1) → thấy danh sách + nút "Tạo bộ sưu tập" ở toolbar.
  2. Bấm "Tạo bộ sưu tập" (2) → form: Tên, Đường dẫn (tự sinh từ tên, sửa được), Mô tả, Ảnh bìa, Trạng thái, Mô tả SEO.
  3. Gõ tên, kéo ảnh vào ô (hoặc bấm ô (3) rồi chọn file).
  4. Bấm "Lưu" (4) → toast "Đã tạo bộ sưu tập" → chuyển sang trang sửa, ở đó thêm outfit.
- Thêm outfit vào bộ sưu tập, 2 click + N tick:
  1. Ở panel "Outfit trong bộ sưu tập", bấm "Thêm outfit" (1) → hộp chọn có ô tìm.
  2. Gõ tên → tick N outfit → bấm "Thêm vào bộ sưu tập" (2) → danh sách cập nhật, toast.
  3. Gỡ: nút "Gỡ" trên dòng (1), không cần xác nhận vì gỡ không xoá outfit.
- Đổi thứ tự: nút "Lên" / "Xuống" trên mỗi dòng (1 click mỗi bậc). Dòng đầu không có "Lên", dòng cuối không có "Xuống".
- Xoá: "Xoá bộ sưu tập" (1) → `ConfirmDialog` nêu số outfit đang gán và cảnh báo nếu đang dùng ở trang chủ ("Khối dùng bộ sưu tập này sẽ tự ẩn") → "Xoá" (2).
- Editor outfit, tab "Thông tin": field "Bộ sưu tập". Danh sách tick có ô tìm, các mục đã chọn hiện thành chip phía trên, mỗi chip có nút gỡ. Lưu theo nút Lưu sẵn có của editor (Ctrl+S vẫn chạy).
- Publish thiếu ảnh bìa: lỗi hiện ngay tại field ảnh ("Bộ sưu tập đã đăng cần ảnh bìa"), focus field đó.

### Public
- `/collections?page=n`:
  - `h1` = nhãn bộ sưu tập; `CollectionCardGrid` (`columnsDesktop` mặc định lấy từ token, xem checklist D); `LooksPagination` với `pathForPage = collectionsPagePath`.
  - Không có bộ sưu tập → `PublicMessage` (chữ trong `collection-copy.ts`).
  - `page` sai → về trang 1. Vượt tổng → 404 (giống `/looks`).
- `/collections/[slug]?page=n`:
  - breadcrumb (Trang chủ / nhãn / tên);
  - header: `h1` tên, mô tả (tách đoạn, văn bản thuần), ảnh bìa eager + `fetchPriority="high"`;
  - `OutfitCardGrid headingLevel="h2"` + phân trang;
  - slug không có hoặc nháp → 404; bộ sưu tập chưa có outfit → thông điệp trống trong trang (không phải 404).
- Metadata theo `build-looks-metadata.ts` (canonical có `?page`, OG):
  - title: tên bộ sưu tập;
  - description: `seoDescription` → `description` → mô tả site;
  - OG image: ảnh bìa.
- Sitemap thêm `/collections` và từng bộ sưu tập đã đăng (`lastModified`).
- Loader (`public-collection-loaders.ts`): `cache()` + `safetyRevalidate()` + tag `PUBLIC_CACHE_TAGS.collections`. 404 → `null` (`nullOnNotFound`). Lỗi khác ném lên.

### Non-functional
- Server Component cho mọi trang danh sách. Không fetch danh sách phía client ở public.
- Admin: vùng chạm 44px, `AdminFormField` cho mọi control, `useFormSubmit` + zod shared + `noValidate`, toast chỉ báo thành công, lỗi inline (checklist B5–B9).
- Responsive 320–1440px không cuộn ngang. Bảng admin < 768px chuyển chế độ thẻ như danh sách outfit.
- No-JS: trang public đọc được đầy đủ, link phân trang chạy.

## Architecture
```
/admin/collections (server) --adminGet--> GET /api/admin/collections?q&status&page
  CollectionListFilters (GET form) | CollectionListTable | CollectionOrderButtons (POST move, router.refresh)
/admin/collections/[id] (server) -> CollectionForm (client, PUT) + CollectionOutfitsPanel
  panel list: server-rendered page of GET /api/admin/outfits?collectionId=&page (searchParam `op`)
  "Thêm outfit" -> OutfitPicker (AdminEntityPicker: search -> GET /api/admin/outfits?q&size) -> POST .../outfits
OutfitDetailsForm -> CollectionPicker (AdminEntityPicker -> GET /api/admin/collections?q&size) -> state.collectionIds

/collections?page (server) -> getPublicCollectionPage(page, looksPageSize) -> CollectionCardGrid + LooksPagination
/collections/[slug]?page (server) -> getCollectionPage(slug, page, looksPageSize) -> header + OutfitCardGrid + LooksPagination
```
`AdminEntityPicker` là component chung (generic theo item), đặt trong `components/admin/pickers/`. P6 dùng lại cho field custom của editor.

## Related Code Files
- Create:
  - Admin route: `app/admin/(protected)/collections/page.tsx`, `collections/loading.tsx`, `collections/new/page.tsx`, `collections/[id]/page.tsx`, `collections/[id]/loading.tsx`
  - `app/admin/_lib/admin-collection-api.ts`
  - `components/admin/collections/`: `collection-list-filters.tsx`, `collection-list-query.ts`, `collection-list-table.tsx`, `collection-order-buttons.tsx`, `collection-form.tsx`, `collection-form-state.ts`, `collection-outfits-panel.tsx`, `collection-delete-action.tsx`, `collections.module.css`
  - `components/admin/pickers/`: `admin-entity-picker.tsx`, `admin-entity-picker.module.css`, `use-entity-search.ts`, `outfit-picker.tsx`, `collection-picker.tsx`
  - Public route: `app/(public)/collections/page.tsx`, `collections/collections-page.module.css`, `collections/[slug]/page.tsx`, `collections/[slug]/collection-page.module.css`
  - `components/public/collection-header.tsx`, `collection-header.module.css`, `collection-copy.ts`, `public-breadcrumb.tsx`
  - `lib/seo/public-collection-loaders.ts`, `lib/seo/build-collection-metadata.ts`
  - Test: `apps/web/test/admin/collections/{collection-form,collection-list-table,collection-outfits-panel}.test.tsx`, `apps/web/test/admin/pickers/admin-entity-picker.test.tsx`, `apps/web/test/app/{collections-page,collection-detail-page,admin-collections-pages}.test.tsx`, `apps/web/test/lib/{build-collection-metadata,public-collection-loaders}.test.ts`
- Modify:
  - `components/admin/outfit-details-form.tsx`, `hooks/admin/editor-state.ts`, `components/admin/map-errors-to-editor-tabs.ts` (lỗi `collectionIds` → tab Thông tin)
  - `components/admin/admin-nav.tsx` + `apps/web/test/admin/admin-nav.test.tsx` (thêm "Bộ sưu tập", icon `Library`; **làm trước P6**)
  - `components/public/looks-pagination.tsx`, `components/public/look-breadcrumb.tsx`
  - `lib/seo/absolute-url.ts` (`collectionPath`, `collectionsPagePath`), `app/sitemap.ts`
  - Test: `apps/web/test/admin/{editor-state,outfit-editor}.test.*`, `apps/web/test/app/sitemap.test.ts`, `apps/web/test/public/looks-pagination.test.tsx`
- Delete: không

## Implementation Steps
1. Đọc checklist D, E. `absolute-url.ts` thêm helper. `public-breadcrumb.tsx` + `LookBreadcrumb` thành wrapper. `LooksPagination` thêm `pathForPage`.
2. Loader public + metadata builder + test (URL đúng, tag đúng, 404 → null).
3. Trang `/collections` và `/collections/[slug]` theo Requirements. Ảnh đầu trang eager (checklist A5). Test với fixture P1 (`sample-collections.ts`).
4. Sitemap + test.
5. `admin-collection-api.ts` (dùng `adminGet`). Trang danh sách: toolbar, filters, table (ảnh bìa, tên, badge trạng thái, số outfit, Lên/Xuống, Sửa), phân trang, chế độ thẻ < 768px.
6. `CollectionForm` (tạo/sửa chung): slug tự sinh bằng `slugifyVietnamese` cho tới khi người dùng tự sửa slug; `MediaDropzone` + `MediaThumb` + nút "Bỏ ảnh bìa"; `SaveStatusText`; Ctrl+S (`useSaveShortcut`); chặn rời trang khi chưa lưu (`useUnsavedChangesGuard`).
7. `AdminEntityPicker` (ô tìm, danh sách tick, chip đã chọn, trạng thái "Đang tìm…"/"Không có kết quả", bàn phím: Tab/Space/Enter). `OutfitPicker`, `CollectionPicker` bọc lại với fetcher riêng.
8. `CollectionOutfitsPanel`: danh sách server-side (search param riêng `op` để không đụng phân trang khác), "Thêm outfit" mở picker trong `<dialog>` qua `useModalDialog`, nút "Gỡ".
9. `CollectionOrderButtons`, `CollectionDeleteAction` (hiện `usage` trong `ConfirmDialog`).
10. Editor outfit: `collectionIds` trong state + `CollectionPicker` ở `OutfitDetailsForm`. Sửa test editor.
11. `admin-nav.tsx`: thêm mục. Báo lead đã xong để P6 sửa tiếp.
12. Chạy thật với API P2: tạo, gán, đăng, xem `/collections`, đổi thứ tự, xoá. `pnpm lint && pnpm typecheck && pnpm test`, spec visual. Không commit (commit một lần cuối đợt, khi chủ repo yêu cầu).

## Todo List
- [x] Helper URL, breadcrumb chung, pagination `pathForPage`
- [x] Loader + metadata + trang public + sitemap + test
- [x] Danh sách admin + filters + order + delete
- [x] Form tạo/sửa + ảnh bìa + guard rời trang
- [x] AdminEntityPicker + 2 picker + panel outfit
- [x] Editor outfit chọn bộ sưu tập + test
- [x] admin-nav (trước P6)
- [x] Chạy thật với API, lint/typecheck/test/visual

## Success Criteria
- Tạo một bộ sưu tập đã đăng có ảnh bìa: ≤ 4 click + gõ tên (đếm theo luồng ở trên, P7 e2e đi lại đúng luồng).
- Bỏ ảnh bìa rồi đăng → lỗi inline tại field ảnh, không có toast lỗi.
- `/collections/<slug>?page=2` render phía server (`curl` có HTML thẻ outfit). `?page=999` → 404. Slug nháp → 404.
- `sitemap.xml` có `/collections` và mọi bộ sưu tập đã đăng.
- Test cũ của `/look/[slug]`, `/looks`, editor outfit vẫn pass. Spec visual xanh.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Contract P1 thiếu trường khi làm UI | Trung bình × Thấp | Báo lead, P1 thêm field optional. Không tự định nghĩa kiểu cục bộ |
| Picker gọi API nhiều khi gõ | Thấp × Thấp | Debounce + huỷ request cũ (`AbortController`) |
| Đổi `LookBreadcrumb` làm lệch trang `/look` | Thấp × Trung bình | Giữ DOM và class y hệt. Test `look-page` + visual (spec chụp `[data-lookbook]`, breadcrumb nằm ngoài) |
| `admin-nav.tsx` đụng P6 | Thấp × Thấp | Sửa tuần tự: P3 xong mới tới P6 (đã ghi trong ma trận) |

## Security Considerations
- Mọi ghi qua `apiFetch` cùng origin, API kiểm session và `Origin`. 401 → về login (`useRedirectOnUnauthorized`).
- Mô tả bộ sưu tập render văn bản thuần, không `dangerouslySetInnerHTML`.
- Trang public chỉ nhận DTO public (không có trạng thái nháp, không có `usage`).

## Rollback
- Hoàn tác bằng git (xoá file mới, `git restore` file đã sửa theo ma trận): mất route mới, mục menu, ô chọn bộ sưu tập. Dữ liệu `collectionIds` còn trong DB, vô hại. Hoàn tác P6 trước nếu P6 đã sửa `admin-nav.tsx`.

## Next Steps
- P6 dùng `AdminEntityPicker`, `OutfitPicker`, `CollectionPicker` cho field custom. P7 viết e2e theo luồng ở trên.
