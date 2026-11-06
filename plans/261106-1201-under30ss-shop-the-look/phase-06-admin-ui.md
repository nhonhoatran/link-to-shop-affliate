# Phase 06 — Admin UI

## Context Links
- [plan.md](./plan.md) · [phase-01 contract](./phase-01-foundation-and-contracts.md) · [phase-04 LookbookLayout](./phase-04-lookbook-ui-components.md)

## Overview
- Priority: P1 · Status: Done — chờ kiểm runtime trên trình duyệt + API thật ở P7 · Effort: 11h · Wave 3 (song song P5) · blockedBy: P1, P4
- Đăng nhập, danh sách outfit server-side, editor 3 vùng (đặt điểm bằng click, kéo thả món, preview thật), upload kéo thả, settings, quản lý admin.

## File Ownership
- `apps/web/src/app/admin/**`, `apps/web/src/components/admin/**`, `apps/web/src/hooks/admin/**`, `apps/web/test/admin/**`
- Chỉ đọc/import: `packages/shared/**`, `components/lookbook/**`, `lib/api-client-*.ts`, `lib/media-url.ts`, `styles/**`

## Key Insights
- Người dùng là team nội dung → bấm lên người mẫu đặt điểm, preview liền, lỗi tại field.
- Preview dùng `LookbookLayout` (P4) → giống trang thật 100%.
- Danh sách render server (searchParams `q/status/page`), form tìm submit GET.
- Gọi API theo hợp đồng P1; P2 có thể chưa xong → test component với fixture + mock `fetch` ở mức test; chạy thật ở P7.

## Requirements
**Luồng người dùng:**
1. `/admin/login` → email + mật khẩu → `/admin`.
2. `/admin`: ô tìm, lọc trạng thái, phân trang; dòng: ảnh nhỏ, tên, trạng thái, nổi bật, ngày sửa; nút "Tạo outfit".
3. "Tạo outfit": nhập tên (slug tự sinh bằng `slugify-vietnamese`, sửa được) + kéo thả ảnh người mẫu → vào editor.
4. Editor `/admin/outfits/[id]`:
   - Trái: nhóm "Bên trái"/"Bên phải", kéo thả đổi thứ tự hoặc sang nhóm kia (`@dnd-kit`); mở món sửa ảnh (kéo thả), tên, dòng phụ, mô tả, link; "+ Thêm món".
   - Giữa: ảnh người mẫu; chọn món → bấm đặt điểm, kéo chấm chỉnh; món chưa có điểm có cảnh báo.
   - Phải: preview (toggle desktop/điện thoại).
   - Toolbar: trạng thái lưu ("Đã lưu"/"Đang lưu…"/lỗi), Lưu, Đăng/Ẩn, Đặt nổi bật, Xem trang (tab mới).
   - Đăng thiếu link → chặn, chỉ rõ món (dùng `fields` từ `ApiErrorBody` + validate zod client).
   - Rời trang chưa lưu → xác nhận; xoá món/outfit → xác nhận; `Ctrl+S` lưu.
5. `/admin/settings`: tên site, SEO mặc định, ảnh chia sẻ, giới hạn upload.
6. `/admin/users`: danh sách, thêm (email + mật khẩu tạm), xoá.
- Mọi trang admin `robots: { index: false }`.

## Architecture
- `app/admin/(protected)/layout.tsx`: server gọi `/api/auth/me` (forward cookie) → không session → redirect `/admin/login`.
- Editor = Client Component; state hook; validate zod shared; lưu `PUT /api/admin/outfits/:id`.
- Đặt điểm: `x = (clientX - rect.left) / rect.width * 100` (làm tròn 1 số lẻ), tương tự y.
- `map-editor-state-to-public-dto.ts` để đưa vào preview.

## Related Code Files (create)
- `app/admin/login/page.tsx`, `components/admin/login-form.tsx`
- `app/admin/(protected)/layout.tsx`, `page.tsx`, `outfits/new/page.tsx`, `outfits/[id]/page.tsx`, `settings/page.tsx`, `users/page.tsx`
- `components/admin/outfit-list-filters.tsx`, `outfit-list-table.tsx`, `pagination-links.tsx`, `outfit-create-form.tsx`, `outfit-editor.tsx`, `outfit-editor-toolbar.tsx`, `item-list-panel.tsx`, `item-edit-form.tsx`, `anchor-placement-canvas.tsx`, `live-preview-panel.tsx`, `media-dropzone.tsx`, `confirm-dialog.tsx`, `field-error.tsx`, `settings-form.tsx`, `user-create-form.tsx`, `user-list.tsx`, `map-editor-state-to-public-dto.ts`, `admin.module.css`
- `hooks/admin/use-outfit-editor-state.ts`, `use-unsaved-changes-guard.ts`, `use-save-shortcut.ts`
- `test/admin/**`

## Implementation Steps
1. `ui-consistency:planning` cho các trang admin (theo checklist P1).
2. Login + protected layout + logout.
3. Danh sách server-side + phân trang.
4. Tạo outfit.
5. Editor: state hook → item panel + dnd → form món + upload → đặt điểm → preview → toolbar → guard + Ctrl+S.
6. Settings, users.
7. Test: tính anchor từ click, map DTO, chặn đăng thiếu link hiển thị đúng món, guard chưa lưu.

## Todo List
- [x] Login/logout + guard
- [x] Danh sách outfit server-side
- [x] Tạo outfit
- [x] Editor: món + kéo thả
- [x] Editor: form + upload
- [x] Editor: đặt điểm
- [x] Editor: preview
- [x] Toolbar + chặn đăng thiếu link
- [x] Guard + Ctrl+S
- [x] Settings + users
- [x] Tests pass

## Success Criteria
- Test P6 pass; typecheck sạch.
- (Kiểm ở P7) người mới tạo outfit 8 món, đặt điểm, đăng trong <10 phút; lưu → public cập nhật.

## Risk Assessment
- Editor phình >200 dòng/file → tách như danh sách trên.
- Hợp đồng API lệch → lộ ở P7.

## Security Considerations
- Cookie httpOnly, gọi `/api` cùng origin; không log mật khẩu tạm; admin noindex.

## Next Steps
- P7.

## Ghi chú đồng bộ 2026-11-06
Đối chiếu với `apps/web/src/app/admin/**`, `components/admin/**`, `hooks/admin/**`, `test/admin/**`.
- Featured: draft không đặt nổi bật được (D1, UI disable kèm lý do; API 409). Spec không ghi.
- Editor PUT không gửi `featured` (fix M1, `hooks/admin/editor-state.ts`).
- Nút submit tạo outfit là "Tạo outfit" (spec: "Tạo và mở trình chỉnh sửa"), đổi theo fix round 2 copy.
- Upload tiến độ là "Đang tải lên…" không có %. Spec không yêu cầu %; ghi nhận.
- Giờ hiển thị: `ADMIN_TIME_ZONE` (D2) truyền qua prop `timeZone` vào danh sách outfit và danh sách admin (`(protected)/page.tsx:36`, `users/page.tsx:19`). Tên site trên header lấy từ settings (`(protected)/layout.tsx:12`, fix M7).
- Ngoài ownership: `apps/web/src/lib/admin-paths.ts`, `lib/format-admin-date.ts`, `lib/web-env.ts` (P1), `styles/design-tokens.css` (P1). Cần ghi nhận khi review.
- Chưa kiểm: `next build` và trình duyệt thật; người mới tạo outfit 8 món, đặt điểm, đăng dưới 10 phút; lưu → trang public cập nhật. Chuyển P7.
- Đổi mật khẩu admin chưa có (D3, ngoài v1). Chỉ sửa hint trong form tạo admin.
