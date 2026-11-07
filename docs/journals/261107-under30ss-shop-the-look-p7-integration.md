# P7: ráp hệ thống, e2e, prod compose (2026-11-06 → 2026-11-07)

## Đã làm
- Git local trên `main`, account đã xác nhận trước khi init, chưa push. `.gitattributes` ép LF để script/Caddyfile không hỏng trong container Linux. Thư mục công cụ AI để ngoài git.
- Compose chạy trong WSL2, seed thật, smoke test qua Caddy.
- E2E Playwright 17 test, Lighthouse SEO/a11y 100, review cuối 8.5/10 rồi sửa hết Medium.
- Compose prod dạng override (`!reset` bỏ port), Mongo auth, backup + restore thử trên stack tách riêng.
- Docs: kiến trúc, quy chuẩn, deploy, changelog, roadmap.

## Lỗi chỉ lộ ra khi chạy thật
- Caddy: `respond` chạy sau `handle`, nên chặn `/api/health` bằng `respond` không có tác dụng. Phải dùng `handle` riêng.
- Seed: hợp đồng P2 (ảnh nằm trong `seed/`) lệch với P3 (ảnh ở `assets-source/`). Thêm `imageRoot`, vẫn giữ chặn traversal.
- Hotspot lệch tới ~470px: `.root` dùng `align-items: stretch` nên `<figure>` cao theo hàng grid, trong khi hotspot đặt theo % của figure. Agent đầu tiên đổ cho dữ liệu seed. Bắt được nhờ nhìn thấy độ lệch tăng đều theo chiều dọc. Test cũ chỉ kiểm thuộc tính, không đo tọa độ → thêm `e2e/public-hotspot-alignment.spec.ts`, xác nhận test fail trên bản cũ trước khi sửa.

## Quyết định
- Khoá admin từ xa qua limiter theo email: dùng cookie thiết bị (mẫu OWASP) thay vì chỉ ghi log.
- Mobile < 640px: ẩn đường chỉ, hiện chấm. Ảnh mẫu không có bản mobile, đường chỉ trên người mẫu ~130px bị rối.
- Ảnh người mẫu tạm: tẩy đường chỉ bằng rembg + inpaint theo nét vẽ tay (`scripts/assets/clean-model-lines.py`) để test, không chờ ảnh sạch.

## Bài học
- Test giao diện nên đo vị trí thật, không chỉ kiểm attribute.
- Báo cáo "lệch do dữ liệu" của agent cần kiểm lại khi độ lệch có quy luật.

## Còn lại
VPS + HTTPS thật, ảnh sạch + link affiliate, các mục hoãn trong `docs/development-roadmap.md`.
