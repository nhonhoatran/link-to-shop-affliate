# Phase 6: Admin screens responsive (list, editor, settings, users)

## Context Links
- Brainstorm mục "Thiết kế admin". Research 02 mục 4 (bảng → thẻ), 5 (toast/skeleton), 6 (tab editor).
- Code đã đọc: `apps/web/src/components/admin/outfit-list-query.ts` (`buildListHref` trả `/admin?...`), `outfit-list-filters.tsx` (`action="/admin"`), `outfit-list-table.tsx`, `pagination-links.tsx`, `admin-list.module.css` (cả `user-list.tsx` cũng dùng `listStyles.table`), `outfit-editor.tsx` (3 cột ở ≥1100px; `router.replace('/admin')` sau khi xoá), `live-preview-panel.tsx`, `admin-editor.module.css` (117 dòng), `settings-form.tsx` (129 dòng), `save-status-text.tsx`; `app/admin/(protected)/outfits/new/page.tsx` (`Link href="/admin"`); test `apps/web/test/admin/*`.
- P5 cung cấp: `ADMIN_PATHS`, `useAdminToast`, `AdminSkeleton`, redirect `/admin?...`. P2 cung cấp: field settings `looksPageSize`, `relatedOutfitsCount`.

## Overview
- Priority: P1. Status: Done (2026-11-07; manual 5-viewport check light/dark, lint/typecheck/test and e2e green). Effort: 10h. Nhóm B, bước 2. Chạy sau P5.
- Danh sách outfit: bảng trên desktop, thẻ dọc trên mobile (cùng markup). Editor: 2 cột ≥1024px (form trái, xem trước phải sticky), <1024px 3 tab "Thông tin / Món đồ / Xem trước". Settings thêm 2 trường. Users responsive. Toast khi lưu. Skeleton `loading.tsx` cho từng segment. Mọi link list về `/admin/outfits`.

## Key Insights
- Redirect của P5 giữ cho `/admin?...` còn chạy. Phase này sửa nguồn link, để không còn phải đi qua redirect.
- `admin-list.module.css` dùng chung cho list outfit và list user. Một rule bảng → thẻ dùng được cho cả hai (DRY).
- Bảng → thẻ: `display: block` trên `table/tr/td` làm một số trình đọc màn hình mất ngữ nghĩa bảng. Thêm `role="table|rowgroup|row|columnheader|cell"` tường minh (research 02 mục 4). Nhãn cột lấy từ `td[data-label]` + `::before`.
- Tab editor theo APG: `tablist` / `tab` (`aria-selected`, `aria-controls`, `tabIndex` roving) / `tabpanel` (`aria-labelledby`). Mũi tên trái/phải xoay vòng, Home/End.
  - **Mọi panel luôn mount** (ẩn bằng `hidden`). Giữ được state form và `dnd-kit`, và anchor canvas vẫn có trong DOM.
  - ≥1024px: CSS ẩn tablist, `.panel[hidden] { display: block }`. Sau khi mount, hook `useWideEditorLayout()` (matchMedia) bỏ `role`/`hidden` để cây accessibility sạch. Render đầu tiên đã đúng nhờ CSS nên không nháy.
- Editor tự validate (`actions.errors`), không dùng validate native. Có lỗi thì đánh dấu tab chứa lỗi (chấm + chữ ẩn "có lỗi") và chuyển sang tab đầu tiên có lỗi trên mobile.
- e2e `admin-outfit-flow` chạy ở 1280×720 (Desktop Chrome) → layout 2 cột, mọi field đều thấy. Nhãn field không đổi (`Tên outfit`, `Đường dẫn (slug)`, `Thêm món`, `Tên món`, `Mô tả`, `Link affiliate`, nút `Lưu`/`Đăng`/`Ẩn`, chữ `Đã lưu`).
- Toast: chữ phải khác `Đã lưu` (vd "Đã lưu outfit", "Đã lưu cài đặt", "Đã xoá outfit"). `SaveStatusText` giữ nguyên.
- `settings-form.tsx` 129 dòng + 2 field → tách `settings-listing-fields.tsx` để file dưới 200 dòng.

## Requirements
- Functional:
  - List: form lọc `action={ADMIN_PATHS.outfits}`. Mobile: ô tìm full width, select + nút xuống dòng. `buildListHref` → `/admin/outfits?...`. Bảng <768px thành thẻ: ảnh trái, tên (link), badge trạng thái, nổi bật, ngày.
  - Pagination: nút ≥ 44px, `aria-current` cho trang hiện tại.
  - Editor:
    - Toolbar (Lưu / Đăng / Nổi bật / Xoá) dính trên cùng (`position: sticky`, dưới topbar mobile).
    - Tab "Thông tin" = `OutfitDetailsForm`. "Món đồ" = `ItemListPanel` + `MediaDropzone` + `ItemEditForm` + `AnchorPlacementCanvas`. "Xem trước" = `LivePreviewPanel`.
    - Desktop: cột trái = Thông tin + Món đồ, cột phải = Xem trước sticky.
    - Sau khi xoá → `router.replace(ADMIN_PATHS.outfits)`. Lưu thành công/lỗi → toast.
  - `outfits/new/page.tsx`: link "Quay lại danh sách" → `ADMIN_PATHS.outfits`.
  - Settings: "Số outfit mỗi trang (trang Tất cả outfit)", "Số outfit trong mục Outfit khác". Input số, bỏ trống = dùng mặc định. Hint nói rõ điều đó. Lỗi vượt trần hiện tại field (thông báo từ API). Lưu → toast + `SaveStatusText`.
  - Users: list thành thẻ trên mobile. Form tạo user full width. Xoá vẫn qua confirm.
  - `loading.tsx` (dùng `AdminSkeleton`): `outfits`, `outfits/[id]`, `settings`, `users`.
- Non-functional: list vẫn render server-side (GET form + `searchParams`). Không cuộn ngang ở 320px. Tap target ≥ 44px. File < 200 dòng. Không đổi nhãn mà e2e đang dùng.

## Architecture
```
OutfitEditor
  <OutfitEditorToolbar sticky/>
  <EditorTabs tabs=[info, items, preview] errorsByTab=mapErrorsToEditorTabs(actions.errors) wide=useWideEditorLayout()>
     panel info    -> OutfitDetailsForm
     panel items   -> ItemListPanel, MediaDropzone, ItemEditForm?, AnchorPlacementCanvas
     panel preview -> LivePreviewPanel
  </EditorTabs>
CSS (admin-editor.module.css):
  <1024: một cột, tablist sticky
  >=1024: grid 2 cột: [info + items] | [preview sticky top]
```
```ts
// map-errors-to-editor-tabs.ts (sketch)
export type EditorTabId = 'info' | 'items' | 'preview';
export const tabOfErrorKey = (key: string): EditorTabId => (key.startsWith('items') ? 'items' : 'info');
export const mapErrorsToEditorTabs = (errors: Record<string, string>): Set<EditorTabId> =>
  new Set(Object.keys(errors).map(tabOfErrorKey));
```
```css
/* admin-list.module.css (sketch) */
@media (max-width: 767.98px) {
  .table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .table, .table tbody, .table tr, .table td { display: block; }
  .table tr { display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--admin-border); }
  .table td[data-label]:not([data-label=''])::before { content: attr(data-label) ': '; color: var(--admin-text-muted); }
}
```
Data flow toast: `useOutfitActions.save()` → thành công `toast.success('Đã lưu outfit')`, lỗi `toast.error(describeApiFailure(e))`. Settings tương tự trong callback `handle`.

## Related Code Files
- Modify: `apps/web/src/components/admin/outfit-list-filters.tsx`, `outfit-list-table.tsx`, `outfit-list-query.ts`, `pagination-links.tsx`, `admin-list.module.css`, `user-list.tsx`, `user-create-form.tsx`, `outfit-editor.tsx`, `admin-editor.module.css`, `live-preview-panel.tsx`, `outfit-editor-toolbar.tsx`, `settings-form.tsx`, `validation-messages.ts`, `admin-form.module.css`; `apps/web/src/hooks/admin/use-outfit-actions.ts`; `apps/web/src/app/admin/(protected)/outfits/new/page.tsx`; test `apps/web/test/admin/admin-hooks-and-list-query.test.tsx`, `outfit-editor.test.tsx`, `outfit-editor-actions.test.tsx`, `settings-form.test.tsx`, `login-and-users.test.tsx`
- Create: `apps/web/src/components/admin/editor-tabs.tsx`, `editor-tabs.module.css`, `map-errors-to-editor-tabs.ts`, `settings-listing-fields.tsx`; `apps/web/src/hooks/admin/use-wide-editor-layout.ts`; `apps/web/src/app/admin/(protected)/outfits/loading.tsx`, `outfits/[id]/loading.tsx`, `settings/loading.tsx`, `users/loading.tsx`; test `apps/web/test/admin/editor-tabs.test.tsx`, `apps/web/test/admin/outfit-list-table.test.tsx`
- Delete: không
- Không sửa (của P5): `(protected)/outfits/page.tsx`, `(protected)/page.tsx`, `admin.module.css`, `components/admin/shell/*`. Cần đổi → báo lead.

## Implementation Steps
1. Đọc checklist. Kiểm P5 đã merge: `ADMIN_PATHS`, `useAdminToast`, `AdminSkeleton` đã có.
2. List: `outfit-list-query.ts` (`ADMIN_PATHS.outfits`), filters, table (`data-label`, `role` tường minh), pagination, `admin-list.module.css`. Sửa kỳ vọng `buildListHref` trong `admin-hooks-and-list-query.test.tsx`. Thêm `outfit-list-table.test.tsx` (có `data-label`, có role, dòng trống).
3. Users: `user-list.tsx` thêm `data-label`/role, dùng chung rule thẻ. `user-create-form.tsx` đổi layout field. Sửa phần users trong `login-and-users.test.tsx` nếu cần (phần login giữ nguyên).
4. Editor:
   - Tạo `map-errors-to-editor-tabs.ts`, `use-wide-editor-layout.ts` (matchMedia `(min-width: 1024px)`, SSR mặc định `false`), `editor-tabs.tsx` (APG, nhận `panels: { id, label, content }[]`, `errorTabs`, `wide`).
   - Sửa `outfit-editor.tsx` dùng `EditorTabs`. Xoá → `ADMIN_PATHS.outfits`.
   - `admin-editor.module.css`: bỏ breakpoint 3 cột 1100px, thêm 2 cột 1024px + preview sticky. Comment breakpoint trỏ `--bp-lg`.
   - `outfit-editor-toolbar.tsx`: sticky, nút xuống dòng gọn trên mobile.
   - `live-preview-panel.tsx`: khung xem trước co theo cột phải.
   - Khi lưu lỗi trên mobile → chuyển tab đầu tiên có lỗi và focus field lỗi đầu tiên (`[aria-invalid="true"]`).
5. Toast: `use-outfit-actions.ts` gọi `useAdminToast()` khi lưu/xoá/đặt nổi bật thành công hoặc lỗi. Giữ `actions.message` + `FormError` như cũ (lỗi vẫn hiện tại chỗ).
6. Settings: `settings-listing-fields.tsx` (2 field, `inputMode="numeric"`, `min=1`). `settings-form.tsx` gửi `looksPageSize`/`relatedOutfitsCount` khi có giá trị. `validation-messages.ts` thêm thông báo cho 2 key. Toast khi lưu xong. Sửa/thêm test trong `settings-form.test.tsx`.
7. `outfits/new/page.tsx`: link về `ADMIN_PATHS.outfits`. 4 file `loading.tsx` dùng `AdminSkeleton` với kiểu phù hợp (bảng / editor / form).
8. Test editor: `editor-tabs.test.tsx` (mũi tên/Home/End, `aria-selected`, panel ẩn vẫn mount, chấm lỗi), sửa `outfit-editor.test.tsx` / `outfit-editor-actions.test.tsx` (redirect sau khi xoá, toast được gọi: mock `useAdminToast` hoặc render với provider).
9. Kiểm tay 320 / 390 / 768 / 1024 / 1440 cho list, editor (tạo outfit, thêm món, đặt điểm trên canvas trong tab "Món đồ" ở 390px), settings, users. Dark mode cho cả 4 màn hình.
10. `pnpm lint && pnpm typecheck && pnpm test`. Chạy `pnpm e2e --project admin-flow` nếu stack chạy. Commit: `feat: make admin list, editor, settings and users responsive`.

## Todo List
- [x] List outfit: query, filters, table → thẻ, pagination + test
- [x] Users responsive + test
- [x] Editor tabs (APG) + 2 cột + error marker + test
- [x] Toast trong actions và settings
- [x] Settings 2 field mới + validation + test
- [x] `outfits/new` link + 4 `loading.tsx`
- [x] Kiểm tay 5 viewport, sáng/tối
- [x] lint/typecheck/test + e2e admin-flow xanh
- [ ] Commit `feat: make admin list, editor, settings and users responsive`: bỏ theo quyết định chủ repo

## Success Criteria
- `grep -rn "'/admin'\|\"/admin\"\|/admin?" apps/web/src/components apps/web/src/hooks` không còn kết quả (trừ `ADMIN_PATHS.overview`).
- Ở 390px: list hiện thẻ, đủ nhãn. Tab editor đổi được bằng chuột và bàn phím. Canvas đặt điểm dùng được.
- Ở 1280px: e2e `admin-outfit-flow` xanh mà không phải sửa selector.
- Lưu settings với `looksPageSize=12` → `/looks` hiện 12 thẻ/trang (kiểm tay sau khi revalidate).
- Mọi file < 200 dòng (`wc -l`).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Panel ẩn làm canvas đặt điểm sai | Thấp × Trung bình | Đã kiểm: `anchor-placement-canvas.tsx:34` đo `getBoundingClientRect()` ngay lúc bấm, không cache kích thước. Panel ẩn không ảnh hưởng. Không cần sửa file canvas |
| `dnd-kit` trong panel `hidden` | Thấp × Thấp | Panel vẫn mount. Kéo thả chỉ dùng khi panel đang hiện |
| e2e trùng chữ do toast | Trung bình × Trung bình | Chữ toast khác `Đã lưu` |
| Đổi `role` bảng làm test Testing Library hiện có rớt | Trung bình × Thấp | Role tường minh trùng role ngầm. Chạy test sau bước 2 |

## Security Considerations
- Không đổi luồng auth. Input số của settings có zod ở client (UX) và API (chốt). Trần do API kiểm.
- List vẫn GET form, `q` đã bị cắt 100 ký tự ở `parseOutfitListQuery`.

## Rollback
- Revert commit. Link list quay về `/admin?...`, vẫn chạy nhờ redirect của P5. Editor về 3 cột cũ.

## Next Steps
- P7: e2e responsive admin, dark mode trên các màn hình này, chạy lại admin-flow.
