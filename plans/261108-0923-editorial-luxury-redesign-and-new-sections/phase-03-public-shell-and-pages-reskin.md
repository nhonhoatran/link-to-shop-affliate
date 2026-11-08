# Phase 3: Re-skin shell + trang public

## Context Links
- Token, font, module nút `public-button.module.css` của P1 (Q1 đã chốt). Checklist UI phần G (token), H1-H5 (heading, nút, ảnh, thẻ, shell).
- Mockup: header (nav trái chữ hoa, wordmark serif giữa), dải thông báo đen, thẻ ảnh dọc chú thích dưới, footer đen 4 cột + wordmark lớn.
- Code: `components/public/{site-header,site-footer,site-announcement-bar,public-shell,public-nav-links,outfit-card,collection-card,collection-header,lookbook-card,look-breadcrumb,looks-pagination,public-message,related-outfits-section}.*`, `components/lookbook/lookbook.module.css` (199 dòng), `app/(public)/{looks,collections,look}/**`, `app/not-found.tsx`.
- Docs: `docs/code-standards.md` mục "Giao diện (web)", "Baseline visual của lookbook".

## Overview
- Priority: P2. Status: Completed (còn mở: rà mắt 390/1440 bằng ảnh thật). Effort: 12h. Chờ P1. Song song P2, P4, P5. Không phụ thuộc API mới.
- Phần lớn đã đổi nhờ token P1. Phase này sửa bố cục có chủ đích: header giữa, footer đen, thẻ 2:3 chú thích dưới, tiêu đề serif, nhãn chữ hoa, nút vuông.

## Key Insights
- 6/14 chỗ tự viết pill nằm ở P3: `looks-pagination.module.css:17`, `public-message.module.css:27`, `public-shell.module.css:24` (skip link), `related-outfits-section.module.css:24`, `site-footer.module.css:113`, `site-header.module.css:45`. Q1 đã chốt: CTA dùng `public-button.module.css` và xoá rule pill riêng; link nav/pagination/skip link giữ class riêng (không phải nút).
- Tiêu đề trang dùng `--page-title-size` ở 5 module P3 (`looks-page.module.css:3`, `collections-page.module.css:3`, `collection-header.module.css:31`, `public-message.module.css:10`, `related-outfits-section.module.css:7`): thêm `font-family: var(--font-display)` + `font-weight: var(--font-weight-display)`. Không dùng rule `h1, h2` toàn cục (sẽ đè tên món của lookbook và admin).
- Header hiện `flex-wrap` không có menu mobile (`site-header.module.css:9-19`). Ít mục nav (Outfit, Bộ sưu tập) nên mobile: wordmark giữa hàng 1, nav hàng 2 cuộn ngang trong khung (không drawer, không JS).
- Thẻ outfit `object-fit: contain` (`outfit-card.module.css:36`) với ảnh người mẫu dọc 2:5: đổi khung sang 2:3 vẫn thấy trọn người, chỉ thêm nền hai bên. Thẻ bộ sưu tập `cover` (`collection-card.module.css:36`) bị cắt nhiều hơn: dùng `object-position` token, kiểm bằng ảnh thật.
- Chữ đè ảnh ở ô bộ sưu tập (mockup) không làm: chú thích nằm dưới ảnh, contrast theo token, không phụ thuộc ảnh.
- Lookbook: `lookbook.module.css` đang 199 dòng. Đổi font tên món bằng `font` shorthand thay 3 dòng `font-size/weight/line-height` (`:63-70`), giữ < 200 dòng. Màu lookbook (`--color-*`) đã đơn sắc, không đổi.
- Chữ hoa chỉ bằng CSS `text-transform`, DOM giữ chữ thường (dữ liệu, tên truy cập, e2e không đổi).

## Requirements
### Functional
- Dải thông báo: nền ink, chữ hoa cỡ `--text-label`, giãn chữ; link gạch chân. Focus ring sáng (`--client-focus-on-ink`).
- Header: lưới 3 cột desktop (nav trái, wordmark giữa, cột phải trống để cân), wordmark `--font-display` từ `siteName`; dưới 768px wordmark giữa, nav dưới cuộn ngang. Viền dưới hairline. Giữ `HideOnScrollHeader`, nhãn `aria-label` cũ.
- Footer: nền `--client-footer-bg`; cột từ `footer.columns` (tối đa 4, settings) + cột mạng xã hội; tiêu đề cột chữ hoa; wordmark lớn `aria-hidden="true"` (tên site đã có ở chữ copyright); hàng copyright chữ hoa nhỏ. Không thêm chọn ngôn ngữ.
- Thẻ outfit/bộ sưu tập: khung `--client-card-image-ratio` / `--client-collection-card-ratio` (2:3), không bo, không bóng; tên serif dưới ảnh; hover: gạch chân tên + scale ảnh nhẹ (token có sẵn), có khối reduced-motion.
- Trang `/looks`, `/collections`, `/collections/[slug]`, `/look/[slug]`, 404: tiêu đề serif, breadcrumb chữ hoa nhỏ, pagination vuông, `PublicMessage` dùng module nút.
- Lookbook: chỉ font/màu theo token (`--lookbook-item-name-font`, Q2 đã chốt: có đổi font); không đổi kích thước, cột, connector.

### Non-functional
- Không cuộn ngang trang ở 320/390/768/1024/1440 (nav mobile cuộn trong khung riêng).
- Vùng chạm 44px cho mọi link nav/footer/pagination.
- Không hex trong CSS module; breakpoint viết số kèm comment `/* 768px = --bp-md */`.
- File < 200 dòng; `site-footer.module.css` (138 dòng) tách nếu vượt.

## Architecture
```
PublicShell
  SiteAnnouncementBar (nền ink)  ->  HideOnScrollHeader > SiteHeader (grid: nav | wordmark | spacer)
  main#main > page (PublicPage)
  SiteFooter (nền footer-bg) > columns grid (auto-fit, --client-footer-column-min) + social > wordmark (aria-hidden) > copyright
Card: figure(khung 2:3, ảnh) + caption (h3 serif + meta) ; CTA = public-button.module.css
```

## Related Code Files
- Modify:
  - `apps/web/src/components/public/`: `site-header.tsx`, `site-header.module.css`, `site-footer.tsx`, `site-footer.module.css`, `site-footer-columns.tsx`, `site-social-links.tsx`, `site-announcement-bar.module.css`, `public-shell.module.css`, `public-nav-links.tsx` (nếu cần class), `outfit-card.tsx`, `outfit-card.module.css`, `collection-card.tsx`, `collection-card.module.css`, `collection-header.module.css`, `lookbook-card.module.css`, `look-breadcrumb.module.css`, `looks-pagination.module.css`, `public-message.tsx`, `public-message.module.css`, `related-outfits-section.tsx`, `related-outfits-section.module.css`, `public-page.module.css`, `public-copy.ts` (chỉ nếu thêm nhãn)
  - `apps/web/src/components/lookbook/lookbook.module.css`
  - `apps/web/src/app/(public)/looks/looks-page.module.css`, `collections/collections-page.module.css`, `collections/[slug]/collection-page.module.css`, `not-found.tsx` (nếu đổi class), `apps/web/src/app/not-found.tsx`
  - Test: `apps/web/test/public/{site-header,site-footer,site-announcement-bar,outfit-card-grid,collection-card-grid,related-outfits-section,looks-pagination}.test.tsx` (chỉ khi markup đổi), `apps/web/test/lookbook/lookbook-layout.test.tsx` (nếu cần), `apps/web/test/app/{looks-page,look-page,collections-page,collection-detail-page}.test.tsx` (nếu cần)
- Create: `apps/web/src/components/public/site-footer-wordmark.tsx` (nếu footer vượt 200 dòng), `apps/web/test/public/site-footer-wordmark.test.tsx` (cùng điều kiện).
- Delete: không.

## Implementation Steps
1. Đọc checklist H1-H5. Mở `/`, `/looks`, `/look/<slug>`, `/collections` ở 390 và 1440 sau P1 để thấy phần token đã đổi, ghi chỗ còn lệch.
2. Header + dải thông báo: lưới 3 cột, wordmark serif, nav chữ hoa, nav mobile cuộn ngang, focus sáng trên nền đen.
3. Footer: nền đen, lưới cột + social, wordmark lớn `aria-hidden`, copyright; token `--color-focus` đặt cục bộ = `--client-focus-on-ink`.
4. Thẻ outfit + bộ sưu tập: khung 2:3, chú thích dưới, bỏ bóng/bo; kiểm ảnh thật (người mẫu cao, bìa ngang).
5. Trang + tiêu đề serif + breadcrumb + pagination + `PublicMessage` (dùng module nút, xoá rule pill riêng).
6. Lookbook: shorthand `font` cho `.itemName` dùng `--lookbook-item-name-font` (Q2). Chạy spec visual (chụp riêng `[data-lookbook]`, 4 ảnh): được phép đỏ do font/màu chữ (Q2); ghi danh sách ảnh lệch cho P6, không `--update-snapshots`. Lệch bố cục (vị trí, kích thước, connector) là lỗi, sửa trong P3.
7. Sửa test unit public theo markup mới (giữ assert vai trò, tên truy cập).
8. `pnpm lint && pnpm typecheck && pnpm test`; `pnpm e2e --project public` (chỉ chạy, P6 sửa spec nếu selector đổi). Không commit.

## Todo List
- [ ] Rà sau token (390/1440) (chưa làm: rà mắt bằng ảnh thật; vòng kiểm trước chỉ bằng code và computed style)
- [x] Header + dải thông báo
- [x] Footer đen + wordmark
- [x] Thẻ outfit/bộ sưu tập 2:3
- [x] Trang, tiêu đề, breadcrumb, pagination, message
- [x] Lookbook font (visual 4/4 sau khi chụp lại baseline một lần, Q2)
- [x] Test unit public
- [ ] lint/typecheck/test OK; e2e public 61/61 xanh. Chưa làm: rà 390/1440 bằng mắt, `/look/[slug]`, `/collections/[slug]`, 404 bằng trình duyệt

## Success Criteria
- Mọi chữ trên nền public đạt >= 4.5:1 (bảng G1); viền ô điều khiển >= 3:1; focus ring thấy rõ trên nền sáng và nền đen (axe ở P6 = 0 lỗi contrast).
- 320px: không cuộn ngang trang; mọi link nav chạm được 44px.
- Không còn `box-shadow` và `border-radius` khác token trong `components/public/**` (grep).
- Visual: chỉ lệch font/màu chữ trong lookbook (danh sách gửi P6); không lệch bố cục.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Ảnh bìa bộ sưu tập bị cắt xấu ở 2:3 | Trung bình × Trung bình | Token ratio + `object-position`; duyệt bằng ảnh thật, đổi token không cần sửa code |
| e2e public cũ dựa vào bố cục header (vị trí, wrap) | Trung bình × Thấp | Giữ tên truy cập, nhãn; P6 sửa spec nếu buộc phải đổi, ghi lý do |
| Chữ hoa + giãn chữ làm nav tràn ở 320 | Trung bình × Thấp | Nav cuộn ngang trong khung; cỡ `--text-label` |
| Trình đọc màn hình đánh vần chữ hoa | Thấp × Thấp | DOM giữ chữ thường, chỉ CSS đổi hoa |
| Lookbook vượt 200 dòng | Thấp × Thấp | Shorthand `font`, không thêm dòng |

## Security Considerations
- Không đổi luồng dữ liệu. Link ngoài trong footer vẫn qua `PublicSmartLink` (`rel="noopener noreferrer"`, tab mới).

## Rollback
- `git restore` file theo ma trận P3. Token P1 vẫn áp dụng nên giao diện về dạng "token-only" (vẫn dùng được).

## Next Steps
- P6: e2e responsive/no-JS, axe, re-baseline lookbook sau khi chủ repo duyệt (Q2), docs.
