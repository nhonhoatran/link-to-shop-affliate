# Phase 5: Re-skin admin + trang "Đăng ký nhận tin"

## Context Links
- Token admin + font (P1), field spec section mới (P1, đã có trong editor), contract `newsletter-contract.ts`, `settings-schemas.ts` (`newsletterConsent`, `newsletterConsentVersion`).
- API P2: `GET/PATCH/DELETE /api/admin/newsletter*`, `GET /api/admin/newsletter/export.csv`, `PUT /api/admin/settings`.
- Checklist UI phần J (admin list), K (form Cài đặt), H2 (tiêu đề serif).
- Code mẫu: `app/admin/(protected)/collections/page.tsx` (list server-side), `components/admin/collections/{collection-list-filters,collection-list-query,collection-list-table,collection-delete-action,collection-pagination}.tsx|ts`, `components/admin/confirm-dialog.tsx`, `components/admin/settings/*`, `components/admin/admin-nav.tsx:17-24`, `lib/admin-paths.ts`.
- Mockup admin không lấy được (API Stitch không trả màn hình). Hướng: cùng token public (nền ngà, chữ đen, tiêu đề Playfair, hairline, góc vuông), giữ sidebar/rail/drawer + dark mode.

## Overview
- Priority: P2. Status: Completed (còn mở: rà admin 2 theme, thử editor với section mới). Effort: 12h. Chờ P1. Code song song P2/P3/P4; đóng sau khi chạy thật với API P2 và khung xem trước có view P4.
- Re-skin admin chủ yếu nhờ token (P1), chỉnh tiêu đề serif + vài chỗ bóng/bo. Thêm trang danh sách người đăng ký, xuất CSV, huỷ, xoá cứng; thêm nhóm "Bản tin" trong Cài đặt.

## Key Insights
- Danh sách thứ ba trong admin (outfit, bộ sưu tập, người đăng ký). `CollectionPagination` đã nhận `hrefForPage` (`collection-pagination.tsx:12`): import thẳng, **không đổi tên** (red team F12: đổi tên một bản mà `pagination-links.tsx` vẫn còn chỉ tạo churn; gom cả hai để follow-up).
- Bộ lọc/bảng của bộ sưu tập gắn với kiểu dữ liệu riêng; tạo bản cho newsletter theo cùng markup (`role="search"`, `AdminFormField compact`, `table` + `caption.srOnly` + `data-label` cho thẻ mobile). Không tổng quát hoá bộ lọc (2 trường khác nhau, YAGNI).
- "Huỷ đăng ký" đổi trạng thái, giữ bản ghi (chặn thêm lại khi nhập CSV cũ); "Xoá vĩnh viễn" chỉ cho yêu cầu xoá dữ liệu. Cả hai qua `ConfirmDialog` (dùng ở 10 file, grep). Xoá: `danger`. Thành công: `toast.success` + `router.refresh()`; lỗi: inline trong dialog/hàng, không toast (quy ước `docs/code-standards.md` mục "Hộp thoại, drawer, toast").
- Xuất CSV: link `<a href download>` thẳng tới API (cookie same-origin; dev có rewrite `/api/*` ở `next.config.ts`), mang theo bộ lọc hiện tại. Không route proxy trong Next.
- Version câu đồng ý do API tự tăng (khi đổi chữ hoặc link chính sách): form chỉ hiện "Phiên bản hiện tại: N" + hint, không cho sửa.
- Form đăng ký trên trang chủ chỉ hiện sau khi admin lưu câu đồng ý (P2 bỏ section khi chưa lưu, red team H3). Nhóm "Bản tin" phải nói rõ điều này; chưa lưu lần nào (`newsletterConsentVersion: null`) thì textarea điền sẵn `DEFAULT_NEWSLETTER_CONSENT` và hiện ghi chú "Chưa lưu: form đăng ký chưa hiện trên trang chủ".
- `DATA_TYPES` của khung xem trước do P1 suy từ `HOME_SECTION_META.resolvesData` (file chuyển chủ sang P1), P5 không sửa.
- Icon nav: `Mail` có trong `lucide-react@1.70.0` (tồn tại `dist/esm/icons/mail.mjs` trong `node_modules/.pnpm/lucide-react@1.70.0_*`).

## Requirements
### Functional
- Nav admin: thêm "Đăng ký nhận tin" (`ADMIN_PATHS.newsletter = '/admin/newsletter'`), sau "Bộ sưu tập".
- Trang `/admin/newsletter` (server component, chỉ hiện trạng thái hiện tại; lịch sử đồng ý nằm trong CSV, cột "Lịch sử"):
  - toolbar: `h1` "Đăng ký nhận tin" + nút phụ "Xuất CSV" (theo bộ lọc);
  - bộ lọc GET: ô tìm email, select trạng thái (Tất cả / Đang nhận tin / Đã huỷ), nút Lọc;
  - bảng: Email, Trạng thái (badge), Ngày đồng ý (`formatAdminDate`), Nguồn, Phiên bản đồng ý, Thao tác; mobile thành thẻ (`data-label`);
  - rỗng: dòng một ô "Chưa có người đăng ký" hoặc "Không có kết quả phù hợp" khi đang lọc;
  - phân trang `CollectionPagination` (dùng nguyên, truyền `hrefForPage` + `label`).
- Thao tác mỗi hàng ('use client'): "Huỷ đăng ký" (ẩn khi đã huỷ; API ghi event `unsubscribe` `actor: admin`) → dialog thường; "Xoá vĩnh viễn" → dialog `danger`, nội dung nói rõ "chỉ dùng khi người đăng ký yêu cầu xoá dữ liệu, không hoàn tác được". Nút 44px, `aria-label` có email.
- Cài đặt: nhóm "Bản tin" gồm câu đồng ý (textarea, đếm ký tự, bắt buộc, điền sẵn câu mặc định khi chưa lưu), link chính sách (tuỳ chọn, Q4 còn mở nên để trống), nhãn link (tuỳ chọn, placeholder = mặc định), dòng phiên bản chỉ đọc, hint "Form đăng ký trên trang chủ chỉ hiện sau khi lưu câu đồng ý". Lưu bằng nút Lưu chung, lỗi zod map về đúng field.
- Re-skin: tiêu đề trang (`admin.module.css:33-35`, `overview.module.css:25`, login) dùng `--font-display`; nhãn bảng/badge chữ hoa nhỏ; viền hairline; bỏ `box-shadow` cứng nếu có (6 file có `box-shadow`, phần lớn qua `--admin-shadow` đã thành `none`). Sidebar: mục đang chọn vạch trái màu `--admin-accent` (= ink). Dark mode giữ nguyên hành vi.
- Editor trang chủ: CSS theo token (không đổi hành vi).

### Non-functional
- Danh sách, lọc, phân trang render server-side (luật chủ repo). Không kéo hết dữ liệu về client.
- Vùng chạm `--admin-control-height` (44px). Contrast admin sáng/tối theo bảng G2.
- File < 200 dòng (`settings-form.tsx` 157 dòng: nhóm mới tách component).

## Architecture
```
/admin/newsletter (server) -> parseNewsletterListQuery(searchParams) -> getAdminNewsletterList (adminGet + cookie)
  NewsletterListFilters (GET form) | NewsletterListTable (server markup) -> NewsletterRowActions ('use client')
     -> apiFetch PATCH/DELETE -> toast.success + router.refresh | lỗi inline
  <a download href={API export.csv + q/status}>
SettingsForm -> SettingsNewsletterConsentFields -> state (settings-form-state) -> PUT settings -> version mới hiện lại
```

## Related Code Files
- Create:
  - `apps/web/src/app/admin/(protected)/newsletter/page.tsx`, `loading.tsx`
  - `apps/web/src/app/admin/_lib/admin-newsletter-api.ts`
  - `apps/web/src/components/admin/newsletter/`: `newsletter-list-filters.tsx`, `newsletter-list-query.ts`, `newsletter-list-table.tsx`, `newsletter-row-actions.tsx`, `newsletter-copy.ts`
  - `apps/web/src/components/admin/settings/settings-newsletter-consent-fields.tsx`
  - Test: `apps/web/test/admin/newsletter/{newsletter-list-table,newsletter-row-actions,newsletter-list-query}.test.tsx|ts`, `apps/web/test/admin/settings-newsletter-consent-fields.test.tsx`, `apps/web/test/app/admin-newsletter-page.test.tsx`
- Modify:
  - `apps/web/src/lib/admin-paths.ts`, `apps/web/src/components/admin/admin-nav.tsx`
  - `apps/web/src/components/admin/settings-form.tsx`, `settings/settings-form-state.ts`, `settings/settings-form-errors.ts`
  - `apps/web/src/components/admin/home-editor/home-editor.module.css`, `section-card.module.css`, `home-preview-pane.module.css` (chỉ khi token chưa đủ)
  - CSS admin: `admin.module.css`, `admin-list.module.css`, `admin-form.module.css`, `admin-editor.module.css`, `editor-tabs.module.css`, `admin-dropzone.module.css`, `overview/overview.module.css`, `shell/{admin-shell,admin-sidebar,admin-toast,admin-skeleton}.module.css`, `apps/web/src/app/admin/login/login-page.module.css` (chỉ những file cần)
  - Test: `apps/web/test/admin/admin-nav.test.tsx`, `settings-form.test.tsx`, `home-editor/*` (chỉ nếu cần, trừ `home-editor-fixture.ts` của P1)
- Delete: không.

## Implementation Steps
1. Đọc checklist J, K. Mở admin sau P1 (sáng/tối, 390/1440) ghi chỗ lệch còn lại.
2. Re-skin CSS: tiêu đề serif, nhãn chữ hoa nhỏ, hairline; kiểm sidebar/rail/drawer/toast/dialog ở cả hai theme.
4. `ADMIN_PATHS.newsletter`, nav + test.
5. `admin-newsletter-api.ts`, query parser (lenient như `collection-list-query.ts`), filters, table, trang, loading.
6. Row actions + dialog + toast + refresh; link Xuất CSV.
7. Cài đặt: component nhóm Bản tin, state, map lỗi, hiện version + ghi chú chưa lưu; test (chưa lưu → điền sẵn + ghi chú; đã lưu → version).
8. Thử editor: thêm 4 section mới, sửa field, xem trước (cần P4; `DATA_TYPES` đã có từ P1).
9. Chạy thật với API P2: list, lọc, phân trang, CSV mở bằng Excel (cột Lịch sử), huỷ, xoá; lưu câu đồng ý lần đầu → form hiện trên `/`; đổi câu → version tăng.
10. `pnpm lint && pnpm typecheck && pnpm test`. Không commit.

## Todo List
- [ ] Rà admin sau token (2 theme) (chưa làm: admin chưa render trên trình duyệt, chỉ kiểm bằng code)
- [x] Re-skin CSS admin
- [x] Nav + path
- [x] Trang danh sách (server-side)
- [x] Huỷ/xoá + CSV
- [x] Nhóm Bản tin trong Cài đặt
- [ ] Thử editor với section mới (chưa làm: e2e đăng bố cục qua API, không qua editor)
- [x] Chạy thật + lint/typecheck/test (e2e newsletter-admin 8/8 xanh; CSV chưa mở bằng Excel, e2e chỉ đọc file)

## Success Criteria
- `/admin/newsletter?q=abc&status=unsubscribed&page=2` render từ server, đúng kết quả; tắt JS vẫn lọc/phân trang được.
- Huỷ/xoá: một lần xác nhận, toast thành công, hàng cập nhật không tải lại toàn trang.
- CSV tải về theo bộ lọc, mở Excel đúng tiếng Việt.
- Lưu câu đồng ý lần đầu → form đăng ký xuất hiện trên `/`; lưu câu khác → trang chủ dùng câu mới, version +1.
- Contrast admin sáng/tối đạt bảng G2; axe 0 lỗi trên trang mới (P6).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Admin không biết vì sao form chưa hiện trên trang chủ | Trung bình × Thấp | Ghi chú "Chưa lưu" + hint trong nhóm Bản tin; docs P6 |
| Token sáng mới làm lệch dark mode | Thấp × Trung bình | Chỉ đổi khối sáng + accent/focus tối; kiểm 2 theme |
| Admin xoá nhầm | Thấp × Cao | Dialog `danger`, Huỷ autoFocus, nội dung nói rõ hậu quả; mặc định khuyến khích "Huỷ đăng ký" |
| Export lộ ra ngoài | Thấp × Cao | Route sau `requireAdmin`; link chỉ hiện trong admin |

## Security Considerations
- Mọi thao tác qua API admin (cookie session, Origin check). Không lưu email ở client ngoài trang đang xem.
- `aria-label` có email chỉ trong admin (đã đăng nhập).

## Rollback
- `git restore`/xoá theo ma trận P5. Dữ liệu newsletter không bị ảnh hưởng.

## Next Steps
- P6 e2e admin list/CSV/huỷ/xoá, axe admin, docs.
