# Phase 01 — Khung bài Photo kiểu TikTok

## Context Links

- Plan: [plan.md](plan.md)
- Feed hiện tại: `apps/web/src/components/feed/outfit-feed-slide.tsx`, `outfit-feed.module.css`, `feed-step-buttons.tsx`
- Link affiliate: `apps/web/src/components/lookbook/lookbook-link-props.ts` (`affiliateLinkProps`)
- Copy: `apps/web/src/components/public/public-copy.ts` (`FEED_COPY`)
- Token: `apps/web/src/styles/design-tokens.css`, `client-theme-tokens.css`
- DTO: `packages/shared/src/public-outfit-dto.ts` (`modelImage`, `items[].image`, `items[].affiliateUrl`)

## Overview

- Priority: cao (khách đang cần)
- Status: completed (2026-11-12). Lint chưa có bằng chứng, xem todo.
- Mỗi outfit trong feed thành một "bài Photo": dải ảnh vuốt ngang + chấm + chữ đè + cột nút phải.

## Key Insights

- Outfit chỉ có 1 ảnh người mẫu + ảnh từng món → dải ảnh dựng từ data có sẵn, không đổi API.
- Lookbook (tấm 1) có link món đồ ở mép dưới → khối chữ đè KHÔNG được che link: tấm lookbook chừa đáy bằng chiều cao khối chữ.
- Feed đang render server (cả lô tải thêm qua server action `loadFeedPage` → `OutfitFeedSlides`). Giữ nguyên: dải ảnh render server, JS chỉ cho chấm/mũi tên/sheet/chia sẻ.
- Ảnh tấm 2+ để lazy (mặc định của `next/image`), chỉ tấm 1 của outfit đầu được preload như cũ.
- Chưa có dialog phía public → dùng `<dialog>` gốc của trình duyệt (`showModal`, Esc đóng, khoá focus sẵn).

## Requirements

Người dùng (mobile): vuốt lên/xuống = outfit khác (giữ nguyên) → vuốt trái/phải = ảnh khác trong outfit, chấm tròn báo đang ở tấm mấy →
bấm "Mua đồ" ở cột phải → sheet trượt từ dưới lên liệt kê món (ảnh nhỏ, tên, nút "Mua ngay") → bấm là mở link shop tab mới.
Bấm "Chia sẻ" → menu chia sẻ của điện thoại; máy không hỗ trợ thì chép link + báo "Đã chép link".

Người dùng (desktop): mũi tên trái/phải hai bên dải ảnh + phím ← →; nút lên/xuống bên phải giữ nguyên.

Từng tấm:
1. Lookbook (`LookbookLayout fill`, như hiện tại), nền sáng như ảnh mẫu 1.
2. Ảnh người mẫu, `object-fit: contain` trên nền tối (không cắt ảnh).
3+. Mỗi món: ảnh món (contain) + tên + phụ đề + nút "Mua ngay" (`affiliateLinkProps`).

Khối chữ đè dưới trái (chữ trắng, nền gradient tối): tên outfit (link `/look/[slug]`) + `seoDescription` tối đa 2 dòng.
Cột phải: nút "Mua đồ" (icon túi + số món), nút "Chia sẻ" (icon). Nút tròn ≥ 44px.

Phi chức năng: không kéo thêm thư viện; file < 200 dòng; mọi màu/kích thước là token trong `design-tokens.css`; giữ chạy được khi tắt JS (dải ảnh vẫn vuốt được bằng scroll ngang, nút Mua đồ ẩn, link outfit vẫn bấm được).

## Architecture

```
OutfitFeedSlide (server, article[data-feed-slide])
├── FeedPhotoTrack (server)   ul[data-photo-track] scroll-snap-x
│   ├── li: LookbookLayout fill
│   ├── li: model image
│   └── li × n: FeedItemPhoto (ảnh món + Mua ngay)
├── FeedPhotoNav (client)     chấm + mũi tên ←/→, đọc scrollLeft của track
├── FeedPostCaption (server)  tên + mô tả, đè dưới trái
└── FeedActionRail (server)
    ├── FeedShopSheet (client)    nút Mua đồ + <dialog> danh sách món
    └── FeedShareButton (client)  navigator.share → clipboard → báo
FeedStepButtons: thêm ArrowLeft/ArrowRight → cuộn track của slide đang hiện.
```

## Related Code Files

Sửa:
- `apps/web/src/components/feed/outfit-feed-slide.tsx` — ghép các phần mới
- `apps/web/src/components/feed/outfit-feed.module.css` — slide nền tối, bỏ `.caption` cũ
- `apps/web/src/components/feed/feed-step-buttons.tsx` — phím ← →
- `apps/web/src/components/public/public-copy.ts` — thêm chữ vào `FEED_COPY`
- `apps/web/src/styles/design-tokens.css` — token `--feed-post-*`, `--feed-rail-*`, `--feed-dot-*`

Tạo (trong `apps/web/src/components/feed/`):
- `feed-photo-track.tsx`, `feed-item-photo.tsx`, `feed-photo-nav.tsx`, `feed-post-caption.tsx`,
  `feed-action-rail.tsx`, `feed-shop-sheet.tsx`, `feed-share-button.tsx`, `feed-post.module.css`

Xoá: không.

## Implementation Steps

1. Token: màu nền bài (`--feed-post-bg` đen), chữ đè, gradient, cỡ nút cột phải, cỡ chấm, chiều cao khối chữ.
2. `FEED_COPY`: `shop`, `share`, `copied`, `shareFailed`, `buy`, `closeSheet`, `previousPhoto`, `nextPhoto`, `photoLabel(i, n)`, `itemsTitle`.
3. `FeedPhotoTrack` + `FeedItemPhoto`: `ul` scroll ngang, `scroll-snap-type: x mandatory`, mỗi `li` rộng 100%, `aria-roledescription="slide"`, nhãn "Ảnh i/n".
4. `FeedPhotoNav`: tìm track trong slide cha, lắng nghe scroll → index; chấm là `button` (desktop bấm được), mũi tên ẩn trên mobile (<768px), ẩn khi chỉ 1 tấm; reduced-motion → cuộn không mượt.
5. `FeedPostCaption`: chữ đè, `pointer-events: none` trừ link; tấm lookbook chừa `padding-bottom` = chiều cao khối chữ.
6. `FeedShopSheet`: nút + `<dialog>`; danh sách món theo thứ tự `items` (đã sort); link qua `affiliateLinkProps`; bấm nền ngoài/Esc/nút Đóng để đóng.
7. `FeedShareButton`: `navigator.share({ title, url })` với url tuyệt đối từ `outfitPath`; huỷ chia sẻ (AbortError) thì im lặng; fallback `navigator.clipboard.writeText` + vùng `role="status"` báo 2s.
8. `FeedStepButtons`: ArrowLeft/ArrowRight trên slide gần nhất, cùng luật bỏ qua ô nhập liệu/phím bổ trợ như ↑↓.
9. Desktop: dải ảnh rộng tối đa bằng lookbook hiện tại, căn giữa, nền tối hai bên; cột phải nằm sát mép phải dải ảnh, không đè nút lên/xuống.
10. `pnpm --filter web typecheck` + lint, xem tay ở 390×844 và 1440×860.

## Todo List

- [x] Token + copy
- [x] FeedPhotoTrack / FeedItemPhoto
- [x] FeedPhotoNav (chấm + mũi tên)
- [x] FeedPostCaption + chừa đáy lookbook
- [x] FeedActionRail + FeedShopSheet + FeedShareButton
- [x] Phím ← → trong FeedStepButtons
- [x] Typecheck `apps/web` (tsc --noEmit exit 0, tester 2026-11-12)
- [x] Xem tay 390×844 và 1440×860 (2026-11-12, `/looks`)
- [x] Lint: `pnpm lint` (eslint toàn repo) exit 0, 2026-11-12

## Success Criteria

- Mobile 390×844 & desktop 1440×860: mỗi outfit vừa khung, vuốt/bấm qua đủ 2 + số món tấm, chấm đúng vị trí.
- Link món trên lookbook không bị khối chữ che (bấm được).
- Sheet Mua đồ mở/đóng bằng chuột, chạm, Esc; link có `rel="sponsored nofollow noopener noreferrer"`, `target=_blank`.
- Tắt JS: dải ảnh vẫn cuộn ngang, link "Xem tiếp" vẫn có.
- Không lỗi typecheck/lint; test cũ của feed vẫn qua (sửa nếu đổi markup có chủ ý).

## Risk Assessment

- Vuốt ngang trong khung cuộn dọc snap: trình duyệt mobile tự khoá trục theo hướng vuốt đầu tiên — kiểm bằng e2e chạm trên Chromium mobile.
- Lookbook nhiều món cao hơn khung: đã có `overflow-y: auto` an toàn; giữ.
- Snapshot visual feed đổi → phải chụp lại có chủ ý ở phase 02.

## Security Considerations

- Link mua chỉ qua `affiliateLinkProps` (chặn `javascript:`/`http:`).
- Chia sẻ chỉ URL của site (`SITE_URL` + `outfitPath`), không lấy từ dữ liệu người dùng.

## Next Steps

- Phase 02 test + docs. Vòng sau (nếu khách muốn): ẩn header khi ở feed, ảnh phụ cho outfit.

## Ghi chú cấu hình

- Chữ trên nút (`Mua đồ`, `Chia sẻ`, `Mua ngay`...) để trong `FEED_COPY` như mọi chữ giao diện public khác — ngoại lệ "không đáng làm dynamic" (nhãn UI cố định, đổi qua code giống phần còn lại của site).
- Kích thước/màu là token CSS, không viết thẳng trong component.

## Ghi chú khi làm (2026-11-12)

- Link chia sẻ dựng phía trình duyệt từ `window.location.origin` + `outfitPath`, không lấy `SITE_URL` (slide không phụ thuộc env server). Hệ quả: vào qua tunnel/host preview thì link chia sẻ là host đó.
- Quá 10 tấm thì thay hàng chấm bằng bộ đếm "i/n" để không đè cột nút trên điện thoại.
- Review: [code-reviewer-261112-0913-tiktok-photo-post-feed.md](../reports/code-reviewer-261112-0913-tiktok-photo-post-feed.md).
- Kiểm tay 2026-11-12 trên dev (`/looks`): 390×844 lookbook vừa khung, dải chữ không che link món, vuốt sang tấm món có "Mua ngay", sheet Mua đồ mở và Esc đóng; 1440×860 mũi tên và cột nút nằm ngoài ảnh, không đè nút lên/xuống.
- Sau review: sheet Mua đồ chuyển sang `useModalDialog` (trả focus về nút khi đóng).
- Review Low L2, L3, L4, L5, L7 còn mở (chưa xử lý, xem plan.md).
- File ngoài danh sách "Tạo" (tách để giữ < 200 dòng): `feed-photo-sizes.ts`, `feed-photo-scroll.ts`, `feed-post-controls.module.css`, `feed-shop-sheet.module.css`.
