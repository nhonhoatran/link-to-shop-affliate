# Phase 6: Editor trang chủ trong admin (registry tự làm, dùng được trên điện thoại)

## Context Links
- Brainstorm mục "Đổi quyết định 5 (2026-11-07)": bỏ Puck, editor registry cho mọi kích thước màn hình (chủ repo cần sửa bố cục trên điện thoại), đăng không hỏi xác nhận mà có toast "Hoàn tác".
- Contract P1: `home-sections/*` (`HOME_SECTION_DEFAULTS`, `HOME_SECTION_META`, `DEFAULT_HOME_CONTENT`, guard), `home-layout-contract.ts` (`HomePreviousInfo`, publish/restore), `ADMIN_PATHS.home`, `ADMIN_PATHS.homePreview`, token `--toast-action-duration`.
- API P2: `GET /api/admin/home`, `PUT /draft`, `POST /publish|/restore-previous|/revert-draft|/reset|/preview`, `GET /preview`.
- P3: `components/admin/pickers/*`. P4: `HOME_SECTION_VIEWS` (prop `mode='preview'`, `data-section-id`), `HomeSectionList`.
- Code tham chiếu (đọc, không sửa trừ toast):
  - `components/admin/{outfit-editor,outfit-editor-toolbar,editor-tabs,live-preview-panel,item-list-panel,sortable-item-row,media-dropzone,media-thumb,confirm-dialog,save-status-text,admin-form-field}.tsx`
  - `hooks/admin/{use-save-shortcut,use-unsaved-changes-guard,use-wide-editor-layout}.ts`, `hooks/use-modal-dialog.ts`
  - `components/admin/shell/{admin-toast-provider.tsx,use-admin-toast.ts,admin-toast.module.css}` (P6 mở rộng)
- Checklist UI phần F + B của checklist cũ.

## Overview
- Priority: P1. Status: Completed (2026-11-07). Effort: 24h. Chờ P2, P3, P4 (Wave 3).
- Màn "Trang chủ" trong admin: thêm, sắp xếp, ẩn/hiện, sửa, xoá section; "Lưu nháp", "Xem trước", "Đăng" + toast "Hoàn tác"; menu "Khác". Một editor cho mọi bề rộng, không thư viện editor mới.

## Key Insights
- Dữ liệu là `content` dạng `[{ type, props }]` (P1). Editor sửa thẳng mảng này, không có định dạng trung gian.
- Màn sửa outfit đã có đủ mẫu, dùng lại để nhất quán:
  - `useWideEditorLayout` (1024px = `--bp-lg`) + `EditorTabs`: rộng thì 2 cột, hẹp thì tab, mọi panel vẫn mount (`editor-tabs.tsx:28`), nên đổi tab không mất state.
  - `LivePreviewPanel` có nút "Máy tính / Điện thoại" + `--admin-preview-mobile-width`.
  - `item-list-panel.tsx:64-66`: dnd-kit `PointerSensor` (`distance: 5`) + `KeyboardSensor` (`sortableKeyboardCoordinates`).
- Khung xem trước cần dữ liệu thật (outfit, bộ sưu tập), nhưng View P4 chỉ nhận `ResolvedHomeSection`. `useSectionPreviewData` gọi `POST /api/admin/home/preview` (debounce, `AbortController`, giữ dữ liệu cũ tới khi có mới), ghép `data` theo `props.id`. Chữ vừa gõ hiện ngay từ props tại chỗ.
- Media query của View theo viewport, không theo khung. Khung "Máy tính" trong cột phải hẹp hơn màn thật, nên bố cục cột chỉ gần đúng. Có nút "Mở trang xem trước" (`/admin/home-preview`, tab mới) để xem đúng 100%. Chấp nhận như màn outfit.
- Toast hiện chỉ có chữ (`admin-toast-provider.tsx`, `success(text)`), tự tắt sau `--toast-duration`. P6 thêm tham số tuỳ chọn `action { label, onClick }`; toast có action dùng `--toast-action-duration`, dừng đếm khi hover/focus (WCAG 2.2.1). Chữ ký cũ giữ nguyên, các màn khác không đổi.
- Toast tắt rồi vẫn hoàn tác được: menu "Khác" → "Hoàn tác lần đăng gần nhất" (bật khi `previous` khác `null`).

## Requirements
### Bố cục màn hình
- **≥1024px**: trái là panel "Bố cục" (danh sách thẻ section; thẻ đang chọn mở form ngay bên dưới, dạng accordion), phải là panel "Xem trước" dính (`position: sticky`) với nút "Máy tính / Điện thoại" như màn outfit.
- **<1024px**: một cột, `EditorTabs` hai tab "Chỉnh sửa" ⇄ "Xem trước" (nhãn trong `home-editor-copy.ts`), thanh tab dính dưới topbar. Thẻ section và form giống hệt bản rộng.
- Toolbar: `h1` "Trang chủ", dòng trạng thái, nút. Dưới 768px toolbar dính như `outfit-editor-toolbar` (`admin-editor.module.css:60-61`). "Đăng" luôn thấy được; nếu thiếu chỗ, "Lưu nháp" và "Mở trang xem trước" vào menu "Khác" (checklist F quyết).
  - Trạng thái: "Đang dùng bố cục mặc định" / "Đã đăng lúc {giờ}" / "Có thay đổi chưa đăng" / "Đang lưu…".
  - Nút: "Lưu nháp" (phụ, Ctrl+S), "Mở trang xem trước" (lưu trước nếu dirty, mở tab mới), "Đăng" (chính).
  - Menu "Khác": "Hoàn tác lần đăng gần nhất" (không hỏi, vì chính nó hoàn tác lại được), "Bỏ thay đổi chưa đăng" (xác nhận), "Khôi phục bố cục mặc định" (xác nhận `danger`, nói rõ "Bản nháp sẽ mất. Bản đang đăng có thể hoàn tác.").

### Thẻ section
- Hàng 1: tay nắm kéo, tên loại (`HOME_SECTION_META[type].label`) + tóm tắt (tiêu đề/heading đầu tiên, hoặc "Chưa có tiêu đề"), tag "Đang ẩn", tag "Cần sửa" khi có lỗi, công tắc Hiện/Ẩn (`role="switch"`, `aria-checked`).
- Hàng 2: "Sửa" (`aria-expanded`), "Lên", "Xuống" (`disabled` ở đầu/cuối), "Xoá" (`ConfirmDialog` "Xoá section {tên}?").
- Mọi nút ≥ `--admin-control-height` (44px), có `aria-label` đủ nghĩa ("Đưa {tên} lên").
- Sắp xếp có 3 cách: kéo bằng chuột/ngón tay, bàn phím trên tay nắm (Space nhấc, mũi tên, Space thả; câu thông báo dnd-kit tiếng Việt), nút Lên/Xuống. Sau khi Lên/Xuống, focus ở lại đúng nút của thẻ vừa chuyển; vùng `aria-live` báo "Đã chuyển {tên} tới vị trí 2/7".
- Bấm vào một khối trong khung xem trước (theo `data-section-id`) → chọn thẻ đó, mở form, trên mobile chuyển sang tab "Chỉnh sửa". Link trong khung xem trước bị chặn điều hướng (`onClickCapture` + `preventDefault`).

### Thêm section
- Nút "+ Thêm section" ở cuối danh sách (và trong trạng thái rỗng). Mở `<dialog>` (`useModalDialog`) liệt kê 7 loại, mỗi loại có tên + mô tả một dòng (`HOME_SECTION_META`).
- Chọn loại → thêm ngay sau thẻ đang chọn (không có thì cuối danh sách), id mới bằng `crypto.randomUUID()`, props từ `HOME_SECTION_DEFAULTS`. Thẻ mới được chọn, form mở, cuộn tới và focus ô đầu tiên.

### Form section
- Dựng từ `home-section-field-specs.ts`: nhãn tiếng Việt, loại field, lựa chọn, min/max lấy từ guard shared, mặc định từ `HOME_SECTION_DEFAULTS`. Mỗi loại một file spec nếu dài.
- Field mảng (`slides`, `items` của FAQ/cam kết) có Thêm/Xoá/Lên/Xuống; "Thêm" `disabled` khi đủ guard, hint "Tối đa N" (N từ shared).
- Field custom: ảnh = `MediaDropzone` + `MediaThumb` + "Mô tả ảnh"; outfit/bộ sưu tập = `OutfitPicker`/`CollectionPicker` (P3) + danh sách đã chọn có Lên/Xuống/Gỡ.
- Validate từng field khi rời ô bằng schema section. Trước khi lưu/đăng parse cả `saveHomeDraftRequestSchema`. Lỗi map theo `content.{i}.props.{field}` → tag "Cần sửa" trên thẻ, mở thẻ lỗi đầu tiên, focus đúng ô. Lỗi inline, không toast lỗi.

### Đăng và hoàn tác
- "Đăng" = lưu nháp nếu dirty → `POST publish { baseUpdatedAt }` → toast "Đã đăng trang chủ" có nút "Hoàn tác". Không hỏi xác nhận.
- "Hoàn tác" (trong toast hoặc menu) → `POST restore-previous { basePublishedAt }` → toast "Đã khôi phục bản đăng trước". Bản nháp giữ nguyên, trạng thái thành "Có thay đổi chưa đăng" nếu nháp khác bản đang đăng.
- 409 (lưu, đăng, hoàn tác) → `FormError` "Bố cục vừa được sửa ở nơi khác. Tải lại để xem bản mới nhất." + nút "Tải lại". Không ghi đè.
- Rời trang khi chưa lưu → `ConfirmDialog` (`useUnsavedChangesGuard`).

### Luồng người dùng (đếm click, mobile và desktop như nhau)
| Việc | Thao tác |
|---|---|
| Thêm section rồi đăng | "+ Thêm section" (1) → chọn loại (2) → điền form → "Đăng" (3) |
| Đổi thứ tự | Kéo tay nắm hoặc "Lên"/"Xuống" (1) → "Đăng" (2) |
| Ẩn section | Công tắc trên thẻ (1) → "Đăng" (2) |
| Lỡ đăng nhầm | "Hoàn tác" trong toast (1), hoặc "Khác" (1) → "Hoàn tác lần đăng gần nhất" (2) |
| Xem trên điện thoại khi đang ở máy tính | "Điện thoại" trên panel Xem trước (1) |
| Xem trước trên điện thoại | Tab "Xem trước" (1) |

### Route xem trước
- `/admin/home-preview` (ngoài `(protected)` để không lồng admin shell): `adminGet(API_PATHS.admin.homePreview)` (401 → login); `PublicShell` + `HomeSectionList` (`mode='preview'`); dải "Bản xem trước, chưa đăng" trên cùng; `robots: { index: false }`.
- Admin nav thêm "Trang chủ" (icon `LayoutTemplate`) sau "Tổng quan". Sửa tuần tự sau P3.

### Non-functional
- File < 200 dòng. Token `--admin-*`, dark mode theo khối `[data-theme]` sẵn có, không `light-dark()`. Khung xem trước luôn dùng token `--client-*` (giao diện public), không đổi theo theme admin.
- Không cuộn ngang ở 390px. Animation thẻ (mở form, kéo) chỉ sau hydrate, tôn trọng `prefers-reduced-motion`.
- Không dependency mới (dnd-kit, lucide có sẵn).

## Architecture
```
/admin/home (server) --adminGet--> GET /api/admin/home -> <HomeEditorScreen initial> (client)
  useHomeLayoutState(initial)        content, selectedId, dirty, errors, baseUpdatedAt, publishedAt, previous
  useHomeLayoutActions               saveDraft(PUT) | publish(POST) | restorePrevious(POST) | revertDraft | reset
     publish ok -> toast.success('Đã đăng trang chủ', { action: { label: 'Hoàn tác', onClick: restorePrevious } })
  HomeEditorToolbar + HomeEditorMoreMenu
  wide ? [SectionListPanel | HomePreviewPane] : EditorTabs([Form: SectionListPanel, Xem trước: HomePreviewPane])
    SectionListPanel: DndContext > SortableContext > SectionCard* (SectionForm khi chọn) + AddSectionDialog
    HomePreviewPane: useSectionPreviewData(content) -> POST /api/admin/home/preview (debounce, abort)
                     -> HOME_SECTION_VIEWS[type] mode='preview'; click [data-section-id] -> select
/admin/home-preview (server) --adminGet--> GET /api/admin/home/preview -> PublicShell + HomeSectionList
```

## Related Code Files
- Create:
  - `app/admin/(protected)/home/page.tsx`, `home/loading.tsx`, `app/admin/home-preview/page.tsx`, `app/admin/_lib/admin-home-api.ts`
  - `components/admin/home-editor/`:
    - màn hình + toolbar: `home-editor-screen.tsx`, `home-editor-toolbar.tsx`, `home-editor-more-menu.tsx`, `home-editor-copy.ts`, `home-editor.module.css`
    - state + API: `use-home-layout-state.ts`, `use-home-layout-actions.ts`, `use-section-preview-data.ts`, `map-layout-errors.ts`, `move-section.ts`
    - danh sách: `section-list-panel.tsx`, `section-card.tsx`, `section-card.module.css`, `section-reorder-announcements.ts`, `add-section-dialog.tsx`
    - form: `section-form.tsx`, `section-array-field.tsx`, `home-section-field-specs.ts` (+ `field-specs/*.ts`), `section-image-field.tsx`, `section-outfits-field.tsx`, `section-collections-field.tsx`
    - xem trước: `home-preview-pane.tsx`, `home-preview-pane.module.css`
  - Test (`apps/web/test/admin/home-editor/`): `use-home-layout-actions.test.tsx`, `use-home-layout-state.test.ts`, `move-section.test.ts`, `map-layout-errors.test.ts`, `home-section-field-specs.test.ts`, `section-card.test.tsx`, `add-section-dialog.test.tsx`, `section-form.test.tsx`, `home-preview-pane.test.tsx`, `home-editor-toolbar.test.tsx`; `apps/web/test/app/admin-home-preview-page.test.tsx`
- Modify:
  - `components/admin/shell/admin-toast-provider.tsx`, `use-admin-toast.ts`, `admin-toast.module.css`, `apps/web/test/admin/admin-toast.test.tsx` (thêm `action`, giữ chữ ký cũ)
  - `components/admin/admin-nav.tsx`, `apps/web/test/admin/admin-nav.test.tsx` (tuần tự sau P3)
- Delete: không

## Implementation Steps
1. Đọc checklist F. `admin-home-api.ts`, trang `/admin/home` (server) + `loading.tsx`, trang `/admin/home-preview` + test.
2. Toast: `success(text, options?)` với `action`; toast có action đọc `--toast-action-duration`, dừng khi hover/focus-within, nút action là `button` thật trong vùng `role="status"`. Test: chữ ký cũ không đổi, bấm action gọi `onClick` và đóng toast, hover giữ toast.
3. `use-home-layout-state.ts` (reducer: thêm, xoá, đổi chỗ, ẩn/hiện, sửa props, chọn) + `move-section.ts` + test.
4. `use-home-layout-actions.ts`: lưu nháp (`baseUpdatedAt`, cập nhật mốc sau khi lưu), đăng (lưu trước nếu dirty), hoàn tác lần đăng, bỏ thay đổi, khôi phục mặc định; 401 → login; 409 → thông điệp riêng. `useSaveShortcut`, `useUnsavedChangesGuard`. Test: đăng sau lưu, 409 ở cả 3 lệnh, hoàn tác cập nhật `publishedAt`/`previous`.
5. `home-section-field-specs.ts` cho 7 loại + 3 field custom. Test: mọi prop của schema có spec (trừ `id`, `visible`), default khớp shared.
6. `SectionForm`, `SectionArrayField` + `map-layout-errors.ts` + test (lỗi href hiện đúng ô, thẻ có tag "Cần sửa").
7. `SectionCard` (dnd-kit `useSortable`, công tắc, Lên/Xuống, Xoá), `SectionListPanel` (sensor Pointer + Keyboard như `item-list-panel.tsx`, `section-reorder-announcements.ts` tiếng Việt, vùng `aria-live`), `AddSectionDialog` + test (bàn phím đổi chỗ, nút đầu/cuối `disabled`, thêm sau thẻ đang chọn).
8. `use-section-preview-data.ts` (debounce là hằng kỹ thuật ghi lý do, `AbortController`, chỉ gửi khi `content` đổi) + `HomePreviewPane` (Máy tính/Điện thoại, chặn link, bấm khối → chọn) + test.
9. `HomeEditorScreen` ráp 2 bố cục theo `useWideEditorLayout`, toolbar, menu "Khác" + test toolbar.
10. `admin-nav.tsx` thêm "Trang chủ" (sau khi P3 báo xong) + sửa test nav.
11. Chạy thật ở 1440 và 390 (DevTools + một điện thoại thật nếu có):
    - dựng ≥ 6 section, đổi thứ tự bằng kéo, bàn phím và Lên/Xuống, ẩn 1 section, lưu nháp;
    - mở trang xem trước (nháp hiện, `/` vẫn bản cũ), đăng (`/` đổi), bấm "Hoàn tác" (`/` về bản cũ), hoàn tác lần nữa từ menu;
    - mở 2 tab rồi lưu ở cả hai → tab sau thấy 409;
    - khôi phục mặc định; sáng/tối.
12. `pnpm lint && pnpm typecheck && pnpm test`, spec visual. Không commit (commit một lần cuối đợt, khi chủ repo yêu cầu).

## Todo List
- [x] Route editor, route xem trước, loader admin
- [x] Toast có nút hành động + test
- [x] State reducer, move, action lưu/đăng/hoàn tác/bỏ/khôi phục + 409 + phím tắt + guard
- [x] Spec field 7 loại + 3 field custom + form + map lỗi + test
- [x] Thẻ section, kéo thả + bàn phím + Lên/Xuống, hộp thêm section + test
- [x] Khung xem trước + preview data + bấm khối để chọn + test
- [x] Màn ráp 2 bố cục, toolbar, menu Khác
- [x] admin-nav (sau P3)
- [x] Chạy thật 1440 + 390, lint/typecheck/test/visual

## Success Criteria
- Ở 390px: thêm, sửa, đổi thứ tự (kéo bằng ngón tay và Lên/Xuống), ẩn, đăng, hoàn tác đều làm được, không cuộn ngang, mọi nút ≥ 44px (P7 e2e đo `boundingBox`).
- Chỉ dùng bàn phím: chọn thẻ, đổi chỗ, thêm section, đăng, hoàn tác (P7 e2e).
- Số click đúng bảng Luồng người dùng.
- Xem trước hiện bản nháp, `/` chỉ đổi sau "Đăng". "Hoàn tác" đưa `/` về bản trước, bản nháp không mất.
- Lưu đồng thời từ 2 tab: tab sau nhận 409 và thông điệp tải lại, không mất dữ liệu tab trước.
- Toast cũ của các màn admin khác không đổi (`admin-toast.test.tsx` cũ vẫn pass).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Kéo thả trên cảm ứng lẫn với cuộn trang | Trung bình × Trung bình | Chỉ tay nắm nhận kéo (`touch-action: none` trên tay nắm), `PointerSensor` có `distance`. Luôn có Lên/Xuống |
| Khung xem trước giật vì gọi API liên tục | Trung bình × Thấp | Debounce, huỷ request cũ, giữ dữ liệu cũ tới khi có mới |
| Effort 24h vượt do field mảng + 3 field custom | Trung bình × Trung bình | Spec dựng form chung, field custom dùng lại picker P3. Cắt "bấm khối trong xem trước để chọn" nếu trễ (không phải luồng chính) |
| Mở rộng toast làm lệch màn admin khác | Thấp × Trung bình | Tham số tuỳ chọn, test cũ giữ nguyên. e2e admin-shell phải xanh |
| Hoàn tác khi toast đã tắt | Trung bình × Thấp | Menu "Khác" luôn có "Hoàn tác lần đăng gần nhất" khi `previous` khác `null` |
| `admin-nav.tsx` sửa song song với P3 | Thấp × Thấp | Chỉ sửa sau khi P3 báo xong (ma trận) |

## Security Considerations
- Route editor nằm trong `(protected)`, có kiểm đăng nhập ở layout. Route xem trước dùng `adminGet` (401 → login), `noindex`, `robots.ts` đã chặn `/admin`.
- Mọi ghi (lưu, đăng, hoàn tác, reset) qua API admin (session + Origin + zod + lock). Client validate chỉ để UX, API vẫn validate lại.
- Khung xem trước render View bằng React (escape), không HTML thô; link bị chặn điều hướng.

## Rollback
- Hoàn tác bằng git (xoá file mới, `git restore` file đã sửa theo ma trận): mất màn editor, mục menu, nút hành động của toast. Bản đã đăng trong DB vẫn render ở `/` (P4 không phụ thuộc editor). Muốn bỏ bố cục đã đăng: `POST /api/admin/home/reset` trước khi hoàn tác.

## Next Steps
- P7: e2e editor ở 1440 và 390 (kéo, bàn phím, Lên/Xuống, 44px, đăng + hoàn tác), docs.
