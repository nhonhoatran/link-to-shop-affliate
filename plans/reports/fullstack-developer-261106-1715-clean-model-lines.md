# Báo cáo: làm sạch ảnh model (bản test)

## Kết quả
- Backup gốc: `assets-source/cut/{dramatic,mesh-84}/raw/model-with-lines.png` (raw/ đã gitignore).
- Output ghi đè: `assets-source/cut/dramatic/model.png`, `assets-source/cut/mesh-84/model.png`.
- Kích thước (Pillow) giữ nguyên: dramatic 415x1310 -> 415x1310; mesh-84 436x1338 -> 436x1338. Anchors không đổi.
- Nền: pixel mẫu (góc, mép) = #ffffff. Người tách bằng rembg u2net + opening 3px + lấy thành phần liên thông lớn nhất, alpha mềm (không halo xám).
- Mảnh item lân cận, chữ bên trái, mũi tên ngoài người: hết (nằm ngoài mask người).
- Before/after: `plans/261106-1201-under30ss-shop-the-look/visuals/model-clean-before-after-{dramatic,mesh-84}.png`.

## File
- `scripts/assets/clean-model-lines.py` (101 dòng). Chạy lại: `python -I scripts/assets/clean-model-lines.py dramatic|mesh-84` (đọc raw/model-with-lines.png, ghi model.png).
- `scripts/assets/model-line-traces-dramatic.json`, `model-line-traces-mesh-84.json`: polyline vẽ tay (toạ độ px ảnh gốc), mỗi line có `r` (nửa bề rộng hành lang), `thr`, `med`, `direct`, `fill`.
- Cơ chế: chỉ pixel nằm trong hành lang VÀ lệch khỏi median cục bộ mới bị xoá (không làm mờ chi tiết ngoài hành lang). Fill: Telea (mặc định) hoặc `patch` (copy texture lân cận, dùng cho lưới mesh để khỏi bị vệt xám).
- Cài thêm `opencv-python-headless` (pip). Không chạm file nào khác; không seed/Docker/git.

## Chi tiết giữ nguyên (kiểm bằng mắt)
Dây chuyền, móc khoá + dây chuyền mesh-84, dây tai nghe (đoạn thật), dây giày, thắt lưng, đồng hồ, dây túi, chữ DRAMATIC Liberty, số 84.

## Còn chưa hoàn hảo
- dramatic, đầu mũi tên dưới logo huy hiệu (~x265-285,y310-325): còn vệt xám nhạt nhỏ.
- dramatic, đường đi qua lỗ rách gối phải (~x280-370,y870-930): vẫn còn vệt sáng mờ do đường đè lên sợi chỉ; thấy rõ khi zoom, ở kích thước thường khá nhẹ.
- dramatic, vài chỗ mép tất/thắt lưng hơi nhoè nhẹ (đường qua tất trái/phải, ~1px).
- mesh-84, vệt nhoè nhẹ ở ~x100-165,y490-505 (đường có đầu vòng) và dưới bụng ~x100-190,y520-585 (đường dài trắng). Đoạn dây tai nghe thật trên đó (y<515) giữ lại; ranh giới "dây tai nghe vs đường mũi tên" ở ~(196,520) là phán đoán thủ công.
- Bóng xám dưới giày mesh-84 (y~1300-1320) do rembg coi là người, chưa chuyển trắng.
- Chưa có code-reviewer/tester chạy; chưa unit test (script ảnh một lần, kiểm bằng mắt + kiểm kích thước).

**Status:** DONE_WITH_CONCERNS
**Summary:** Hai model.png đã sạch nền trắng, kích thước y hệt gốc, các đường mũi tên bị xoá bằng inpaint theo polyline tay; script chạy lại được.
**Concerns/Blockers:** Còn vài vệt nhoè nhỏ (xem mục "Còn chưa hoàn hảo"), chấp nhận được cho ảnh test, nên thay bằng ảnh sạch thật khi có.
