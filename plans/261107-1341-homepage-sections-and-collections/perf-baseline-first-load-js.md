# Số đo "trước": First Load JS của `/` và `/looks`

Đo ngày 2026-11-07, **trước** khi P4 đổi trang chủ. P7 đo lại cùng cách rồi so sánh.

## Kết quả

| Trang | Lần 1 | Lần 2 | Lần 3 | Trung vị (encoded KB) | Số script |
|---|---|---|---|---|---|
| `/` | 196,0 | 196,0 | 196,0 | **196,0** | 10 |
| `/looks` | 194,0 | 194,0 | 194,0 | **194,0** | 10 |

- Đơn vị: tổng `responseBodySize` (kích thước truyền qua mạng, đã nén) của mọi request loại `script`, đơn vị KiB (1024 byte).
- Ba lần đo ra đúng một số vì mỗi lần mở context trình duyệt mới (không cache) và các chunk giống hệt nhau.
- Chênh `/` so với `/looks` là 2 KB (chưa tìm nguyên nhân, không ảnh hưởng mốc so sánh).

## Cách đo (chạy lại được)

1. `pnpm --filter @under30ss/shared build`
2. `pnpm --filter @under30ss/web build`
3. API chạy ở `:4000` (trang `/`, `/looks` gọi API lúc render). Trong lần đo này API được bật bằng `pnpm --filter @under30ss/api dev`.
4. `cd apps/web && pnpm exec next start -p 3100` (cổng 3100 để khỏi đụng `next dev` ở 3000).
5. Từ gốc repo, trong Git Bash phải tắt đổi đường dẫn của MSYS, nếu không `/looks` bị đổi thành `C:/Program Files/Git/looks`:

   ```
   MSYS_NO_PATHCONV=1 node scripts/perf/measure-first-load-js.mjs --base http://localhost:3100 --paths / /looks --runs 3
   ```

   Thêm `--grep <chuỗi>` để liệt kê chunk chứa chuỗi đó (xem thư viện nào nằm ở chunk nào).
6. Tắt tiến trình `next start` ở cổng 3100.

## Ghi chú cho P4 / P7

- Mốc so sánh: giữ `/` không tăng quá mức chủ repo chấp nhận. Ngưỡng cụ thể do P7/chủ repo đặt, file này chỉ ghi số gốc.
- Mã nguồn lúc đo: commit `9631668` cộng thay đổi P1 (contract shared, token CSS, `PublicSmartLink`, `CollectionCard*`). Các thành phần mới chưa được trang nào import nên không làm đổi số này.
- `next start` báo `output: standalone` không tương thích với `next start` nhưng vẫn chạy được; số đo không bị ảnh hưởng. Chưa đo bằng `node .next/standalone/server.js` (chưa kiểm chứng số có giống hệt).
