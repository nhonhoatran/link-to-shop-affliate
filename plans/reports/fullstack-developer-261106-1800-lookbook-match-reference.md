# Báo cáo: lookbook công khai khớp ảnh mẫu

## Thay đổi (chỉ trong file được giao)
- `apps/web/src/components/lookbook/compute-connector-paths.ts`: quadratic -> cubic Bézier. Điểm điều khiển 1 nằm ngang với điểm đầu (sx + dx*r, sy); điểm điều khiển 2 = (ex - dx*r, ey - dy*r). Đường rời thẻ theo phương ngang, cong xuống khi điểm neo thấp hơn, cong lên khi cao hơn. Đầu mũi tên nằm đúng điểm neo.
- `lookbook.module.css`: hotspot trong suốt khi nghỉ (vùng bấm 24px, `:focus-visible` giữ nguyên từ globals.css); khi `data-active` hiện vòng tròn nhỏ 12px (nền trắng, viền tối). Subtitle `font-style: italic`. Thêm halo sáng quanh SVG để thread/mũi tên đọc được trên vùng tối (như ảnh mẫu).
- `design-tokens.css`: `--lookbook-curve-ratio` 0.35 -> 0.45 (chọn bằng so ảnh); `--lookbook-arrow-size` 7 -> 10px; token mới `--lookbook-hotspot-size`, `--lookbook-hotspot-ring-size`, `--lookbook-hotspot-ring-bg`, `--lookbook-connector-halo`; cột 29/42/29 -> 31/44/25fr; cỡ tiêu đề clamp(11px, 1.9vw, 18px) (font Be Vietnam Pro rộng hơn font mẫu, nên không giữ 2.1%/20px). Tiêu đề "QUẦN SHORT JEAN RỘNG" nay một dòng ở 1440.
- `apps/web/test/lookbook/compute-connector-paths.test.ts`: viết lại cho toán cubic (xuống/lên, ratio 0, handle đầu giữ y). Không xoá test.
- e2e: không cần đổi, giữ nguyên `data-lookbook`, `data-active-id`, `data-active`, `path[data-item-id]`.

## Mobile (dưới 640px): chọn ẩn thread, hiện pin
Thread trên model ~130px rộng cắt chéo, chồng nhau (xem ảnh trước đó trong tester-261106-1737). Chọn: ẩn SVG thread, hiện vòng tròn nhỏ cố định trên hotspot để vẫn thấy điểm trên người mẫu và bấm được (24px). Lý do: thread nhạt hơn vẫn chồng nhau vì các điểm neo dồn cụm; pin đọc rõ hơn và danh sách món bên cạnh vẫn là đường link chính. Mô tả vẫn ẩn dưới 640px. 390 và 320: không tràn ngang, chữ >= 11px (e2e xác nhận).

## Lệnh và kết quả
- `pnpm --filter @under30ss/web test`: 28 file, 166 test pass.
- `pnpm lint`: 0 lỗi, 1 warning có sẵn (`apps/api/test/outfits-admin-crud.test.ts:29`).
- `pnpm typecheck`: pass (một lần chạy đầu api báo fail trong lúc chạy song song, chạy lại pass; chưa rõ nguyên nhân, không liên quan file đã sửa).
- Rebuild web (docker compose up -d --build web), `pnpm e2e`: 13/13 pass, hai lần liên tiếp (8.1s, 7.5s).

## Ảnh (plans/261106-1201-under30ss-shop-the-look/visuals/)
- Trước: `e2e-compare-mesh-84-1440-vs-ref.png`, `e2e-compare-dramatic-1440-vs-ref.png`.
- Sau: `e2e-compare-mesh-84-1440-vs-ref-after.png`, `e2e-compare-dramatic-1440-vs-ref-after.png`, `e2e-mesh-84-390-after.png`, `e2e-dramatic-390-after.png`.
- Ảnh e2e-*-1440/390.png gốc sẽ được ghi đè lần `pnpm e2e` kế tiếp (đã ghi đè trong hai lần chạy vừa rồi bằng bản mới).

## Còn khác ảnh mẫu
- Một số điểm neo nằm ngoài người mẫu (giày mesh-84, tất, giày dramatic): dữ liệu seed, ngoài phạm vi.
- Người mẫu nhỏ hơn mẫu: ảnh model hiện là crop tạm có lề trắng, không chỉnh được bằng token.
- Cột phải vẫn xuống dòng nhiều hơn mẫu (mô tả 3-4 dòng so với 3); ảnh mẫu dùng font hẹp hơn.
- Thread vẫn mảnh hơn một chút so với mẫu; đường của mẫu có dáng tay vẽ hơn (đoạn cuối gập cong rõ).
- Chưa chụp riêng ảnh hover trạng thái vòng tròn (đã chạy e2e hover pass).

**Status:** DONE_WITH_CONCERNS
**Summary:** Mũi tên hiện rõ ở điểm neo, hotspot vô hình khi nghỉ, thread cubic cong lên/xuống, subtitle italic, tỉ lệ cột/chữ chỉnh qua token, mobile ẩn thread và hiện pin. Test, lint, typecheck, e2e (2 lần) đều pass.
**Concerns/Blockers:** Neo lệch người mẫu và crop model là dữ liệu tạm nên khác mẫu ở một số món; pnpm typecheck fail một lần thoáng qua ở api rồi pass.
