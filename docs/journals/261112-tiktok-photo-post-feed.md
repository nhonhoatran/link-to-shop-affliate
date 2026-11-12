# Feed outfit kiểu Photo TikTok: lỗi bàn phím xuyên dialog, và e2e đụng rate limit login

**Date**: 2026-11-12
**Severity**: Medium
**Component**: apps/web feed (`OutfitFeed`, dải ảnh, sheet "Mua đồ"), e2e suite, dev settings
**Status**: Resolved (code + test). Còn một mục về giá trị settings dev đã chốt, theo dõi thêm.

**Plan:** `plans/261112-0854-tiktok-photo-post-feed/plan.md`
**Review:** `plans/reports/code-reviewer-261112-0913-tiktok-photo-post-feed.md`
**Test:** `plans/reports/tester-261112-0927-tiktok-photo-post-feed.md`

## What Happened

Khách phản hồi feed outfit "giống hệt TikTok". Làm bài Photo: ảnh tràn màn, vuốt ngang qua nhiều ảnh, chấm tròn, chữ đè góc dưới, cột nút bên phải ("Mua đồ", "Chia sẻ"). Chỉ dùng data có sẵn, không đổi schema: ảnh 1 là lookbook, ảnh 2 là người mẫu, ảnh 3+ là từng món kèm nút mua. Dải ảnh render server-side bằng scroll-snap; JS chỉ lo chấm, mũi tên, sheet và chia sẻ. Không có JS vẫn xem được qua `@media (scripting: none)`.

## Technical Details

- **H1 (High, review):** `<dialog>` của sheet "Mua đồ" nằm trong DOM của feed. Handler phím mũi tên toàn cục vẫn cuộn feed phía sau khi sheet đang mở. Sửa: `FeedStepButtons` bỏ qua phím khi target nằm trong `dialog`.
- **M1:** chấm tròn chỉ ~14 px, dưới 24 px (WCAG 2.5.8). Sửa: token `--feed-dot-hit-size: 24px`.
- **M2:** outfit nhiều món làm hàng chấm tràn và đè cột nút. Sửa: quá 10 tấm thì đổi sang bộ đếm `i/n`.
- Sheet ban đầu tự viết `showModal()`. docs-manager chỉ ra quy ước repo đã có `useModalDialog` (có trả focus). Chuyển sang hook dùng chung.
- Số liệu lấy từ báo cáo tester: vitest web 730/730 (baseline 694, +36 test mới), typecheck sạch. E2E cuối 132/132 do chủ repo báo lại; em chưa tự chạy lại trong lượt viết này.

## What We Tried

- Playwright MCP không bao giờ chạy animation `scrollTo({behavior: 'smooth'})` đến đích, kể cả feed dọc đã có sẵn từ trước. Đây là đặc tính môi trường, không phải bug sản phẩm. Stub `getBoundingClientRect` trong test phải trừ `scrollTop`, vì rect thật thay đổi khi cuộn.
- E2E full run 2: 77 pass, 10 fail (429 và một teardown từ chối chạy). Run 3 và lần nền cuối cũng dính 429 ngay đầu. Mỗi lần thử trong cửa sổ bị khóa lại kéo dài thêm thời gian khóa.
- Run 1 (sau khi tester đổi `looksPageSize=3`): 89 pass, 1 fail ở `content-collections`. Nguyên nhân là chính thay đổi settings, không phải code. Đã sửa bằng size 12.

## Root Cause Analysis

- **Bàn phím:** handler gắn ở `document`, không biết sheet đang là một modal. Một `<dialog>` đặt trong cây DOM của feed thì sự kiện nổi bọt lên đúng handler đó.
- **Rate limit:** admin e2e login bị giới hạn 20 lần / 15 phút. Tester gom quá nhiều lượt: login để đổi settings + vài lần chạy e2e liên tiếp, nên hết ngân sách.
- **Settings:** tester đổi `homeMode` từ `sections` sang `feed` và `looksPageSize` từ `1` sang `12` qua admin API mà chưa hỏi trước. Thiết lập dev dùng chung, nên đây là việc phải hỏi trước.

## Lessons Learned

- Mọi handler phím toàn cục phải bỏ qua khi target nằm trong `dialog`, `input`, hoặc `[contenteditable]`. Test phải có case này.
- Lập kế hoạch e2e theo ngân sách login. Gom các thay đổi settings lại, đợi hết cửa sổ 15 phút rồi mới chạy full suite một lần.
- Trước khi đổi thiết lập dev dùng chung, xin xác nhận. Ghi giá trị gốc vào báo cáo ngay khi đổi.
- Chấm/nút nhỏ phải đo hit area 24 px ngay từ đầu, đừng để review bắt.

## Next Steps

- Chủ repo đã đồng ý giữ `homeMode=feed` và `looksPageSize=12` ở dev local. Ghi lại vào `docs/` để người sau không đổi ngược và làm vỡ e2e `/` và `content-collections`. Owner: chủ repo. Trước khi cắt release.
- Chốt có ẩn header/thanh thông báo khi ở feed trên mobile hay không (đang chiếm ~257 px của màn 390×844). Chưa làm vòng này. Owner: chủ repo, chưa đặt lịch.
- Nếu cần full e2e mới, chạy một lần duy nhất sau khi kiểm tra không có login nào trong 15 phút gần nhất.
