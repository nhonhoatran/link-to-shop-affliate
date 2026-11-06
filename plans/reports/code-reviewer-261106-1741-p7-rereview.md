# Re-review fix round 2 + đầu P7 (fd873f5, 36e53c3)

Ngày 2026-11-06. Review chỉ đọc, không sửa code. Bỏ qua `e2e/**`, `playwright.config.ts`, `infra/docker-compose.prod.yml`, `infra/backup/**`, các file test đang được tách (agent khác đang sửa). Working tree lúc review có thay đổi chưa commit ở `apps/web/src/components/lookbook/compute-connector-paths.ts`, `lookbook.module.css`, `design-tokens.css` (của agent khác), không nằm trong phạm vi review.

**Điểm: 8.5/10.** 0 Critical, 0 High, 2 Medium, 9 Low.

## Phạm vi
- API: `login-rate-limit-middleware.ts`, `runtime-defaults.ts`, `lib/semaphore.ts`, `password-service.ts`, `outfit-service.ts`, `admin-outfit-routes.ts`, `settings-service.ts`, `revalidate-web-service.ts`, `seed-service.ts`, `scripts/seed-samples.ts`, `create-app.ts`, `auth-routes.ts`, `admin-user-service.ts`.
- Shared: `outfit-schemas.ts` (`outfitUpdateSchema`), `auth-schemas.ts`, `revalidate-contract.ts`, `settings-schemas.ts`.
- Web: `app/api/revalidate/route.ts`, `lookbook-interactions.tsx`, `observe-lookbook-changes.ts`, `save-status-text.tsx`, `use-outfit-actions.ts`, `editor-state.ts`, `outfit-editor-toolbar.tsx`, `settings-form.tsx`, `admin-form-field.tsx`, `media-dropzone.tsx`.
- Infra: `infra/caddy/Caddyfile`, `infra/docker-compose.yml` (service caddy, api, web), `infra/rustfs-init/*`.

## Kiểm chứng đã chạy
| Lệnh / thao tác | Kết quả |
|---|---|
| `pnpm typecheck` | pass (shared, api, web) |
| `pnpm lint` | 0 error, 1 warning: `apps/api/test/outfits-admin-crud.test.ts:29` `publicApi` không dùng (file test đang được tách) |
| `pnpm --filter @under30ss/api test` | 11 file / 66 test pass (66 = 65 + test seed mới ở 36e53c3) |
| `pnpm --filter @under30ss/shared test` | 2 file / 32 pass |
| `pnpm --filter @under30ss/web test` | 164 pass |
| curl `localhost:8080` + `node fetch` chạy trong container `under30ss-api-1` gọi `http://caddy:80` | xem bảng kết quả bên dưới |
| `mongosh` trong `under30ss-mongo-1` | index `featured_1` unique, partial `{featured:true}` có trên DB dev; đang có 1 outfit featured |

Không có lần login sai mật khẩu nào. Kiểm rate limit dùng 4 request body `{}` (400 validation) gửi từ container api (IP riêng, không chung bucket với e2e).

### Kết quả runtime (đã kiểm chứng)
- `/api/health`, `/api/health/`, `/API/HEALTH`, `/api/Health`, `/api//health`, `/api/%68ealth`, `/api/./health`, `/api/health?x=1`, `/api/x/../health` → 404 do Caddy trả (`Server: Caddy`, body rỗng, không có header helmet). `/api/nope` → 404 JSON từ API. Thứ tự `handle /api/health*` đúng.
- 413: body 22 MiB (Content-Length) tới `/api/admin/media` → 413, `Content-Type: application/json; charset=utf-8`, body `{"error":{"code":"PAYLOAD_TOO_LARGE",...}}`. Body 20.9 MiB → đi qua Caddy tới API (401 khi chưa login) → trần đang chạy = 21 MiB = ceiling 20 + 1. Các biến thể `/API/ADMIN/MEDIA`, `/api/admin/media/`, `/api/admin/./media`, `?kind=item`, `/api/admin/%6dedia`, `/api//admin/media` đều 413 (kiểm trong mạng docker).
- `/media`: PUT/DELETE/POST/OPTIONS → 405. GET `/media/`, `?list-type=2`, `?policy`, `?acl`, `?versions`, `/media/private/x` → 403 AccessDenied từ rustfs. `/media/../` → Caddy chuẩn hoá thành `/` (web). `/media/public/%2e%2e/%2e%2e/...` → web 404. `/media/public/%252e%252e/x` → rustfs 404. Không đọc được object ngoài `public/`.
- `X-Forwarded-For` giả (1.2.3.4, 5.6.7.8) qua Caddy: bucket per-IP vẫn giảm liên tục (`"20-in-15min"; r=19 → 18 → 17 → 16`) → Caddy ghi đè XFF, `trust proxy 1` lấy đúng IP client, không bypass được.
- Hiện tượng không phải lỗi: upload lớn (>=15 MB) từ Windows host vào `localhost:8080` thỉnh thoảng treo (curl 000). Chạy cùng request trong mạng docker → 401/413 ngay lập tức, 3/3 lần. Kết luận: do relay localhost của WSL2, không phải Caddy/API.

## Critical
Không có.

## High
Không có.

## Medium

### M1 (đã kiểm chứng qua đọc code + test hiện có) Khoá admin từ xa vẫn làm được bằng ~10 IP
- `apps/api/src/middleware/login-rate-limit-middleware.ts:45-51`, `apps/api/src/lib/runtime-defaults.ts:73-75`.
- Kịch bản: kẻ tấn công có 10 IPv4 (proxy dân dụng rẻ) hoặc 10 prefix IPv6 /56. Mỗi IP gửi 5 lần sai cho email admin (vừa đủ trần strict per IP|email, dưới trần 20 per IP) → 50 lần sai / 15 phút → limiter per-email trả 429 cho **mọi** IP, kể cả admin nhập đúng mật khẩu. Lặp lại mỗi 15 phút (~200 request/giờ) = khoá vĩnh viễn. Thêm nữa: mỗi lần admin thử trong lúc bị khoá nhận 429 (status >= 400) nên bị tính là "failure" ở bucket IP|email của chính admin → hết khoá per-email vẫn có thể còn bị khoá strict. Cách gỡ duy nhất hiện tại: restart api (MemoryStore), chưa ghi trong docs.
- Báo cáo fix round 2 đã nêu đây là đánh đổi có chủ đích, nhưng chưa có biện pháp giảm thiểu.
- Cách sửa (khuyên): mẫu "device cookie" của OWASP. Login thành công → set cookie ký HMAC dài hạn (vd. `hmac(SESSION_SECRET, email)`), limiter per-email thêm `skip: (req) => hasValidDeviceCookie(req, emailOf(req.body))`; thiết bị đã từng đăng nhập chỉ chịu limiter per IP|email. Tối thiểu: log cảnh báo khi limiter per-email chạm trần (handler riêng) + ghi cách gỡ (restart api) vào `docs/`.

### M2 (hợp lý, chưa kiểm chứng điều kiện kích hoạt) Tính đúng của featured phụ thuộc hoàn toàn vào việc index partial unique đã được build
- `apps/api/src/services/outfit-service.ts:79-86`, `apps/api/src/models/outfit-model.ts:70`, `apps/api/src/services/public-outfit-service.ts:12`.
- Luồng hiện tại chỉ gỡ outfit featured cũ khi nhận E11000. Mongoose `autoIndex` build index bất đồng bộ lúc khởi động và nuốt lỗi build (chỉ phát event `index` trên model; `grep autoIndex|syncIndexes|createIndexes` trong `apps/api/src` không có kết quả). Nếu build index thất bại (vd. DB prod/restore đang có sẵn 2 bản ghi `featured:true`, hoặc sau này tắt autoIndex cho prod) → `setFeaturedIfPublished` không bao giờ ném E11000 → outfit cũ không bị gỡ → có nhiều outfit featured, trang chủ lấy `findOne({featured:true})` không sort → hiển thị outfit ngẫu nhiên.
- Đã kiểm chứng: DB dev có index đúng và 1 outfit featured. Chưa kiểm chứng: DB prod / bản restore.
- Cách sửa: lúc khởi động `await OutfitModel.createIndexes()` (hoặc `syncIndexes()`) trước `listen`, lỗi thì thoát process (fail-fast). Phòng thủ thêm: public query `.sort({ updatedAt: -1 })` để kết quả xác định.

## Low (đã kiểm chứng)

### L1 `/media` chuyển nguyên query string sang rustfs → override header phản hồi được
- `infra/caddy/Caddyfile:36` (`rewrite * /{$S3_BUCKET}{uri}`; `{uri}` gồm cả query).
- Đã chạy: `GET /media/public/model/seed/e01c0833159f85fb4ef3c248.webp?response-content-type=text/html&response-content-disposition=inline` → 200, `Content-Type: text/html`, `Content-Disposition: inline`, không có `X-Content-Type-Options`. rustfs cho phép override với request ẩn danh (AWS S3 thì từ chối).
- Tác động thấp vì mọi object đều qua sharp re-encode WebP, không giữ metadata (`media-service.ts:14`, `image-processing-service.ts:38`) → không cài được HTML vào object. Nhưng mặt tấn công thừa (mọi sub-resource S3 đều tới rustfs, chỉ bucket policy chặn).
- Cách sửa: `rewrite * /{$S3_BUCKET}{path}` và thêm `header X-Content-Type-Options nosniff` trong `handle_path /media/*`.

### L2 Email rỗng/không hợp lệ dùng chung một bucket toàn cục ở limiter per-email
- `login-rate-limit-middleware.ts:14-17, 50`.
- Body không có `email` dạng chuỗi → key `''`. Request đầu tiên từ IP mới thấy `"50-in-15min"; r=46` → bucket này đang dùng chung với client khác. Sau 50 request lỗi validation trong 15 phút (từ bất kỳ đâu), mọi client gõ thiếu email nhận 429 "Đăng nhập sai quá nhiều lần" thay vì lỗi validation; e2e test validation cũng có thể dính 429 ngẫu nhiên.
- Cách sửa: limiter 2 và 3 thêm `skip: (req) => emailOf(req.body) === ''` (limiter 1 theo IP vẫn đếm).

### L3 429 và 503 bị tính là "đăng nhập sai"
- `login-rate-limit-middleware.ts:42, 49` (`skipSuccessfulRequests` coi mọi status >= 400 là thất bại).
- Kịch bản: hàng đợi argon2 đầy (flood phân tán) → admin nhận 503 "Hệ thống đang bận" → mỗi lần thử ăn 1/5 quota strict của chính admin dù không có lần kiểm mật khẩu nào. 503 không cho kẻ tấn công thông tin gì, nên không cần đếm.
- Cách sửa: `requestWasSuccessful: (_req, res) => res.statusCode < 400 || res.statusCode >= 500`; cân nhắc không đếm 429 ở limiter 2 (giảm hiệu ứng kéo dài khoá ở M1).

### L4 Hai câu khác nhau cho cùng lỗi "file quá lớn", không câu nào nói giới hạn
- `infra/caddy/Caddyfile:8` "Ảnh vượt quá dung lượng cho phép" vs `apps/api/src/middleware/error-handler-middleware.ts:25` "Tệp vượt quá dung lượng cho phép".
- Kịch bản: admin đặt `uploadMaxMb = 5`; file 8 MB → API báo "Tệp…"; file 25 MB → Caddy báo "Ảnh…". Trái quy tắc U3 (một tên cho một thứ), người dùng không biết giới hạn là bao nhiêu.
- Cách sửa: thống nhất một câu; API ghi rõ "tối đa N MB" theo `getUploadMaxMb`; Caddy dùng cùng câu (có thể kèm `{$UPLOAD_MAX_MB_CEILING}`).

### L5 Hash dummy tạo lười → lần đầu email không tồn tại chậm gấp đôi
- `apps/api/src/services/password-service.ts:163-172`.
- Sau mỗi lần restart, request login đầu tiên với email không tồn tại tốn `hash + verify` (~2 lần thời gian) → oracle thời gian một lần duy nhất "email này không phải admin". Tác động rất nhỏ.
- Cách sửa: gọi `void verifyAgainstDummy('')` lúc khởi động (warm-up), lỗi thì bỏ qua (đã có cơ chế reset).

### L6 Guard path-traversal của seed không chặn symlink, chặn nhầm tên bắt đầu bằng `..`
- `apps/api/src/services/seed-service.ts:33-37`.
- `resolve` không theo symlink: `seed/images/link.png -> /etc/...` (nằm trong `imageRoot`) vẫn được đọc. `rel.startsWith('..')` chặn nhầm file hợp lệ như `..assets/a.png`. Đầu vào là file seed của người vận hành nên rủi ro thấp. Với CLI, `imageRoot` mặc định là `REPO_ROOT` (`scripts/seed-samples.ts:12, 25`) → guard đã nới từ thư mục seed ra toàn repo; ổn vì sharp sẽ từ chối file không phải ảnh.
- Cách sửa: `const real = await realpath(absolute)` rồi so với `await realpath(root)`; điều kiện `rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)`.

### L7 405 ở `/media` thiếu header `Allow`
- `infra/caddy/Caddyfile:33-34`. RFC 9110 §15.5.6 yêu cầu `Allow` cho 405. Sửa: `header @notRead Allow "GET, HEAD"` trước `respond`.

### L8 Featured đồng thời: last-writer-wins, UI bên thua hiển thị sai
- `outfit-service.ts:79-86`. Hai admin cùng bấm "Đặt nổi bật" cho A và B: cả hai nhận 200 `featured:true`, DB chỉ còn một (test `outfits.test.ts` khẳng định đúng 1). Editor của bên thua vẫn hiện "Bỏ nổi bật" tới khi tải lại; giữa bước gỡ và ghi lại có khoảng micro-giây trang chủ không có featured. Chấp nhận được cho admin 1–2 người; ghi nhận để biết.

### L9 Thiếu test cho chuẩn hoá key limiter
- `apps/api/test/auth-rate-limit.test.ts`: không có ca `' Admin@Example.com '` và `admin@example.com` từ cùng IP dùng chung bucket IP|email. Code đúng (limiter `trim().toLowerCase()` trùng với `emailSchema` ở `packages/shared/src/auth-schemas.ts:3`, cùng hàm JS), nhưng thiếu test giữ hành vi này.

## Plausible, chưa kiểm chứng
- M2 ở trên (điều kiện kích hoạt trên DB prod).
- `image: caddy:2` (`infra/docker-compose.yml:137`) không pin bản vá, trong khi cú pháp `handle_errors 413` (lọc theo status) cần bản Caddy đủ mới. Chưa kiểm phiên bản tối thiểu trong doc Caddy; bản đang chạy hỗ trợ (413 JSON chạy đúng). Khuyên pin `caddy:2.x.y` như đã làm với rustfs/aws-cli.
- Upload chunked (không Content-Length) vượt 21 MiB khi đã đăng nhập: chưa kiểm Caddy có trả 413 JSON hay lỗi khác khi `MaxBytesReader` cắt giữa chừng lúc proxy. Trình duyệt gửi FormData có Content-Length nên ít gặp.

## Đã kiểm, không có vấn đề
- Semaphore (`lib/semaphore.ts:11-36`): không rò slot khi task ném lỗi (cả lỗi đồng bộ, vì `task()` nằm trong `try`); `onFull` ném trước khi chiếm slot; nhả slot bằng cách trao thẳng cho người chờ (không giảm `active`) → FIFO, không bị chen ngang. 503 lan ra đúng vì `verifyPassword` chỉ nuốt lỗi argon2 bên trong task. `dummyHash` reset khi reject, chỉ khi vẫn là promise đang cache.
- Key limiter: chuẩn hoá trùng với schema login; `express.json` chạy trước limiter nên `req.body` có sẵn; body không phải JSON bị `json-only` chặn 415 trước. XFF không giả được (đã chạy).
- Featured: `findOneAndUpdate({_id, status:'published'})` nguyên tử; draft không thể được đặt (409); PUT dùng `outfitUpdateSchema` (omit `featured`, Zod strip key lạ); chuyển sang draft gỡ featured trong cùng một lệnh `$set`; id lạ/draft không làm mất featured hiện tại.
- Revalidate `scope:'all'` → `revalidatePath('/', 'layout')`; union schema không lẫn nhánh; `/api/revalidate` của web không ra ngoài được (Caddy đưa `/api/*` sang API).
- MutationObserver: gộp theo rAF, bỏ qua mutation trong SVG connector, `attributeFilter: ['style']` nên `data-active`/`data-active-id` không gây vòng lặp; dọn dẹp đủ (disconnect + cancelAnimationFrame).
- Admin UI: `display` không gắn `aria-invalid`; quy tắc trạng thái lưu nhất quán editor/settings; xoá ảnh chia sẻ và để trống `uploadMaxMb` thật sự `$unset` ở API (`settings-service.ts:44-55`).
- Kích thước file code: lớn nhất 181 dòng (`lookbook.module.css`), file TS lớn nhất 172 dòng (`editor-state.ts`) → không file code nào vượt 200.
- Giá trị nghiệp vụ fix cứng: không thấy mới. Ngưỡng limiter, hàng đợi argon2, trần upload, múi giờ, thời gian revalidate đều từ env, có trong compose + `.env.example`. Còn lại là chuỗi hiển thị và hằng kỹ thuật (`REVALIDATE_TIMEOUT_MS`, `JSON_BODY_LIMIT`).

## Việc nên làm (theo thứ tự)
1. M1: device cookie cho limiter per-email (hoặc tối thiểu log cảnh báo + ghi cách gỡ vào docs).
2. M2: `createIndexes()` fail-fast lúc khởi động + sort cho public featured query.
3. L1 + L7: `{path}` thay `{uri}`, `nosniff`, `Allow` ở `/media` (sửa 3 dòng Caddyfile).
4. L2 + L3: `skip` cho email rỗng, `requestWasSuccessful` không đếm 5xx.
5. L4, L5, L6, L9 khi tiện.

## Câu hỏi còn mở
- M1: có chấp nhận thêm cookie "thiết bị tin cậy" (thêm 1 cookie httpOnly) không, hay chỉ cần log + hướng dẫn gỡ?
- Pin `caddy` về bản cụ thể nào (cần kiểm tag trên Docker Hub)?

**Status:** DONE_WITH_CONCERNS
**Summary:** Fix round 2 + 2 commit P7 đạt 8.5/10: không Critical/High; typecheck/lint/test (32 + 66 + 164) pass; Caddy health/413/media/XFF đã kiểm chứng bằng request thật. Còn 2 Medium (khoá admin từ xa bằng ~10 IP; featured phụ thuộc index đã build) và 9 Low.
**Concerns/Blockers:** M1 là đánh đổi thiết kế, cần quyết định; M2 chưa kiểm được trên DB prod; tình trạng upload treo từ Windows host là do relay WSL2, không phải lỗi app.
