# Review P1–P6 + danh sách sửa (fix round 1)

Ngày 2026-11-06. Nguồn: code-reviewer (điểm 7.5/10, 0 Critical, 3 High, 8 Medium, 9 Low), tester (`tester-261106-1408-p1-p6-test-assessment.md`, 150/150 pass), ui-consistency verifying (3 checker, đã calibrate bằng 3 lỗi cài sẵn — bắt đủ 3). Mỗi mục ghi ID, file:dòng tại thời điểm review, cách sửa đã chốt. A = agent API/infra/shared, B = agent web.

Đã sửa trước bởi lead: `packages/shared/src/revalidate-contract.ts` — `revalidateRequestSchema` thành union `{paths}` | `{scope:'all'}` (M6).

## Quyết định đã chốt (lead)
- D1 Featured: chặn đặt nổi bật cho draft (409 + UI disable kèm lý do); chuyển outfit sang draft thì tự gỡ featured.
- D2 Múi giờ hiển thị admin: env web `ADMIN_TIME_ZONE` (mặc định `Asia/Ho_Chi_Minh`), dùng cho mọi chỗ format ngày.
- D3 Đổi mật khẩu: chưa làm (ngoài phạm vi v1) → sửa hint, không hứa.
- D4 Prod chạy HTTPS (Caddy auto HTTPS); dev/local compose chạy HTTP.
- D5 Mongo auth + bỏ publish port: làm trong `docker-compose.prod.yml` ở P7; dev compose giữ `127.0.0.1`.

## High
- H1 [A] Cookie `secure` + compose HTTP → không login được. `session-middleware.ts:29`. Thêm env `SESSION_COOKIE_SECURE` (bool, default `true` khi production), dev compose + `.env.example` đặt `false`, ghi chú prod bắt buộc HTTPS. `app.set('trust proxy', 1)` nếu chưa có.
- H2 [B] next/image trong container fetch `localhost` → ảnh hỏng. `apps/web/next.config.ts`: `images.unoptimized: true` (API đã resize + WebP), bỏ phụ thuộc build-time `remotePatterns` nếu không còn cần.
- H3 [A] Rate limit login theo `IP|email` → spraying + DoS argon2. Thêm limiter theo IP (mọi lần thử) + limiter theo email (không kèm IP), ngưỡng từ env; giới hạn số verify argon2 đồng thời (semaphore nhỏ, số từ env). `login-rate-limit-middleware.ts`, `password-service.ts`.

## Medium
- M1 [A+B] PUT editor ghi đè `featured` cũ. A: update bỏ qua `featured` (chỉ endpoint `/featured` đổi). B: bỏ `featured` khỏi body PUT (`hooks/admin/editor-state.ts:61`).
- M2 [A+B] D1. A: `outfit-service.ts:56-61`. B: `outfit-editor-toolbar.tsx` disable + giải thích.
- M3 [A] Trần upload: env `UPLOAD_MAX_MB_CEILING`, validate `uploadMaxMb` settings theo trần (API), Caddy `request_body { max_size }` lấy từ env.
- M5 [B] Connector preview không vẽ lại khi dời điểm/sắp xếp/xoá món. `lookbook-interactions.tsx:36-55`: MutationObserver (subtree, attr `style`, childList) → measure qua rAF.
- M6 [A+B] Revalidate settings bị cắt 50 path. A: settings route gửi `{scope:'all'}`. B: route web xử lý `scope:'all'` bằng `revalidatePath('/', 'layout')` + test.
- M7 [A+B] Cấu hình chưa động: A: đưa `LOGIN_RATE_LIMIT_*`, `DEFAULT_SITE_NAME/SEO_*`, các env mới vào compose + `.env.example`. B: `PUBLIC_REVALIDATE_SECONDS`, `ADMIN_TIME_ZONE` vào `web-env.ts`; header admin đọc `siteName` từ settings (bỏ literal `Under30ss`, `app/admin/(protected)/layout.tsx:12`); D2 cho `outfit-list-table.tsx:7`, `user-list.tsx:12` (tránh hydration mismatch).
- M8 [B] D3: sửa hint `user-create-form.tsx:38`.

## Low
- L1 [A] `applyFeatured` kiểm id đích tồn tại trước khi gỡ cờ outfit khác; lỗi trùng đồng thời → thông báo rõ.
- L2 [A] Caddy `/media/*` chỉ GET/HEAD; bỏ `RUSTFS_CONSOLE_ENABLE`.
- L3 [B] Web kiểm https cho `affiliateUrl` (dùng schema shared `affiliateUrlSchema`) trong `lookbook-link-props.ts`; không https → render như link rỗng.
- L4 [B] Bỏ fetch tag chết trong `public-data-loaders.ts` (chỉ dùng revalidatePath).
- L5 [A+B] DRY: A gom `'public/'` thành 1 hằng; B dùng `LOGIN_PATH` ở `logout-button.tsx:21`, `use-outfit-actions.ts:37`.
- L6 [A] Pin version image `rustfs/rustfs`, `amazon/aws-cli` (tag thật, kiểm Docker Hub); `/api/health` ping Mongo (503 khi down) + healthcheck api/web trong compose; cache mount pnpm store đúng `$PNPM_HOME/store` (kiểm doc pnpm 11).
- L7 [B] Ctrl+S bỏ qua khi đang lưu; settings có nút xoá ảnh chia sẻ.
- L8 Object S3 mồ côi: để sau (ghi vào roadmap P7).
- L9 [A] Message lỗi field từ server tiếng Việt (map theo issue code giống `validation-messages.ts` của web — cân nhắc đưa bảng map về shared để 2 bên dùng chung; nếu đưa về shared thì A làm, B chuyển sang dùng).

## Test gaps (tester)
- T1 [A] Test size-limit sai chỗ (`media-settings-admins.test.ts:77`): `UPLOAD_MAX_MB=1`, PNG hợp lệ >1MB → 413; settings `uploadMaxMb` cao hơn → không 413.
- T2 [B] `/look/[slug]`: loader null → `notFound()`; có DTO → 1 h1 + JSON-LD.
- T3 [B] `admin/_lib/admin-api.ts`: 401 → redirect `/admin/login`, 404 → `notFound()`.
- T5 [A] DELETE admin id sai định dạng → 404; guard admin cuối test ở mức service.
- T6 [B] Revalidate route env lỗi → 500, không gọi revalidatePath.
- T8 [B] Trang list admin truyền đúng q/status/page vào `adminGet`.
- T9 [B] `sitemap.ts`: URL tuyệt đối theo `SITE_URL`.
- T10 [A] Media: SVG/GIF → 400 `fields.file`; PNG cụt → 400 không 500; cookie cũ sau logout → 401; cờ cookie httpOnly/sameSite.

## UI (ui-consistency verifying, checklist C — admin) [B]
- U1 `admin-list.module.css` `.filters .field` không bao giờ áp (class module khác) → nút "Tìm" lệch; sửa để rule chạm class field dùng chung (vd. prop `className` cho AdminFormField hoặc biến thể compact trong `admin.module.css`).
- U2 MediaDropzone là field nằm ngoài AdminFormField (nhãn `<strong>`, FieldError riêng, không aria-invalid) → đưa qua AdminFormField (cùng nhãn `--text-sm` `--font-weight-medium`, FieldError, aria-invalid/describedby). Lỗi `modelImage` (create) đặt ngay dưới dropzone; settings hiện lỗi `ogImage`; anchor ở item-edit có nhãn + aria-describedby. Thứ tự thumbnail nhất quán (dưới dropzone ở mọi form).
- U3 Chữ: một tên cho một thứ — "Mô tả SEO" (details) / "Mô tả SEO mặc định" (settings); "Outfit chưa có tên" / "Món chưa có tên"; hint: không dấu chấm cuối khi là 1 cụm, có dấu chấm khi là câu đầy đủ — thống nhất 1 quy tắc; "Bắt buộc" vs "Không được để trống" → một câu; field số `uploadMaxMb` có message riêng (giá trị tối thiểu/tối đa, không phải "ký tự"); fallback lỗi chung một câu; logout pending "Đang đăng xuất…"; confirm "Xoá quản trị viên này?"; section aria-label trùng/khác h2 → bỏ aria-label dư, dùng `aria-labelledby` h2.
- U4 Heading: panel "Chi tiết món" là h2 (ngang các panel); panel canvas có h2 hiển thị.
- U5 Cảnh báo món chưa đặt điểm dùng `FormError` (hoặc biến thể warning chung trong `field-error.tsx`), tag "Chưa đặt điểm"/"Cần sửa" dùng component chung thay vì class tay.
- U6 Nút bật/tắt (preview desktop/mobile, "Đặt nổi bật") thể hiện trạng thái nhấn một cách (aria-pressed + cùng kiểu); nhóm nút có class gap chung; `.toolbar` không lồng chồng margin.
- U7 Xoá outfit / xoá món / xoá admin có pending + disabled.
- U8 Trạng thái lưu: không lặp "Đang lưu…" ở 2 chỗ; settings + editor cùng vị trí và cùng các trạng thái; user-create báo "Đã thêm …".
- U9 Nút submit: một class footer form dùng chung (`formActions`) cho mọi form, không mượn `dialogActions`; login h1 có khoảng cách như `panelTitle`.
- U10 Users: form thêm admin rộng `.narrow` như các form khác.
- U11 401 xử lý một kiểu: `use-form-submit` + `user-list` cũng redirect `/admin/login` như editor; editor dùng chung luồng validate→map→message với `use-form-submit` nếu được.
- U12 Typography: `.title`/`.panelTitle` ghi đủ bundle (size + `--font-weight-bold` + line-height); một kiểu focus — bỏ `.control:focus-visible` riêng, dùng `:focus-visible` toàn cục (hoặc ngược lại cho mọi control admin) — chọn global cho đồng bộ với checklist A.
- Giữ nguyên (có lý do): "Xem trang" là `<a target=_blank>` (mở tab mới); width dùng bội số `--space-8`.

## Câu hỏi còn mở
- Có cần cổng coverage 80% (cài `@vitest/coverage-v8`)? Chưa cài.

## Re-review sau fix round 1 + kết quả fix round 2
- Re-review (cùng reviewer, sau fix round 1): 8.5/10, hết Critical/High. M7 sửa một phần; lỗi mới N1 (limiter theo email không kèm IP cho phép khoá admin từ xa) + 9 mục Low.
- M4 (Mongo không auth + publish port) = D5, hoãn sang compose prod ở P7.
- Fix round 2 (`fullstack-developer-261106-1438-fix-round-2-api-infra.md`, `...-fix-round-2-web.md`): N1 → 3 limiter (IP mọi lần thử / IP|email chặt / email lỏng); featured atomic; `outfitUpdateSchema` bỏ `featured`; hàng đợi argon2 có trần (503); reset `dummyHash`; Caddy 413 JSON + trần +1 MiB; `/api/health` 404 từ ngoài; 1 mongod dùng chung cho test; 10 mục UI admin còn lại; flake sitemap.
- Kiểm lại bởi lead: typecheck/lint/build sạch; test 32 + 65 + 164 = 261 pass, 2 lần liên tiếp (agent báo 5 lần liên tiếp).
- Chưa re-review vòng 2 cho phần sửa round 2 — làm trong bước review của P7.
