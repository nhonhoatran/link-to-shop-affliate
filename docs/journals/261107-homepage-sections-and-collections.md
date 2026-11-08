# Trang chủ nhiều section + Bộ sưu tập: lỗi bundle, lỗi serialize, và e2e chạy trên DB dùng chung (2026-11-07)

**Date**: 2026-11-07
**Severity**: Medium
**Component**: Public home, collections, admin home editor, e2e content suite
**Status**: Resolved (code); 2 mục follow-up đang mở

**Plan:** `plans/261107-1341-homepage-sections-and-collections/plan.md` (mục "Kết quả")
**Review:** `plans/reports/code-reviewer-261107-homepage-sections-and-collections.md` (8/10, 0 critical)
**Test:** `plans/reports/tester-261107-homepage-sections-e2e.md`

## What Happened
Giao trong một đợt, chưa commit (chủ repo sẽ review trước): bộ sưu tập (model, admin, trang public), trang chủ gồm 7 section cấu hình được với draft/publish/undo/reset, editor kéo-thả dnd-kit dùng được trên điện thoại, thanh thông báo, header/footer cấu hình được, revalidation tags. Làm theo 4 đợt, nhiều agent song song, có ma trận quyền sở hữu file.

## Technical Details
- Bundle: `public-nav-links.tsx` (`'use client'`) import giá trị qua file kéo barrel `@under30ss/shared` → kéo zod + toàn bộ schema vào client bundle public, khoảng +98 KiB mỗi trang. Sửa: đưa `HOME_PATH` sang `home-path.ts`. Kết quả First Load JS `/` 199.1 KiB (baseline 196.0), `/looks` 194.0 KiB.
- Crash ở trang sửa bộ sưu tập: Server Component truyền function prop vào Client Component. Sửa: đưa hàm tạo href sang module dùng được ở client.
- Membership bộ sưu tập: không kiểm giới hạn 24 bộ/outfit (`MAX_COLLECTIONS_PER_OUTFIT`), và có race add/delete. Sửa: trả 400, dọn id chết.
- Publish nháp không đổi ghi đè `previous` bằng chính nó → mất bản hoàn tác. UI chặn được, server thì không.

## The Brutal Truth
Bug bundle và bug crash đều là lỗi do tự đoán mà không đo: chỉ thấy import "trông vô hại". Số liệu bundle phải có mới bắt được. Lỗi publish cho thấy kiểm tra chỉ ở UI là không đủ; server phải tự chặn. Cách e2e teardown wipe settings/home trên DB dùng chung là lỗi thiết kế, không phải lỗi cú pháp, và đáng lẽ phải thấy từ đầu.

## What We Tried
- Review và tester đã chạy: lint/typecheck xanh, unit, e2e, visual không update snapshot.
- Contrast: thử Chromium + axe-core 4.14.0 (Lighthouse CLI chưa chạy, không có trên PATH).
- Stale cache dưới `next dev` sau `revalidateTag(tag, {expire:0})`: không sửa code, e2e poll; production đã kiểm đúng.

## Root Cause Analysis
- Module client import qua barrel: không có ràng buộc nào ngăn việc này.
- Server→Client truyền prop function: không kiểm tính serialize được.
- Publish không idempotent: kiểm tra ở UI, không ở API.
- Teardown e2e: giả định môi trường là local; không có guard host.

## Lessons Learned
- Module `'use client'` chỉ import type, hoặc import từ đường dẫn cụ thể, không qua barrel.
- Khi truyền prop từ Server sang Client, chỉ truyền dữ liệu serialize được.
- Validate idempotency ở server.
- E2E trên DB dùng chung phải snapshot/restore, và có guard localhost.
- Serialize các lần chạy e2e: rate limit login là 20 lần / 15 phút.

## Số liệu kiểm chứng
- Gate cuối (chạy lại sau đợt sửa review, 2026-11-07): lint + typecheck sạch; unit shared 126, api 183, web 572; e2e 88/88.
- Báo cáo tester (87/87, api 177, web 571) là lượt chạy trước đợt sửa review; chênh lệch là test mới thêm sau đó (+6 API, +1 web, +1 project `content-setup`).

## Next Steps
- Chủ repo quyết định phương án cho `.revealOnScroll` (`apps/web/src/styles/motion-primitives.module.css`):
  - A: chỉ animate transform, bỏ opacity từ 0. Rẻ, an toàn a11y.
  - B: opacity bắt đầu từ mức đủ tương phản.
  - C: giữ nguyên. Lúc load chưa scroll, card vẫn fail axe color-contrast (1.2–1.5:1).
  Người viết khuyên A hoặc B.
- Chạy Lighthouse CLI chính thức cho accessibility/SEO trên một trang collection có fixture.
- Follow-up: N+1 khi tải nhãn trong editor/picker (cần filter `ids` ở list admin); gộp FAQPage JSON-LD; khoá reset/revert-draft bằng `baseUpdatedAt`.
- Owner: chủ repo. Thời điểm: chưa đặt.

File này: `docs/journals/261107-homepage-sections-and-collections.md`
