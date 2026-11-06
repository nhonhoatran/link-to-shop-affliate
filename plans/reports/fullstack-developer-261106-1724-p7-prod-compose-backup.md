# P7: compose production + backup + tách test API

## Kết quả chính
- Chọn **override** (`-f infra/docker-compose.yml -f infra/docker-compose.prod.yml`): chỉ khai báo phần khác dev. `!reset []` (xoá ports) và `!override` (thay ports caddy) hoạt động trên Compose v5 (xác nhận bằng `docker compose config`: chỉ caddy còn `ports`).
- Mongo bật auth bằng `MONGO_INITDB_ROOT_USERNAME/PASSWORD` (`:?`). API dùng root creds trong `MONGODB_URI=mongodb://USER:PASS@mongo:27017/DB?authSource=admin`. Chưa làm user quyền tối thiểu (đã chấp nhận root, ghi chú trong file).
- `SESSION_COOKIE_SECURE=true`, `SITE_ADDRESS` bắt buộc (`:?`), cổng 80/443 lấy từ `CADDY_HTTP_PORT`/`CADDY_HTTPS_PORT` (mặc định 80/443). Không thêm giá trị nghiệp vụ cứng.
- Mật khẩu Mongo nằm trong URI nên phải URL-safe (chữ, số, `- _ . ~`). Đã ghi trong compose + env example.

## File
- Tạo: `infra/docker-compose.prod.yml`, `infra/.env.prod.example`, `infra/backup/backup-mongo-and-bucket.sh` (LF, chmod +x).
- Sửa: `.gitignore` thêm `!.env.prod.example` (kiểm: `git check-ignore -v` → `.env.prod.example` được bỏ qua ignore, `.env.prod` vẫn bị ignore).
- Tách test (tổng 66 test, không mất test nào, mỗi file < 200 dòng):
  - `outfits.test.ts` → `outfits-admin-crud.test.ts` (185 dòng), `outfits-public-and-revalidation.test.ts` (77)
  - `media-settings-admins.test.ts` → `media-upload.test.ts` (115), `settings-and-admin-users.test.ts` (119)
- Env thật đặt ở **gốc repo** `.env.prod` (ví dụ nằm ở `infra/.env.prod.example`).

## Lệnh đã chạy và kết quả
- `pnpm --filter @under30ss/api test` → 11 file, 66 test pass; `tsc --noEmit` sạch.
- `docker compose --env-file infra/.env.prod.example -f infra/docker-compose.yml -f infra/docker-compose.prod.yml config` → OK (URI có authSource=admin, cookie secure "true", ports chỉ ở caddy).
- Smoke test project `under30ss-prodtest`, `SITE_ADDRESS=:80`, host 8090/8453 (HTTPS thật cần domain + DNS + cổng 80/443, chưa test được ở local):
  - `up -d --build`: api, web, mongo healthy.
  - `docker ps`: mongo `27017/tcp`, rustfs `9000-9001/tcp` (chỉ expose nội bộ, không có `->` publish); chỉ caddy publish 8090->80, 8453->443.
  - `curl http://localhost:8090/` → 200.
  - `mongosh --eval 'db.adminCommand({listDatabases:1})'` không creds → `MongoServerError: Command listDatabases requires authentication`; có creds → ok 1.
  - Backup (`ENV_FILE=.env.prodtest COMPOSE_PROJECT_NAME=under30ss-prodtest BACKUP_DIR=/tmp/u30-bk bash infra/backup/backup-mongo-and-bucket.sh`) → rc=0, tạo `20261106-172834/mongo.archive.gz` (1328 B) + `bucket/public/probe.txt` (object thử, nội dung `hi`).
  - Restore thử: drop `probe` → `mongorestore --archive --gzip --drop` → "1 document(s) restored successfully", count = 1. Restore bucket bằng `s3 sync` → object về lại.
  - Dọn: `down -v --remove-orphans` project prodtest, xoá image `under30ss-prodtest-api/web`, xoá `/tmp/u30-bk`, file env/script tạm. Stack dev `under30ss-*` vẫn chạy nguyên (kiểm bằng `docker ps`).
- Chưa test: HTTPS/cert Let's Encrypt, login admin qua HTTP (cookie Secure), cron thật, `BACKUP_RETENTION_DAYS` xoá thật (chỉ chạy lệnh `find`, chưa có thư mục cũ để xoá).

## Script backup
- Cơ chế: `mongodump --archive --gzip` chạy trong container mongo (creds lấy từ env của container, không lộ trên dòng lệnh host); bucket dùng `docker compose run --rm --no-deps ... rustfs-init` (đã có image `amazon/aws-cli:2.39.5` + endpoint + key), chạy với uid của người gọi nên file không thuộc root.
- Cấu hình: `ENV_FILE` (mặc định `<repo>/.env.prod`), `BACKUP_DIR` (mặc định `<repo>/backups`), `BACKUP_RETENTION_DAYS` (mặc định 14), `COMPOSE_PROJECT_NAME` (tuỳ chọn). Đọc theo thứ tự: biến môi trường → dòng neo `^NAME=` trong env file → mặc định.
- Lỗi bất kỳ → exit non-zero và xoá thư mục backup dở dang (trap). Chỉ prune khi backup thành công.
- Lệnh restore nằm ở header script. Gợi ý cron trong header.

## Các bước deploy (cho người viết docs)
1. VPS cài Docker + Compose; DNS domain trỏ về VPS; mở cổng 80/443.
2. `cp infra/.env.prod.example .env.prod` rồi đổi **tất cả** giá trị. Biến bắt buộc (`:?`): `SITE_ADDRESS`, `SITE_URL`, `MEDIA_PUBLIC_BASE_URL`, `ALLOWED_ORIGIN`, `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `SESSION_SECRET`, `REVALIDATE_SECRET`. Tuỳ chọn: `MONGO_DB`, `CADDY_HTTP_PORT/HTTPS_PORT`, các biến tinh chỉnh (xem `.env.example`), `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`. `SITE_URL`/`MEDIA_PUBLIC_BASE_URL` (`<SITE_URL>/media`)/`ALLOWED_ORIGIN` phải là `https://<domain>` khớp `SITE_ADDRESS`.
3. Khởi động: `docker compose --env-file .env.prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build`.
4. Tạo admin đầu tiên (sau khi api healthy): chạy script `create-admin` (`pnpm create-admin` ở gốc repo, hoặc chạy trong container api tương đương; cần kiểm lại cách chạy trong container vì image slim có thể không có tsx).
5. Đăng nhập, **đổi mật khẩu admin ngay** (nếu dùng mật khẩu tạm khi tạo).
6. Đặt cron chạy `infra/backup/backup-mongo-and-bucket.sh`; thử restore định kỳ.
- Lưu ý: `MONGO_INITDB_*` chỉ có tác dụng khi volume mongo còn trống. Đổi mật khẩu sau lần khởi tạo đầu phải đổi trong Mongo, không chỉ sửa env. Nếu volume mongo đã có từ stack dev (không auth) thì phải xoá volume hoặc tạo user thủ công.

## Đề xuất thay đổi file không thuộc quyền
- Không bắt buộc sửa gì. Gợi ý (tuỳ chọn): `infra/docker-compose.yml:75-76` comment "the production compose added in P7 does" giờ đã đúng, có thể giữ nguyên.

## Câu hỏi chưa rõ
- Cách chạy `create-admin` trong container api production (script cần `tsx`, chưa kiểm image api có hay không; chưa đọc `apps/api/Dockerfile` để xác nhận). Cần chốt trước khi viết docs.

**Status:** DONE_WITH_CONCERNS
**Summary:** Compose prod (override), env example, script backup/restore, tách 2 file test (66 test pass) đã xong và kiểm bằng smoke test project riêng, đã dọn sạch; stack dev không bị đụng.
**Concerns/Blockers:** Chưa test HTTPS thật (cần domain). Chưa xác nhận lệnh `create-admin` trong container production. Mongo dùng root creds, chưa có user quyền tối thiểu. Đổi mật khẩu Mongo sau lần init đầu cần thao tác thủ công.
