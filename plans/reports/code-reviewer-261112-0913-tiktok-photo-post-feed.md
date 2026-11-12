# Code review — phase 01 bài Photo kiểu TikTok (261112)

Kết quả: không Critical, 1 High, 2 Medium, 11 Low. Đã sửa ngay sau review.

| # | Mức | Vấn đề | Xử lý |
|---|---|---|---|
| H1 | High | Phím mũi tên trong sheet Mua đồ vẫn cuộn feed phía sau (`<dialog>` nằm trong feed) | Sửa: `FeedStepButtons` bỏ qua phím khi target nằm trong `dialog` |
| M1 | Medium | Chấm tròn chỉ ~14px, dưới 24px (WCAG 2.5.8) | Sửa: token `--feed-dot-hit-size: 24px` |
| M2 | Medium | Outfit nhiều món: hàng chấm tràn, đè cột nút | Sửa: quá 10 tấm thì đổi sang bộ đếm "i/n" |
| L1 | Low | `navigator.share` lỗi khác Abort → báo lỗi luôn | Sửa: thử chép link trước khi báo lỗi |
| L6 | Low | Link mua hỏng vẫn Tab tới được | Sửa: `tabIndex: -1` trong `affiliateLinkProps` (cập nhật test) |
| L8 | Low | `sizes="56px"` viết thẳng | Sửa: `FEED_SHEET_THUMB_SIZES` trong `feed-photo-sizes.ts` |
| L9 | Low | ≥1024px khối chữ vẫn chừa chỗ cho cột nút đã ra ngoài | Sửa: reset padding phải |
| L10 | Low | `next-env.d.ts` bị dev server sửa | Đã revert |
| L2, L3, L4, L5, L7 | Low | Đơn vị token thời gian; bấm nhanh có thể nuốt 1 lần; focus rơi khi mũi tên disabled; ngữ nghĩa carousel; kéo chọn chữ ra nền đóng sheet | Để lại, chưa đáng sửa vòng này |
| L11 | Low | Link chia sẻ dùng `window.location.origin` thay `SITE_URL` | Lệch plan có chủ ý, ghi vào phase-01 |

Sau sửa: typecheck sạch, eslint sạch, vitest web 694/694.

## Câu hỏi còn mở
- Link chia sẻ có cần luôn là host chính (`SITE_URL`) kể cả khi khách vào qua tunnel/host preview không?
