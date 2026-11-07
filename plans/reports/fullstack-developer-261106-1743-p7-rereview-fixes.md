# Sửa các phát hiện re-review P7 (API + Caddy)

Ngày 2026-11-06. Nguồn: `plans/reports/code-reviewer-261106-1741-p7-rereview.md`. Không commit, không đụng container đang chạy.

## Kết quả theo phát hiện

| Mã | Đã đổi | Test phủ |
|---|---|---|
| M1 | Cookie thiết bị `u30.dev`: HMAC-SHA256 (khoá `SESSION_SECRET`, tiền tố `device-cookie:` + email đã chuẩn hoá), httpOnly, sameSite lax, Secure theo `SESSION_COOKIE_SECURE`, đặt sau khi đăng nhập thành công. Limiter per-email (mọi IP) bỏ qua khi có cookie hợp lệ cho đúng email; limiter per-IP và per-IP|email vẫn áp dụng. So sánh `timingSafeEqual`. Limiter per-email chạm trần thì `console.warn` (email che dạng `a***@domain`). Code: `src/lib/device-cookie.ts`, `src/middleware/login-rate-limit-middleware.ts`, `src/routes/auth-routes.ts` | `auth-device-cookie.test.ts`: cờ cookie; không cấp khi login sai; chủ cookie đăng nhập được khi bucket per-email đã cạn; kẻ tấn công không cookie vẫn 429; cookie giả/sai chữ ký/thêm ký tự bị bỏ qua; cookie của email khác bị bỏ qua; chủ cookie vẫn chịu limiter per-IP|email |
| M2 | `ensureOutfitIndexes()` (`createIndexes` cho OutfitModel) chạy cuối `connectMongo`; lỗi thì ném `Failed to build outfit indexes (check for duplicate featured outfits): ...` (kèm `cause`), `server.ts` đã log `[api] failed to start` và `exit(1)`. Featured query thêm `.sort({ updatedAt: -1 })` | `outfits-featured-index.test.ts`: build index rồi từ chối featured thứ hai; trùng featured thì ném lỗi rõ; có trùng thì trả bản mới nhất |
| L1 | `rewrite * /{$S3_BUCKET}{path}?`. Chỉ dùng `{path}` thì query vẫn được giữ (đã kiểm bằng Caddy thật), nên cần dấu `?` cuối để bỏ query; path đã mã hoá (`%3F`, `%23`, `%20`) vẫn giữ nguyên escape. Thêm `X-Content-Type-Options: nosniff` trong `handle_path /media/*` | Kiểm bằng Caddy 2.11.9 tạm (không phải stack chạy) với 4 URL; không có test tự động |
| L7 | `header @notRead Allow "GET, HEAD"` trước `respond @notRead 405` | `caddy validate` pass; chưa kiểm header bằng request thật |
| L2 | Limiter per-IP|email và per-email có `skip` khi email rỗng/không phải chuỗi; limiter per-IP vẫn đếm | `auth-rate-limit.test.ts`: 4 request thiếu/sai kiểu email từ 4 IP, ngưỡng 1, đều 400 |
| L3 | `requestWasSuccessful`: `<400`, `429` hoặc `>=500` không tính là thất bại (cho limiter 2 và 3) | `login-rate-limit-counting.test.ts` (503 x5 rồi 401,401,429; 200 không tính); `auth-device-cookie.test.ts` (429 do limiter khác chặn không làm đầy bucket per-IP|email) |
| L4 | API export `FILE_TOO_LARGE_MESSAGE` = "Tệp vượt quá dung lượng cho phép" (`error-handler-middleware.ts`); Caddy dùng đúng câu đó, có comment trỏ về hằng số. API chưa có hằng số dùng chung nên không đụng `packages/shared` | `media-upload.test.ts` hiện có (code `PAYLOAD_TOO_LARGE`); câu của Caddy chỉ so thủ công |
| L5 | `warmUpDummyHash()` gọi trong `server.ts` sau khi kết nối Mongo; lỗi làm startup thất bại. Giữ cơ chế lấy hash có retry khi bị reject | Test `password-service.test.ts` hiện có vẫn pass; không thêm test thời gian |
| L6 | `readSeedImage` dùng `realpath` cho cả file và root; `isInside` chỉ chặn `rel === '..'`, `rel` bắt đầu `..` + dấu phân cách, hoặc đường tuyệt đối | `seed.test.ts`: tên `..dotted.png` được chấp nhận; symlink trỏ ra ngoài bị từ chối (bỏ qua khi Windows thiếu quyền symlink, `EPERM`); các test escape cũ vẫn pass |
| L9 | Test chuẩn hoá key | `auth-rate-limit.test.ts`: biến thể hoa/thường/khoảng trắng dùng chung bucket IP|email và bucket per-email giữa nhiều IP |
| Pin Caddy | `infra/docker-compose.yml`: `caddy:2` đổi thành `caddy:2.11.9` (`CADDY_VERSION=v2.11.9` đọc từ ảnh đang có; tag tồn tại trên Docker Hub, pull được; `caddy version` của hai tag giống nhau, cùng thời điểm tạo ảnh). `docker-compose.prod.yml` không có tag nên không sửa | `caddy validate` với `caddy:2.11.9` ra `Valid configuration` |
| Lint | Xoá `publicApi` và import `supertest` thừa trong `outfits-admin-crud.test.ts` | `pnpm lint` 0 cảnh báo |
| L8 | Hoãn theo quyết định: UI bên thua khi hai admin đặt featured đồng thời vẫn hiện trạng thái cũ tới khi tải lại | n/a |

## Biến môi trường mới

- `LOGIN_DEVICE_COOKIE_MAX_AGE_DAYS` (mặc định 90): đã thêm vào `.env.example`, `apps/api/.env.example`, `infra/docker-compose.yml` (service api). Compose prod kế thừa từ file gốc nên không cần thêm. Đọc trong `runtime-defaults.ts`. Không có biến bắt buộc mới (khoá ký dùng `SESSION_SECRET`).

## Thay đổi ngoài danh sách

- `test/auth.test.ts`: test "rejects a session cookie captured before logout" lấy `set-cookie[0]` làm cookie phiên; nay cookie thiết bị đứng trước, nên đổi sang tìm cookie `u30.sid` theo tên.
- `createLoginRateLimit` nhận thêm tham số `env` (chỉ cần `SESSION_SECRET`); `createAuthRoutes` nhận `env`.

## Kiểm chứng

- `pnpm typecheck`: pass. `pnpm lint`: 0 lỗi, 0 cảnh báo.
- `pnpm --filter @under30ss/api test`: 14 file, 83 test pass, chạy 2 lần liên tiếp đều pass (trước đó 66 test). Không đụng `packages/shared` nên không chạy test shared.
- `caddy validate` (caddy:2.11.9, `-e S3_BUCKET=under30ss`): Valid configuration.
- Chưa kiểm: header `Allow` / `nosniff` qua request thật vào stack (cần rebuild; lead làm). Sau khi rebuild nên thử `curl -I localhost:8080/media/...?response-content-type=text/html` và `curl -X POST -i .../media/x`. Container tạm dùng để thử Caddy đã được xoá.
- Tác động khi triển khai: sau khi rebuild, admin phải đăng nhập lại một lần mới có cookie thiết bị; trước đó vẫn chịu limiter per-email như cũ.

**Status:** DONE
**Summary:** Đã sửa M1, M2, L1-L7, L9, pin `caddy:2.11.9`, dọn cảnh báo lint; L8 hoãn. Typecheck, lint, test API (83) pass hai lần liên tiếp, Caddyfile validate pass.
**Concerns/Blockers:** Header Caddy mới (`Allow`, `nosniff`, bỏ query ở `/media`) chưa kiểm qua stack thật vì chưa được rebuild. Test symlink tự bỏ qua trên máy không có quyền tạo symlink (chưa xác nhận lần chạy này có chạy thật hay thoát sớm).
