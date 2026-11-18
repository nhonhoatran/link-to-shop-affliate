# Smoke HTTP nhập poster đã ghi

Ngày kiểm: 2026-11-18.

Lệnh chạy:

```text
pnpm --filter @under30ss/api exec vitest run --config vitest.poster-smoke.config.ts --pool=threads --maxWorkers=1
```

Kết quả: `Test Files 1 passed`, `Tests 1 passed`, exit code `0`. Vitest có cảnh báo hiện hữu về ESM trong file cấu hình CommonJS; cảnh báo không làm bài kiểm thử thất bại.

Bài kiểm thử dùng `apps/api/vitest.poster-smoke.config.ts` và `apps/api/test/smoke/poster-import-http-smoke.ts`. Đây là smoke opt-in, không nằm trong bộ test mặc định. Hai ảnh gốc được đối chiếu SHA-256 với hai báo cáo Codex đã ghi:

- `assets-source/lookbook-samples/outfit-mesh-84-reference.png`: phân tích `needs_review`, 9 món.
- `assets-source/lookbook-samples/outfit-dramatic-reference.png`: phân tích `needs_review`, 8 món.

Không gọi Codex hoặc provider mới. Phân tích đã ghi được nạp qua schema, giữ nguyên `reviewReasons`, rồi chuyển thành hai bản nháp trong `DesktopRuntime`. Smoke xác nhận chưa duyệt thì không được sync, sau đó duyệt rõ ràng cả hai bản nháp. Các request upload và commit đi qua Express HTTP loopback đang lắng nghe thật, với MongoMemoryServer và bộ lưu trữ S3 recorder cô lập của test. Kết quả có 2 outfit draft, 2 collection, 2 operation hoàn tất và 19 media upload, đồng thời endpoint quản trị trả đúng 9 và 8 item.

Smoke gọi lại cùng operation ID và payload sau khi đã hoàn tất. Receipt trả lại cùng outfit ID cho từng ảnh; tổng số outfit, collection và operation vẫn là 2, nên không tạo bản ghi trùng.

Scratch runtime dùng dưới `apps/desktop/dist/test-tmp-poster-import` và được dọn trong `afterAll`. Không đọc `.env`, không ghi token vào artifact.
