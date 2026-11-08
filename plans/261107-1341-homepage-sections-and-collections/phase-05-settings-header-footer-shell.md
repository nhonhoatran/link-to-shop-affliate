# Phase 5: Dải thông báo, header, footer và form Cài đặt

## Context Links
- Contract P1: `settings-schemas.ts` (`collectionsNavEnabled`, `collectionsLabel`, `footer`, `announcement`, `DEFAULT_ANNOUNCEMENT`, public `collectionsNavVisible`, `announcement`), `PublicSmartLink`, `DEFAULT_COLLECTIONS_LABEL`, `COLLECTIONS_PAGE_PATH`. API P2: settings đã điền trường mới.
- Brainstorm "Chốt thêm": header thêm đúng 1 link "Bộ sưu tập", không menu thả xuống, mobile vẫn hiện thẳng link (giống quyết định 9 của plan trước).
- Code tham chiếu: `components/public/{public-shell,site-header,site-footer,public-nav-items,public-nav-links}.tsx`, `components/admin/{settings-form,settings-listing-fields,admin-form-field,admin-panel}.tsx`.
- Checklist UI phần F (plan dir này), B5–B8 của checklist cũ.

## Overview
- Priority: P2. Status: Completed (2026-11-07). Effort: 9h. Bắt đầu sau P1, code song song P2 bằng fixture. Đóng phase sau khi chạy thật với API P2.
- Dải thông báo toàn site (chữ + link tuỳ chọn, bật/tắt) nằm trên header public, cấu hình trong Cài đặt. Không phải section trang chủ (đã chốt 2026-11-07): hiện ở mọi trang public.
- Header thêm link bộ sưu tập theo Cài đặt (mặc định bật, tự ẩn khi chưa có bộ sưu tập đã đăng). Footer thêm các cột link và link mạng xã hội. Form Cài đặt có chỗ sửa các mục này.

## Key Insights
- `PublicShell` đã bắt lỗi settings và trả giá trị dự phòng (`public-shell.tsx:9-17`). Giữ cơ chế này: lỗi thì không có dải thông báo, không có link bộ sưu tập, không có cột footer.
- Header đang `position: sticky` (`site-header.module.css:2`). Dải thông báo đặt trên header, **không sticky**: cuộn xuống là trôi đi, header vẫn dính như cũ, không chiếm thêm chỗ khi đọc lookbook. Thứ tự DOM: skip link → dải thông báo → header, để skip link vẫn là phím Tab đầu tiên.
- Spec visual chụp `[data-lookbook]` của `/look/<slug>` và mặc định dải tắt, nên baseline không lệch. Vẫn chạy spec.
- `PUBLIC_NAV_ITEMS` là hằng (`public-nav-items.ts:11-14`). Đổi thành `buildPublicNavItems(settings)`. Header và footer cùng dùng, nên nhãn và thứ tự giống nhau ở cả hai chỗ.
- Trường public mới là optional (P1 Key Insights). Web dùng `?? DEFAULT_COLLECTIONS_LABEL`, `?? false`, `?? { columns: [], social: [] }`, `?? null`.
- `settings-form.tsx` 147 dòng. Thêm 4 nhóm field sẽ vượt 200 → tách state/serialize sang `settings-form-state.ts`, mỗi nhóm field một component (theo mẫu `settings-listing-fields.tsx`).
- PUT settings thay cả document (`settings-service.ts`): form luôn gửi đủ `footer`, `collectionsNavEnabled`, `collectionsLabel`, `announcement`, nếu không các trường này bị xoá.
- Nhãn field có sẵn "Số outfit mỗi trang (trang Tất cả outfit)" (`settings-listing-fields.tsx:21`). Nay giá trị này áp cả `/collections` và `/collections/[slug]` (quyết định 8) → đổi nhãn cho đúng.
- Không có icon thương hiệu trong `lucide-react@1.70.0` (quyết định 10) → mạng xã hội hiện chữ (pill), link ngoài mở tab mới có `rel="noopener noreferrer"`.

## Requirements
### Public
- Dải thông báo (`SiteAnnouncementBar`, server component): chữ + link qua `PublicSmartLink` (link ngoài có `rel`). Không có `linkLabel`/`href` thì chỉ chữ. Một dòng trên desktop, xuống dòng tự nhiên trên mobile (không cắt chữ). Nằm trong `<aside aria-label="Thông báo">` (nhãn trong `public-copy.ts`). Màu, cỡ chữ, padding lấy token P1; tương phản chữ/nền đạt AA. Không animation, không nút đóng (YAGNI; muốn tắt thì tắt trong Cài đặt).
- Header: Trang chủ, Tất cả outfit, [nhãn bộ sưu tập → `/collections`] khi `collectionsNavVisible`. `aria-current` theo đường dẫn: `/collections/*` cũng tính là trang bộ sưu tập (đổi so khớp ở `PublicNavLinks` sang "bắt đầu bằng", trừ `/`).
- Không cuộn ngang ở 320px với 3 link (e2e P7 đo). Nếu chật thì giảm gap/size bằng token, không thêm nút ☰.
- Footer:
  - giữ khối giới thiệu + nav hiện có;
  - thêm các cột `footer.columns` (tiêu đề `p` hoặc `h2` theo checklist F, danh sách link qua `PublicSmartLink`);
  - thêm hàng mạng xã hội;
  - cột xếp chồng trên mobile, lưới ở ≥768px.

### Admin (Cài đặt)
Trang Cài đặt chia nhóm bằng `AdminPanel`: "Thông tin site", "Dải thông báo", "Danh sách", "Bộ sưu tập", "Chân trang". Một nút "Lưu" chung giữ như cũ.
- Nhóm "Dải thông báo":
  - công tắc "Hiện dải thông báo trên đầu trang" (mặc định tắt);
  - "Nội dung" (đếm ký tự còn lại theo guard 160 của shared), "Chữ trên link" và "Đường dẫn" (tuỳ chọn, hint "Đường dẫn trong site như /collections hoặc link https://...");
  - xem trước nhỏ ngay dưới field, dùng chính `SiteAnnouncementBar` (người dùng thấy ngay chữ sẽ hiện ra sao);
  - tắt công tắc thì field mờ nhưng giữ giá trị (bật lại không phải gõ lại).
- Số click: bật dải thông báo có link rồi lưu = công tắc (1) + gõ nội dung, chữ link, đường dẫn + "Lưu" (2).
- Nhóm "Bộ sưu tập":
  - checkbox "Hiện link Bộ sưu tập trên menu" (mặc định bật), hint "Link tự ẩn khi chưa có bộ sưu tập nào được đăng";
  - field "Tên hiển thị", placeholder = `DEFAULT_COLLECTIONS_LABEL`, hint "Để trống để dùng giá trị mặc định".
- Nhóm "Chân trang":
  - Cột link: mỗi cột là một khối gồm "Tiêu đề cột", các dòng link ("Chữ hiển thị" + "Đường dẫn"), "Thêm link", "Xoá" trên từng dòng, "Lên"/"Xuống" cho cột.
  - Nút "Thêm cột" bị `disabled` khi đủ guard, có hint "Tối đa N cột" (N lấy từ hằng guard của shared, không gõ số).
  - Mạng xã hội: các dòng "Tên" + "Link (https://...)", "Thêm", "Xoá".
- Số click: thêm cột có 2 link rồi lưu = "Thêm cột" (1) + gõ tiêu đề + "Thêm link" (2) + gõ + "Thêm link" (3) + gõ + "Lưu" (4).
- Lỗi zod theo đường dẫn (`footer.columns.0.links.1.href`) hiện ngay dưới đúng ô (`AdminFormField` có `aria-invalid`). Lỗi đầu tiên được focus.
- Xoá cột có link: hỏi `ConfirmDialog` ("Xoá cột và N link?"). Xoá 1 dòng link không hỏi (thêm lại dễ).

### Non-functional
- Token `--client-*`/`--admin-*` (P1). Vùng chạm 44px ở admin. File < 200 dòng.
- Tắt JS: header và footer public đọc được (đều là server component, trừ `PublicNavLinks` vốn đã SSR).

## Architecture
```
PublicShell (server) -> loadShellSettings() -> { siteName, description, navItems, footer, announcement }
  navItems = buildPublicNavItems({ collectionsNavVisible, collectionsLabel })
  skipLink | SiteAnnouncementBar(announcement) khi khác null | SiteHeader(navItems) | main | SiteFooter(siteName, description, navItems, footer)
SettingsForm (client)
  state: settings-form-state.ts (fromAdminSettings / toSettingsInput)
  <SettingsAnnouncementFields/> <SettingsListingFields/> <SettingsCollectionsNavFields/> <SettingsFooterColumnsEditor/> <SettingsSocialLinksEditor/>
  submit -> settingsInputSchema (shared) -> PUT /api/admin/settings -> toast + router.refresh()
```

## Related Code Files
- Create:
  - `components/public/site-announcement-bar.tsx`, `site-announcement-bar.module.css`, `site-footer-columns.tsx`, `site-social-links.tsx`
  - `components/admin/settings/`: `settings-form-state.ts`, `settings-announcement-fields.tsx`, `settings-collections-nav-fields.tsx`, `settings-footer-columns-editor.tsx`, `settings-social-links-editor.tsx`, `settings-repeatable-list.module.css`
  - Test: `apps/web/test/public/site-footer.test.tsx`, `apps/web/test/public/site-announcement-bar.test.tsx`, `apps/web/test/admin/settings-footer-editor.test.tsx`, `apps/web/test/admin/settings-announcement-fields.test.tsx`
- Modify:
  - `components/public/public-shell.tsx`, `public-shell.module.css` (chỉ khi cần chỗ cho dải), `public-copy.ts`, `site-header.tsx`, `site-header.module.css`, `site-footer.tsx`, `site-footer.module.css`, `public-nav-items.ts`, `public-nav-links.tsx`
  - `components/admin/settings-form.tsx`, `components/admin/settings-listing-fields.tsx`
  - Test: `apps/web/test/public/site-header.test.tsx`, `apps/web/test/admin/settings-form.test.tsx`
- Delete: không

## Implementation Steps
1. Đọc checklist F. `buildPublicNavItems` + đổi `PublicNavLinks` so khớp tiền tố + test header (có/không link, `aria-current` trên `/collections/x`).
2. `PublicShell` truyền settings mới. `SiteAnnouncementBar` + test (`null` → không render; có link nội bộ → `next/link`; link ngoài có `rel`; skip link vẫn đứng trước). `SiteFooterColumns`, `SiteSocialLinks` + test footer (link ngoài có `rel`, không có cột thì footer như cũ).
3. `settings-form-state.ts`: chuyển state hiện có + trường mới, `toSettingsInput` luôn gửi đủ khoá.
4. `SettingsAnnouncementFields` (+ test: tắt giữ giá trị, bật mà rỗng → lỗi tại ô nội dung, `javascript:` → lỗi tại ô đường dẫn), `SettingsCollectionsNavFields`, `SettingsFooterColumnsEditor`, `SettingsSocialLinksEditor` (id field ổn định theo index để map lỗi zod). Đổi nhãn `looksPageSize`.
5. Ráp vào `SettingsForm` theo nhóm `AdminPanel`. Sửa `settings-form.test.tsx` (gửi đủ khoá, lỗi href hiện đúng ô).
6. Chạy thật với API P2: bật dải thông báo → thấy trên `/`, `/looks`, `/look/<slug>`, `/collections`, 404; tắt → mất. Lưu footer → `/` có cột mới (revalidate `scope: 'all'`); tắt nav → link mất; chưa có bộ sưu tập đã đăng → link mất dù đang bật. Đo 320px (dải thông báo 160 ký tự không gây cuộn ngang). `pnpm lint && pnpm typecheck && pnpm test`, spec visual. Không commit (commit một lần cuối đợt, khi chủ repo yêu cầu).

## Todo List
- [x] Nav items từ settings + header + test
- [x] Dải thông báo public + test
- [x] Footer cột + mạng xã hội + test (link mạng xã hội mở tab mới qua `PublicSmartLink newTab`)
- [x] Tách state form Cài đặt
- [x] Field dải thông báo, nav bộ sưu tập, editor cột footer, editor mạng xã hội
- [x] Ráp form + sửa test
- [x] Chạy thật, đo 320px, lint/typecheck/test/visual

## Success Criteria
- Có bộ sưu tập đã đăng và nav bật → header có 3 link ở 320–1440px, không cuộn ngang. Tắt nav hoặc chưa có bộ sưu tập đã đăng → 2 link.
- Lưu footer 2 cột × 2 link + 2 mạng xã hội: thấy trên `/`, `/looks`, `/look/<slug>`, 404 sau khi lưu.
- Nhập `javascript:alert(1)` vào một link footer → lỗi ngay tại ô đó, không gửi request (zod phía client). Nếu gửi thẳng API thì vẫn 400 (test P2).
- Thêm cột có 2 link rồi lưu: 4 click + gõ.
- Bật dải thông báo có link → hiện trên mọi trang public sau khi lưu (không cần deploy). Tắt → không còn trong HTML. Bật dải thông báo: 2 click + gõ.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Form quên gửi khoá mới → PUT xoá footer | Trung bình × Trung bình | `toSettingsInput` có test "gửi đủ khoá". e2e support (P7) cũng gửi đủ |
| Header chật ở 320px | Trung bình × Thấp | Đo ở bước 6. Giảm gap bằng token mới (xin P1/lead) |
| Đổi so khớp `aria-current` làm lệch test cũ | Thấp × Thấp | `/` vẫn so khớp chính xác. Sửa `site-header.test.tsx` trong phase |

## Security Considerations
- Link footer và dải thông báo qua `safeHrefSchema`, mạng xã hội chỉ `http(s)`, kiểm ở cả client (UX) và API (P2).
- Link ngoài: `rel="noopener noreferrer"`. Không render HTML do admin nhập.

## Rollback
- Hoàn tác bằng git (xoá file mới, `git restore` file đã sửa): header/footer về như cũ, mất dải thông báo, form Cài đặt mất nhóm mới. Giá trị footer còn trong DB, vô hại. Lưu ý: sau khi hoàn tác, lưu Cài đặt bằng form cũ sẽ xoá các khoá này (hành vi PUT thay cả document).

## Next Steps
- P7 e2e: dải thông báo, lưu footer, nav bộ sưu tập, 320px.
