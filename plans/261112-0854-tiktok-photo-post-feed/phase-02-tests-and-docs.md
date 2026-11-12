# Phase 02 — Test, e2e, docs

## Context Links

- [plan.md](plan.md), [phase-01](phase-01-photo-post-slide.md)
- Unit: `apps/web/test/feed/*.test.tsx`
- E2E: `e2e/public-outfit-feed-photo-post.spec.ts` (mới), `e2e/support/feed-photo-helpers.ts`, `e2e/public-viewport-and-no-js.spec.ts`, `e2e/visual-reference-screenshots.spec.ts`

## Overview

- Priority: cao · Status: completed (2026-11-12)
- Khoá hành vi mới bằng test; chụp lại snapshot feed có chủ ý; cập nhật docs.

## Requirements

Unit (vitest + testing-library):
- `FeedPhotoTrack`: đủ 2 + n tấm, đúng thứ tự, nhãn "Ảnh i/n", nút Mua ngay dùng link an toàn (URL xấu → `aria-disabled`).
- `FeedPhotoNav`: ẩn khi 1 tấm; bấm chấm/mũi tên gọi `scrollTo` đúng vị trí.
- `FeedShopSheet`: mở/đóng, liệt kê đủ món, rel/target đúng.
- `FeedShareButton`: có `navigator.share` → gọi đúng title/url; không có → chép clipboard + báo; AbortError im lặng.
- `FeedStepButtons`: ← → cuộn track của slide hiện tại; bỏ qua khi đang gõ trong ô nhập.

E2E (Playwright, data thật đã seed):
- Mobile 390×844: vuốt ngang tấm 1 → 2, chấm đổi; mở sheet Mua đồ, link có rel sponsored.
- Desktop 1440×860: mũi tên phải + phím → đổi tấm; outfit đầu vẫn vừa khung (test cũ).
- Link món trên lookbook bấm được (không bị khối chữ che).
- Tắt JS: track vẫn có đủ tấm, link "Xem tiếp" còn.

## Implementation Steps

1. Viết/sửa unit test → `pnpm --filter web test`.
2. Thêm e2e vào `public-outfit-feed.spec.ts` → chạy cả bộ e2e.
3. Chụp lại snapshot feed (`--update-snapshots` chỉ cho test feed), xem ảnh trước khi nhận.
4. Docs: `docs/project-changelog.md`, `docs/development-roadmap.md`, mục feed trong `docs/system-architecture.md`.

## Todo List

- [x] Unit test component mới + sửa test cũ (vitest web 730/730, 106 file)
- [x] E2E vuốt ngang / sheet / phím / no-JS (`pnpm e2e` full 132/132, 2026-11-12 ~10:20)
- [x] Rebaseline snapshot feed (không cần: không snapshot nào đổi, project `visual` pass)
- [x] Docs (changelog, roadmap, system-architecture, code-standards)

## Success Criteria

- 100% unit web + e2e qua, không skip, không mock dữ liệu thay cho data seed ở e2e.
  Kết quả: unit 730/730 và e2e 132/132 đều pass, 0 skip (vitest không báo skipped; log Playwright chỉ có "132 passed").

## Risk Assessment

- Giới hạn 20 lần đăng nhập/15 phút của tài khoản e2e admin — đã gặp 429 khi chạy lặp (tester report 09:27), chạy full sau khi hết khung.

## Security Considerations

- Không có.

## Ghi chú khi làm (2026-11-12)

- Unit: `apps/web/test/feed/` gồm 5 file mới (track, nav, shop sheet, share, step keys). Sửa test cũ: không có ghi nhận.
- E2E photo post nằm ở `e2e/public-outfit-feed-photo-post.spec.ts` (tách khỏi `public-outfit-feed.spec.ts`). Helper ở `e2e/support/feed-photo-helpers.ts`. Case no-JS nằm ở `e2e/public-viewport-and-no-js.spec.ts`.
- Cài đặt DB dev: `homeMode=feed`, `looksPageSize=12` (chốt, xem plan.md).
- Báo cáo tester 09:27 ghi e2e full chưa sạch do 429. Kết quả 132/132 ở trên thay thế cho báo cáo đó.

## Next Steps

- Báo khách, chờ phản hồi về việc ẩn header khi ở feed.
- Xử lý hoặc bỏ review Low L2, L3, L4, L5, L7.
