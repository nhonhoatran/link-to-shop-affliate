---
status: completed
created: 2026-11-12
completed: 2026-11-12
mode: interactive
---

# Feed outfit kiểu bài Photo TikTok

Phản hồi khách (2026-11-12): "Phần bộ sưu tập trình bày giống hệt TikTok", kèm 2 ảnh chụp bài Photo TikTok:
ảnh tràn màn, nền tối, vuốt ngang qua nhiều ảnh (chấm tròn), chữ trắng đè góc dưới trái, cột nút bên phải.
Nối tiếp plan [261110-2143-tiktok-outfit-feed](../261110-2143-tiktok-outfit-feed/plan.md) (đã có lướt dọc từng outfit).

## Quyết định đã chốt (2026-11-12)

| # | Câu hỏi | Chốt |
|---|---|---|
| D1 | Ảnh vuốt ngang lấy từ đâu | Data có sẵn, không đổi schema: tấm 1 = lookbook, tấm 2 = ảnh người mẫu, tấm 3+ = từng món đồ kèm nút Mua |
| D2 | Cột nút bên phải | "Mua đồ" (mở danh sách món + link mua) và "Chia sẻ" (menu chia sẻ của máy, không có thì chép link). Không làm Tim/Bình luận |
| D3 | Phạm vi | Cả 3 chỗ dùng chung `OutfitFeed`: `/`, `/looks`, `/collections/[slug]` |

## Phases

| Phase | Nội dung | Trạng thái |
|---|---|---|
| [01](phase-01-photo-post-slide.md) | Khung bài Photo: dải ảnh ngang, chấm, chữ đè, cột nút, sheet Mua đồ, Chia sẻ | completed |
| [02](phase-02-tests-and-docs.md) | Unit test, e2e, chụp lại snapshot, docs | completed |

## Ngoài phạm vi

- Không thêm "ảnh phụ" cho outfit (phương án D1-B, cần sửa API + admin).
- Không đổi khung header/thông báo trên mobile (còn ~587px cho feed). Nếu khách muốn tràn hết màn như app thì làm vòng sau.
- Trang `/look/[slug]` và lưới `/collections` giữ nguyên.

## Thay đổi phạm vi (ghi lại 2026-11-12)

- E2E photo post tách sang `e2e/public-outfit-feed-photo-post.spec.ts`, không nhét vào `public-outfit-feed.spec.ts` (giữ file < 200 dòng).
- Thêm file ngoài danh sách phase 01: `feed-photo-sizes.ts`, `feed-photo-scroll.ts`, `feed-post-controls.module.css`, `feed-shop-sheet.module.css`. Lý do không ghi trong plan; suy ra là tách để giữ luật < 200 dòng/file.
- Docs: cập nhật thêm `docs/code-standards.md` (ngoài 3 file ghi trong phase 02).
- Snapshot: không chụp lại. Project `visual` chỉ phủ `/look`, không đổi, đã pass.
- Quá 10 tấm: hàng chấm đổi thành bộ đếm "i/n" (đã ghi trong phase 01).

## Câu hỏi còn mở

- Header + thanh thông báo chiếm ~257px trên mobile 390×844. Có ẩn khi đang ở feed cho giống TikTok không? Chờ phản hồi khách, chưa làm.
- Review Low L2, L3, L4, L5, L7 (`reports/code-reviewer-261112-0913-tiktok-photo-post-feed.md`) chưa xử lý. Cần quyết định làm hay bỏ.
- Lint phase 01 chưa có bằng chứng chạy (xem phase 01).

## Chốt thêm (2026-11-12, sau phase 01)

- Link chia sẻ: giữ theo host đang mở (`window.location.origin`), không ép `SITE_URL`.
- Cài đặt DB dev local cho e2e: giữ `homeMode=feed`, `looksPageSize=12` (giá trị cũ `sections`/`1` làm e2e feed và collections rớt).
