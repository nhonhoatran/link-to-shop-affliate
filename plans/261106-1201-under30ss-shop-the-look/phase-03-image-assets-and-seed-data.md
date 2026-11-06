# Phase 03 — Image assets & seed data

## Context Links
- Ảnh tham chiếu: `assets-source/lookbook-samples/outfit-dramatic-reference.png`, `outfit-mesh-84-reference.png` (941x1672, nền 253–255)
- [phase-01 seed-file-schema](./phase-01-foundation-and-contracts.md)

## Overview
- Priority: P1 · Status: Done — chờ P7 (seed thật; thay ảnh người mẫu sạch từ bên Kim) · Effort: 6h · Wave 2 (song song P2, P4) · blockedBy: P1
- Cắt từng món 2 ảnh mẫu, tách nền trong suốt, crop người mẫu tạm, viết `seed/sample-outfits.json`. **Không** đụng DB/S3 (P2 viết seed script, P7 chạy).

## File Ownership
- `scripts/assets/**`, `assets-source/cut/**`, `seed/**`
- Chỉ đọc: `assets-source/lookbook-samples/**`, `packages/shared/src/seed-file-schema.ts`

## Key Insights
- Đường chỉ trắng in chết lên người mẫu → crop người mẫu là tạm, chờ ảnh gốc sạch (thay qua admin).
- Mũi tên nằm sát vài món (túi, dây chuyền, kính, móc khoá) → crop box tránh, soát bằng mắt.
- Món mảnh (dây chuyền, móc khoá) rembg dễ ăn chi tiết → xấu thì giữ nền trắng.
- Ảnh món ~250–330px đủ hiển thị ~150px.
- Script Python chạy với `python -I`; rembg chạy local (không gửi ảnh ra ngoài).

## Requirements
- Outfit `dramatic` (8 món): áo thun in chữ, quần short jean rách, giày sneaker trắng xám, túi đeo chéo, dây chuyền bạc, móc khoá, thắt lưng da nâu, khăn bandana.
- Outfit `mesh-84` (9 món): áo mesh thể thao, áo thun trắng, quần short jean rộng, giày sneaker đen, kính mát đen, dây chuyền bạc, thắt lưng da, móc khoá, tất trắng dài.
- Text (tên, subtitle, mô tả) chép y ảnh mẫu; side + order theo ảnh mẫu.
- Anchor = đầu mũi tên trên người mẫu, quy về % theo khung crop người mẫu.
- `affiliateUrl: ""`, `status: "draft"`, `featured`: dramatic = true.
- JSON phải pass `seed-file-schema` (viết script check nhỏ chạy bằng `tsx` hoặc node, nằm trong `scripts/assets/`).

## Architecture
```
assets-source/lookbook-samples/*.png
  → scripts/assets/crop-boxes-dramatic.json, crop-boxes-mesh-84.json (box x,y,w,h từng món + model)
  → scripts/assets/crop-lookbook-items.py      (Pillow crop + trim nền ≥245 + padding)
  → scripts/assets/remove-item-backgrounds.py  (rembg → PNG alpha; danh sách giữ nền trắng)
  → scripts/assets/build-contact-sheet.py      (ghép lưới trên nền xám để soát viền)
  → assets-source/cut/{outfit}/{item-slug}.png, model.png
  → seed/sample-outfits.json (đường dẫn ảnh tương đối repo root)
  → scripts/assets/validate-seed-file.ts
```

## Implementation Steps
1. Đo crop box từng món + khung người mẫu; ghi JSON.
2. Crop + trim; contact sheet soát dính chữ/mũi tên.
3. `pip install rembg` (onnxruntime có sẵn), tách nền; contact sheet soát viền; món xấu → giữ nền trắng.
4. Đo anchor từng món (toạ độ đầu mũi tên − gốc khung người mẫu) ÷ kích thước khung × 100, làm tròn 1 số lẻ.
5. Viết `seed/sample-outfits.json`; chạy validate.
6. Lưu contact sheet vào `plans/261106-1201-under30ss-shop-the-look/visuals/` để review.

## Todo List
- [x] Crop boxes 2 outfit
- [x] Script crop + trim
- [x] Tách nền + soát viền
- [x] Crop người mẫu tạm
- [x] Anchor + text → seed JSON
- [x] Validate seed JSON pass

## Success Criteria
- 17 ảnh món sạch (không dính chữ/mũi tên) + 2 ảnh người mẫu.
- `seed/sample-outfits.json` pass schema; contact sheet đã review.

## Risk Assessment
- rembg tải model ~170MB lần đầu; không tải được → giữ nền trắng toàn bộ, báo lead (hover dùng box-shadow nhẹ).
- Anchor đo tay lệch → chỉnh bằng editor admin sau.

## Security Considerations
- Ảnh thuộc bên Kim; xử lý local, không upload dịch vụ ngoài.

## Next Steps
- P7 chạy `pnpm seed:samples`. Thay ảnh người mẫu khi có bản sạch.

## Ghi chú đồng bộ 2026-11-06
Đối chiếu với `seed/sample-outfits.json`, `assets-source/cut/**`, `scripts/assets/**` và phase-03 report.
- Đã có: 17 ảnh món PNG + 2 ảnh người mẫu (`assets-source/cut/{dramatic,mesh-84}/`); `seed/sample-outfits.json` (dramatic 8 món featured, mesh-84 9 món, cả hai `draft`, `affiliateUrl: ""`). Validator `scripts/assets/validate-seed-file.ts` exit 0 (tester, 2026-11-06).
- Đường dẫn ảnh trong seed tương đối với thư mục `seed/` (ví dụ `../assets-source/cut/dramatic/model.png`), không phải repo root như spec ghi.
- Món giữ nền trắng (rembg làm hỏng): `mesh-84/day-chuyen-bac`, `mesh-84/moc-khoa-phu-kien`. Ảnh người mẫu còn nền trắng và vết chỉ vẽ sẵn (limitation đã biết).
- Anchor đặt gần đầu mũi tên, không trùng đúng; cần chỉnh trong admin editor.
- Thư mục `assets-source/cut/**/raw/` là file trung gian, `.gitignore` chưa loại trừ. Chốt giữ hay ignore trước khi commit (việc P7).
- Thêm script `scripts/assets/build-seed-file.py` (spec không liệt kê).
- Chưa làm: chạy seed thật (P7); thay ảnh người mẫu sạch (chờ bên Kim); soát visual trên trang thật.
