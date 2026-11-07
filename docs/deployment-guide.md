# Hướng dẫn triển khai và vận hành Under30ss

Tài liệu gồm: chạy local bằng Docker, triển khai production trên VPS, sao lưu và khôi phục, bảng biến môi trường, và xử lý sự cố.

Liên quan: [Kiến trúc hệ thống](./system-architecture.md) · [Quy chuẩn code](./code-standards.md) · [Roadmap](./development-roadmap.md)

## Contents
- [Yêu cầu](#yêu-cầu)
- [Chạy local để phát triển (`pnpm dev`)](#chạy-local-để-phát-triển-pnpm-dev)
- [Chạy local bằng Docker](#chạy-local-bằng-docker)
- [Dữ liệu mẫu](#dữ-liệu-mẫu)
- [Triển khai production](#triển-khai-production)
- [Sao lưu](#sao-lưu)
- [Khôi phục](#khôi-phục)
- [Tham chiếu biến môi trường](#tham-chiếu-biến-môi-trường)
- [Xử lý sự cố](#xử-lý-sự-cố)
- [Kiểm tra sau triển khai](#kiểm-tra-sau-triển-khai)

## Yêu cầu

| Thành phần | Dev (local) | Production |
|------------|-------------|------------|
| Docker với Compose v2 (`docker compose`) | Docker Desktop, backend WSL2 trên Windows 11 | Docker Engine và Compose plugin trên VPS Linux |
| Node.js | 24 (image Dockerfile dùng `node:24-bookworm-slim`; `engines` ghi `>=22.12.0`) | Không cần trên VPS (build trong Docker) |
| pnpm | 11 (`packageManager: pnpm@11.3.0`) | Không cần trên VPS |
| Mạng | Không | DNS của domain trỏ về VPS, mở cổng 80 và 443 |

Build trong Docker dùng context là gốc repo: `apps/api/Dockerfile` và `apps/web/Dockerfile` cùng build từ `..` của `infra/`.

## Chạy local để phát triển (`pnpm dev`)

Cách dùng hằng ngày khi sửa code: api và web chạy trên máy (tự nạp lại khi sửa), chỉ Mongo và RustFS chạy trong Docker. Đã kiểm chứng 2026-11-07 trên `http://localhost:3000`: `pnpm e2e` 65 passed (gồm visual 4). Số test hiện tại xem [Kiểm thử](./code-standards.md#kiểm-thử).

```bash
cp .env.example .env                      # đầu vào docker compose
cp apps/api/.env.example apps/api/.env    # api chạy trên host
cp apps/web/.env.example apps/web/.env.local
# REVALIDATE_SECRET trong apps/web/.env.local phải trùng apps/api/.env;
# S3_ACCESS_KEY / S3_SECRET_KEY trong apps/api/.env phải trùng .env (gốc)
pnpm install
pnpm dev:infra      # chỉ Mongo + RustFS (+ tạo bucket), không build api/web
pnpm create-admin   # lần đầu
pnpm seed:samples --publish-with-placeholder   # tuỳ chọn: dữ liệu mẫu để xem
pnpm dev            # api :4000, web :3000
```

Mở `http://localhost:3000` (public) và `http://localhost:3000/admin` (admin).

Cách hoạt động:
- `next dev` chuyển tiếp `/api/*` của trình duyệt sang `API_INTERNAL_URL` (rewrite chỉ bật khi `NODE_ENV=development`, xem `apps/web/next.config.ts`). Trình duyệt vẫn cùng origin nên cookie phiên và kiểm tra origin hoạt động như production. Route của chính web (`/api/revalidate`) vẫn do web xử lý.
- Ảnh lấy thẳng từ RustFS: `MEDIA_PUBLIC_BASE_URL=http://localhost:9000/under30ss` (bucket cho đọc ẩn danh phần `public/*`). URL ảnh được API tính từ key lúc trả về, nên cùng dữ liệu dùng được cho cả dev lẫn stack Docker.
- `ALLOWED_ORIGIN` của api cho phép cả `http://localhost:3000` và `http://localhost:8080`.
- Docker chỉ có trong WSL (không có lệnh `docker` trên Windows): thay `pnpm dev:infra` bằng `wsl -e bash -lc "cd /mnt/<ổ>/<đường dẫn repo> && docker compose --env-file .env -f infra/docker-compose.yml up -d mongo rustfs-init"`.

Lưu ý:
- Sửa `apps/web/next.config.ts` khi `pnpm dev` đang chạy: Next tự khởi động lại và trên Windows có lúc crash (`exit 3221226505`). Chạy lại `pnpm dev`.
- `next dev` ghi lại `apps/web/next-env.d.ts` (trỏ `.next/dev/types`). Không commit thay đổi này; `next build` ghi lại bản gốc.
- Chạy e2e trên dev: `E2E_BASE_URL=http://localhost:3000 pnpm e2e`.

## Chạy local bằng Docker

Chạy toàn bộ năm service trong compose, giống production nhất, truy cập qua `http://localhost:8080`. Dùng để kiểm tra trước khi deploy (Caddy, Dockerfile, giới hạn upload).

### 1. Chuẩn bị file env

Chạy từ gốc repo:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

- `.env` (gốc) là đầu vào của docker compose. Vì file compose nằm ở `infra/`, mọi lệnh compose trong tài liệu này đều truyền `--env-file` tường minh.
- `apps/api/.env` dùng cho script chạy trên host (`pnpm create-admin`, `pnpm seed:samples`). Các script này nạp `apps/api/.env` từ thư mục làm việc, hoặc `.env` ở gốc nếu có.
- Giá trị trong `.env.example` là mặc định cho dev. Đổi `SESSION_SECRET`, `REVALIDATE_SECRET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` nếu máy dùng chung.

### 2. Khởi động stack

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Kiểm tra:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs -f api
```

Mở `http://localhost:8080`. Trang chủ sẽ báo chưa có outfit cho tới khi seed hoặc tạo outfit.

Cổng chỉ bind vào loopback: Mongo `127.0.0.1:27017`, RustFS `127.0.0.1:9000`. `api`, `web` và console RustFS không publish ra host.

### 3. Cài dependency và tạo admin

```bash
pnpm install
pnpm create-admin
```

`pnpm create-admin` hỏi `Admin email` rồi `Password (min 8 characters)`, và hỏi nhập lại mật khẩu trên TTY. Mật khẩu không hiển thị khi gõ. Script này kết nối Mongo qua `MONGODB_URI` trong `apps/api/.env` (mặc định `mongodb://localhost:27017/under30ss`).

Có thể truyền email qua cờ: `pnpm create-admin --email admin@example.com`. Mật khẩu **không** nhận qua tham số: cờ `--password` bị từ chối.

### 4. Sau khi sửa code

Rebuild đúng service đã đổi:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build web
docker compose --env-file .env -f infra/docker-compose.yml up -d --build api
```

### 5. Dừng stack

```bash
docker compose --env-file .env -f infra/docker-compose.yml down
```

**Cảnh báo:** `down -v` xoá luôn volume `mongo-data` và `rustfs-data`. Dữ liệu outfit, admin và ảnh sẽ mất.

## Dữ liệu mẫu

Seed đọc `seed/sample-outfits.json`, upload ảnh lên bucket, rồi ghi outfit vào Mongo theo `slug` (upsert). Chạy lại được.

```bash
pnpm seed:samples
```

Cờ (truyền sau tên script, ví dụ `pnpm seed:samples --publish-with-placeholder`):

| Cờ | Mặc định | Ý nghĩa |
|----|----------|---------|
| `--file <đường dẫn>` | `seed/sample-outfits.json` | File seed khác |
| `--image-root <thư mục>` | Gốc repo | Ảnh phải nằm trong thư mục này. Đường dẫn `file` trong seed tính từ thư mục chứa file seed |
| `--publish-with-placeholder` | Tắt | Giữ `published` dù thiếu link hoặc anchor. **Chỉ dùng local**, bị từ chối khi `NODE_ENV=production` |

Hành vi quan trọng:
- `seed/sample-outfits.json` đặt `status: draft` cho cả hai outfit mẫu, vì link affiliate đang để trống. Outfit `draft` không hiện trên public. Điền link https và anchor cho mọi món rồi publish từ admin, hoặc dùng `--publish-with-placeholder` ở local để xem thử.
- Mỗi dòng kết quả có dạng `<slug>: <status>`. Dòng kèm `(saved as draft: links or anchors missing)` nghĩa là bị hạ về draft.
- Script gọi revalidate tới `WEB_REVALIDATE_URL` trong `apps/api/.env` (mặc định `http://localhost:3000/api/revalidate`). Khi `pnpm dev` đang chạy thì lời gọi thành công. Nếu chỉ chạy stack Docker, web không publish cổng 3000 ra host nên lời gọi thất bại (đã biết). Trang public vẫn làm mới trong `PUBLIC_REVALIDATE_SECONDS` (mặc định 300 giây), hoặc ngay sau khi admin lưu.

## Triển khai production

Mục này dựa trên `infra/docker-compose.prod.yml`, `infra/.env.prod.example` và `infra/caddy/Caddyfile`. Phần HTTPS thật và cron trên VPS chưa được kiểm chứng (chưa có VPS và domain trong v1). Xem [Roadmap](./development-roadmap.md#việc-chưa-kiểm-chứng).

### 1. Chuẩn bị VPS và DNS

1. Cài Docker Engine và Compose plugin.
2. Tạo bản ghi DNS trỏ domain (ví dụ `shop.example.com`) về IP VPS.
3. Mở cổng 80 và 443.
4. Lấy mã nguồn về thư mục triển khai (ví dụ `/opt/under30ss`).

### 2. Tạo `.env.prod`

```bash
cp infra/.env.prod.example .env.prod
```

`.env.prod` nằm ở gốc repo, đã bị gitignore. Đổi **mọi** giá trị `change-me-*` và các giá trị mẫu.

Biến bắt buộc (compose dùng `:?` và dừng nếu thiếu):

| Biến | Yêu cầu |
|------|---------|
| `SITE_ADDRESS` | Domain, ví dụ `shop.example.com`. Không có `http://` |
| `SITE_URL` | `https://<domain>` |
| `MEDIA_PUBLIC_BASE_URL` | `https://<domain>/media` |
| `ALLOWED_ORIGIN` | `https://<domain>` |
| `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD` | **Chỉ ký tự URL-safe**: chữ, số, `-`, `_`, `.`, `~`. Mật khẩu nằm trong `MONGODB_URI` |
| `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Khoá RustFS. Secret tối thiểu 8 ký tự |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `REVALIDATE_SECRET` | Chuỗi ngẫu nhiên tối thiểu 16 ký tự |

Tạo chuỗi ngẫu nhiên (một cách, ví dụ): `openssl rand -hex 32`.

Biến tuỳ chọn: `MONGO_DB`, `CADDY_HTTP_PORT` (mặc định 80), `CADDY_HTTPS_PORT` (mặc định 443), `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, và các biến tinh chỉnh trong [bảng biến môi trường](#tham-chiếu-biến-môi-trường). Biến tuỳ chọn không khai báo thì dùng mặc định của compose.

Không đặt `SESSION_COOKIE_SECURE` trong `.env.prod`: compose prod đặt `true` cố định, vì production chạy HTTPS.

### 3. Khởi động

```bash
docker compose --env-file .env.prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
```

Khác với dev, compose prod:
- Mongo bật auth bằng `MONGO_INITDB_ROOT_USERNAME/PASSWORD`. API dùng `mongodb://<user>:<pass>@mongo:27017/<db>?authSource=admin`.
- Không publish cổng Mongo và RustFS. Chỉ `caddy` publish 80 và 443.
- `SESSION_COOKIE_SECURE=true`.
- `SITE_ADDRESS` là domain, Caddy tự cấp HTTPS.

Kiểm tra `ps` cho thấy `api`, `web`, `mongo` đều healthy trước khi tạo admin.

### 4. Tạo admin đầu tiên

Chạy trong container api. Image api không có `tsx`, nên script được chạy từ bản đã build (`dist/scripts/create-admin.js`):

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml --env-file .env.prod exec api node dist/scripts/create-admin.js --email <email>
```

- Chạy trong terminal tương tác (SSH vào VPS). Script hỏi mật khẩu và ẩn khi gõ trên TTY.
- Mật khẩu không truyền qua tham số. Cờ `--password` bị từ chối.
- Thiếu `--email` thì script hỏi email.

Đăng nhập tại `https://<domain>/admin/login`.

### 5. Đổi mật khẩu admin

**Hiện chưa có chức năng đổi mật khẩu trong giao diện hay API** (ngoài phạm vi v1). Cách xoay vòng tài khoản:

1. Tạo admin mới với mật khẩu mạnh bằng lệnh ở bước 4 (email khác).
2. Đăng nhập bằng tài khoản mới để kiểm tra.
3. Vào `/admin/users` và xoá tài khoản admin ban đầu.

Lưu ý: API không cho xoá chính tài khoản đang đăng nhập, và không cho xoá admin cuối cùng (trả 409). Vì vậy phải tạo admin mới trước rồi mới xoá admin cũ.

### 6. Lên lịch sao lưu

Xem [Sao lưu](#sao-lưu). Thử khôi phục định kỳ, không chỉ tạo bản sao lưu.

### 7. Cập nhật phiên bản

```bash
git pull
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml --env-file .env.prod up -d --build
```

Sau khi lên phiên bản có cookie thiết bị `u30.dev`, mỗi admin đăng nhập lại một lần để nhận cookie. Trước đó limiter theo email vẫn áp dụng như cũ.

## Sao lưu

Script `infra/backup/backup-mongo-and-bucket.sh` dump Mongo (`mongodump --archive --gzip`, chạy trong container mongo) và đồng bộ bucket về thư mục host (`aws s3 sync`, chạy trong container `rustfs-init`). Lỗi ở bất kỳ bước nào thì thoát khác 0 và xoá thư mục dở dang. Chỉ xoá bản cũ khi lần sao lưu hiện tại thành công.

Chạy thủ công:

```bash
bash infra/backup/backup-mongo-and-bucket.sh
```

Cấu hình (biến môi trường trước, rồi dòng tương ứng trong file env, rồi mặc định):

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `ENV_FILE` | `<repo>/.env.prod` | File env dùng cho compose |
| `BACKUP_DIR` | `<repo>/backups` | Thư mục đích. Nên đặt `/var/backups/under30ss` (xem `.env.prod.example`) |
| `BACKUP_RETENTION_DAYS` | 14 | Xoá thư mục sao lưu cũ hơn số ngày này |
| `COMPOSE_PROJECT_NAME` | Lấy từ compose (`under30ss`) | Chỉ cần khi chạy nhiều stack trên một host |

Đầu ra: `<BACKUP_DIR>/<YYYYMMDD-HHMMSS>/mongo.archive.gz` và `<BACKUP_DIR>/<YYYYMMDD-HHMMSS>/bucket/`.

File có quyền thực thi trong git (mode `100755`), nhưng gọi qua `bash` vẫn an toàn khi checkout làm mất quyền. Ví dụ cron:

```cron
30 2 * * * bash /opt/under30ss/infra/backup/backup-mongo-and-bucket.sh >> /var/log/under30ss-backup.log 2>&1
```

Ví dụ trên chạy lúc 02:30 hằng ngày. Đường dẫn `/opt/under30ss` là đường dẫn ví dụ.

Trạng thái kiểm chứng (2026-11-06): đã chạy thành công trên stack thử nghiệm, tạo `mongo.archive.gz` và `bucket/`, khôi phục Mongo (`--drop`) và đồng bộ bucket ngược lại. Chưa kiểm chứng cron thật trên VPS và việc xoá bản cũ thật.

## Khôi phục

Chạy khi stack đang chạy, từ gốc repo. `DIR` là thư mục sao lưu được chọn:

```bash
C="docker compose --env-file .env.prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml"

# MongoDB: --drop xoá các collection đang có trong bản dump trước khi nạp
$C exec -T mongo sh -c 'mongorestore --archive --gzip --drop -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' < "$DIR/mongo.archive.gz"

# Bucket: đưa bản sao lưu lên lại. Thêm --delete để xoá object không có trong bản sao lưu
$C run --rm --no-deps -v "$DIR/bucket:/restore:ro" --entrypoint sh rustfs-init -c 'aws --endpoint-url "$S3_ENDPOINT" s3 sync /restore "s3://$S3_BUCKET"'
```

Thử khôi phục trên stack riêng trước khi làm trên production. Khôi phục Mongo ghi đè dữ liệu hiện tại.

## Tham chiếu biến môi trường

Nguồn đối chiếu: `.env.example` (gốc), `apps/api/.env.example`, `apps/web/.env.example`, `infra/.env.prod.example`, và các schema trong code (`apps/api/src/config/env-config.ts`, `apps/api/src/lib/runtime-defaults.ts`, `apps/web/src/lib/web-env.ts`).

Cột "Bắt buộc" theo code: **Có** nghĩa là schema hoặc compose báo lỗi khi thiếu.

### Chung và Caddy (compose)

| Biến | Dùng bởi | Dev (`.env.example`) | Production | Bắt buộc | Ghi chú |
|------|----------|----------------------|------------|----------|---------|
| `SITE_ADDRESS` | caddy | `:80` (mặc định compose) | Domain | Prod: Có | `:80` cho HTTP, domain cho HTTPS tự động |
| `SITE_URL` | web | `http://localhost:3000` khi `pnpm dev`; `http://localhost:8080` trong compose | `https://<domain>` | Có | Không có dấu `/` cuối |
| `CADDY_HTTP_PORT` | caddy | 8080 | 80 | Không | Cổng publish của host |
| `CADDY_HTTPS_PORT` | caddy | 8443 | 443 | Không | Cổng publish của host |
| `ALLOWED_ORIGIN` | api | `http://localhost:3000,http://localhost:8080` (host); `http://localhost:8080` (compose) | `https://<domain>` | Có | Danh sách phân tách bằng dấu phẩy. Origin khác bị 403 khi ghi |
| `MEDIA_PUBLIC_BASE_URL` | api, web | `http://localhost:9000/under30ss` khi `pnpm dev` (RustFS trực tiếp); `http://localhost:8080/media` trong compose | `https://<domain>/media` | Có | URL công khai của bucket |
| `MONGO_DB` | api, compose | `under30ss` | `under30ss` | Không | Tên database |
| `MONGO_ROOT_USER` | compose prod | — | Có | Prod: Có | Chỉ dùng khi `MONGO_INITDB_*` (volume trống). Ký tự URL-safe |
| `MONGO_ROOT_PASSWORD` | compose prod | — | Có | Prod: Có | Ký tự URL-safe. Chỉ có tác dụng khi volume trống |
| `S3_BUCKET` | api, rustfs, rustfs-init, caddy | `under30ss` | `under30ss` | Có | |
| `S3_ACCESS_KEY` | rustfs, api, rustfs-init | `change-me-access-key` | Đổi | Có | |
| `S3_SECRET_KEY` | rustfs, api, rustfs-init | `change-me-secret-key-min-8` | Đổi | Có | Tối thiểu 8 ký tự (ghi chú trong `.env.example`) |
| `SESSION_SECRET` | api | Đổi | Đổi | Có | Tối thiểu 32 ký tự. Cũng là khoá ký cookie thiết bị |
| `REVALIDATE_SECRET` | api, web | Đổi | Đổi | Có | Tối thiểu 16 ký tự. Hai phía phải khớp |
| `BACKUP_DIR` | script backup | — | `/var/backups/under30ss` | Không | Mặc định `<repo>/backups` |
| `BACKUP_RETENTION_DAYS` | script backup | — | 14 | Không | Số nguyên không âm |

### API (`apps/api`)

| Biến | Mặc định (code) | Bắt buộc | Ghi chú |
|------|-----------------|----------|---------|
| `NODE_ENV` | `development` | Không | `production` trong compose. Bật `trust proxy` và cookie `secure` mặc định |
| `PORT` | 4000 | Không | |
| `MONGODB_URI` | — | Có | Host dev: `mongodb://localhost:27017/under30ss`. Compose prod tự dựng từ root user và password |
| `SESSION_MAX_AGE_HOURS` | 168 | Không | Thời hạn session |
| `SESSION_COOKIE_SECURE` | Chưa đặt: `true` khi `NODE_ENV=production`, còn lại `false` | Không | Compose dev `false`, compose prod `true`. HTTP mà `true` thì đăng nhập không giữ được |
| `S3_ENDPOINT` | — | Có | URL hợp lệ. Compose: `http://rustfs:9000`. Host dev: `http://localhost:9000` |
| `S3_REGION` | `us-east-1` | Không | |
| `S3_FORCE_PATH_STYLE` | `true` | Không | `true` hoặc `false` |
| `WEB_REVALIDATE_URL` | — | Có | URL hợp lệ. Compose: `http://web:3000/api/revalidate`. Host dev: `http://localhost:3000/api/revalidate` |
| `UPLOAD_MAX_MB` | 10 | Không | Giới hạn mặc định, admin có thể đặt khác trong settings |
| `UPLOAD_MAX_MB_CEILING` | 20 | Không | Trần cho giới hạn admin. Caddy chặn body ở trần + 1 MiB |
| `WEBP_QUALITY` | 82 | Không | 1–100 |
| `IMAGE_MAX_EDGE_MODEL` | 1600 | Không | Cạnh lớn nhất của ảnh người mẫu (px) |
| `IMAGE_MAX_EDGE_ITEM` | 800 | Không | Cạnh lớn nhất của ảnh món (px) |
| `ADMIN_PAGE_SIZE_DEFAULT` | 20 | Không | Phải không vượt `ADMIN_PAGE_SIZE_MAX` |
| `ADMIN_PAGE_SIZE_MAX` | 100 | Không | |
| `PUBLIC_LOOKS_PAGE_SIZE` | 12 | Không | Số outfit mỗi trang `/looks`. Admin có thể đặt khác trong settings. Không vượt `PUBLIC_PAGE_SIZE_MAX` |
| `PUBLIC_RELATED_OUTFITS_COUNT` | 8 | Không | Số outfit ở mục "Outfit khác" trên trang look. Admin có thể đặt khác trong settings. Không vượt `PUBLIC_PAGE_SIZE_MAX` |
| `PUBLIC_PAGE_SIZE_MAX` | 48 | Không | Trần cho `size` của `GET /api/public/outfits` và hai giá trị trên |
| `ADMIN_STATS_RECENT_COUNT` | 5 | Không | Số outfit sửa gần đây ở trang Tổng quan admin |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | 15 | Không | Cửa sổ của cả ba limiter đăng nhập |
| `LOGIN_RATE_LIMIT_MAX_FAILURES` | 5 | Không | Lần sai theo cặp IP + email |
| `LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL` | 50 | Không | Lần sai theo email, mọi IP. Nên đặt cao hơn ngưỡng trên |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP` | 20 | Không | Mọi lần thử theo IP |
| `LOGIN_DEVICE_COOKIE_MAX_AGE_DAYS` | 90 | Không | Thời hạn cookie thiết bị `u30.dev`. Có trong `.env.example`, `apps/api/.env.example` và compose (service api) |
| `ARGON2_MAX_CONCURRENCY` | 2 | Không | Số phép băm/so sánh mật khẩu đồng thời |
| `ARGON2_MAX_QUEUE` | 20 | Không | Số yêu cầu được chờ. Vượt thì 503 |
| `HEALTH_CHECK_TIMEOUT_MS` | 2000 | Không | Timeout ping Mongo của `/api/health` |
| `DEFAULT_SITE_NAME` | `Under30ss` | Không | Chỉ dùng khi chưa lưu settings |
| `DEFAULT_SEO_TITLE` | `Under30ss - Shop the look` | Không | Chỉ dùng khi chưa lưu settings |
| `DEFAULT_SEO_DESCRIPTION` | rỗng | Không | Chỉ dùng khi chưa lưu settings |

### Web (`apps/web`)

| Biến | Mặc định (code) | Bắt buộc | Ghi chú |
|------|-----------------|----------|---------|
| `API_INTERNAL_URL` | — | Có | Compose: `http://api:4000`. Host dev: `http://localhost:4000` |
| `SITE_URL` | — | Có | Dùng cho canonical, sitemap, Open Graph |
| `MEDIA_PUBLIC_BASE_URL` | — | Có | Giống phía API |
| `REVALIDATE_SECRET` | — | Có | Tối thiểu 16 ký tự, khớp API |
| `PUBLIC_REVALIDATE_SECONDS` | 300 | Không | Thời gian tối đa trang public cũ nếu revalidate bị mất |
| `ADMIN_TIME_ZONE` | `Asia/Ho_Chi_Minh` | Không | IANA time zone. Giá trị sai làm các trang đọc env báo lỗi (env được parse khi dùng) |

### Script và kiểm thử (không thuộc ứng dụng)

| Biến | Dùng bởi | Ghi chú |
|------|----------|---------|
| `ENV_FILE` | `backup-mongo-and-bucket.sh` | Mặc định `<repo>/.env.prod` |
| `COMPOSE_PROJECT_NAME` | `backup-mongo-and-bucket.sh` | Tuỳ chọn |
| `E2E_BASE_URL` | Playwright | Mặc định `http://localhost:8080` |
| `E2E_ADMIN_EMAIL` | Playwright | Mặc định `admin@under30ss.local`. Phải là admin có trong DB đang chạy |
| `E2E_ADMIN_PASSWORD` | Playwright | Bắt buộc khi chạy `pnpm e2e`. Chỉ đặt trong shell, không lưu vào file |

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|-----------|
| `Invalid environment configuration` khi api khởi động | Thiếu biến bắt buộc hoặc sai định dạng | Đọc log, mỗi lỗi nằm một dòng dạng `tên_biến: lý do`. Sửa `.env` hoặc `.env.prod` |
| `Invalid web environment configuration` | Thiếu `API_INTERNAL_URL`, `SITE_URL`, `REVALIDATE_SECRET` hoặc `ADMIN_TIME_ZONE` sai | Sửa biến, `up -d --build web` |
| `Failed to build outfit indexes (check for duplicate featured outfits)` | DB có nhiều outfit `featured: true` (thường do dữ liệu khôi phục hoặc chỉnh tay) | API không khởi động có chủ đích. Bỏ cờ `featured` ở các bản dư bằng mongosh, rồi đặt lại một outfit nổi bật từ admin, sau đó khởi động lại api |
| Đăng nhập xong nhưng phiên không giữ được | `SESSION_COOKIE_SECURE=true` khi truy cập qua HTTP | Dev: `SESSION_COOKIE_SECURE=false`. Prod: phải truy cập qua HTTPS |
| Đăng nhập báo `Đăng nhập sai quá nhiều lần` từ thiết bị mới | Limiter theo email đã chạm trần (có thể do người khác thử sai) | Chờ hết `LOGIN_RATE_LIMIT_WINDOW_MINUTES`. Hoặc đăng nhập từ thiết bị đã tin cậy (có cookie `u30.dev`). Hoặc `docker compose ... restart api` (bộ đếm nằm trong bộ nhớ) |
| Đăng nhập báo 503 `Hệ thống đang bận` | Hàng đợi argon2 đầy | Thử lại sau vài giây. Tăng `ARGON2_MAX_CONCURRENCY` hoặc `ARGON2_MAX_QUEUE` nếu lặp lại |
| `401` ở mọi request admin sau khi đăng nhập | Admin đã bị xoá, hoặc session không gửi được cookie | Kiểm tra admin còn trong DB. Kiểm tra cookie `u30.sid` có được gửi |
| Đổi `MONGO_ROOT_PASSWORD` trong `.env.prod` nhưng API không kết nối được | `MONGO_INITDB_*` chỉ áp dụng khi volume mongo trống. Mật khẩu thật nằm trong Mongo | Đổi mật khẩu bên trong Mongo (`db.changeUserPassword`), rồi đồng bộ `.env.prod`. Không xoá volume để "reset" nếu có dữ liệu |
| Volume mongo có từ stack dev (không auth) và prod không lên | Dữ liệu cũ không có user | Xoá volume là mất dữ liệu. Chỉ làm khi đã sao lưu. Hoặc tạo user thủ công trong Mongo |
| Mật khẩu Mongo có ký tự đặc biệt, api không kết nối | Mật khẩu nằm trong URI, ký tự như `@ : / ?` làm URI sai | Dùng mật khẩu chỉ gồm chữ, số, `- _ . ~` |
| Upload ảnh từ Windows lên `localhost:8080` bị treo với file lớn (khoảng 15 MB trở lên) | Relay localhost của WSL2, không phải lỗi app (đã kiểm chứng: cùng request trong mạng Docker chạy ngay) | Thử file nhỏ hơn, hoặc gửi từ trong mạng Docker. Không phải lỗi cần sửa trong app |
| Upload trả 413 `PAYLOAD_TOO_LARGE` | Vượt giới hạn | Admin tăng `uploadMaxMb` trong settings, tối đa `UPLOAD_MAX_MB_CEILING`. Muốn lớn hơn phải đổi `UPLOAD_MAX_MB_CEILING` trong env, rồi rebuild (Caddy tính lại giới hạn body) |
| Upload trả 400 `Tệp không phải ảnh hợp lệ` | Định dạng ngoài JPEG, PNG, WebP, AVIF | Đổi sang định dạng được hỗ trợ |
| Trang public vẫn hiện nội dung cũ | Revalidate lỗi, hoặc chưa tới hạn `PUBLIC_REVALIDATE_SECONDS` | Xem log api tìm `[revalidate]`. Đợi tối đa `PUBLIC_REVALIDATE_SECONDS`, hoặc lưu lại outfit từ admin |
| `pnpm seed:samples` in cảnh báo revalidate thất bại | Đúng hành vi đã biết: web không publish ra host | Không cần xử lý. Trang tự làm mới trong `PUBLIC_REVALIDATE_SECONDS` |
| Outfit không hiện trên public | Đang `draft`, hoặc còn món thiếu link https hoặc anchor | Điền đủ link và anchor cho mọi món rồi publish |
| Đặt nổi bật bị disable hoặc trả 409 cho outfit | Outfit đang `draft` | Publish trước rồi mới đặt nổi bật |
| `/api/health` trả 404 từ ngoài | Đúng thiết kế: Caddy chặn | Kiểm tra từ trong mạng compose (healthcheck dùng `127.0.0.1:4000`) |
| Container api ở trạng thái unhealthy | Mongo không ping được (sai mật khẩu prod, mongo chưa healthy) | `docker compose ... logs api mongo`. Kiểm tra `MONGO_ROOT_*` và `MONGODB_URI` |
| Caddy không cấp được HTTPS | DNS chưa trỏ đúng, hoặc 80/443 không mở | Kiểm tra `dig`/`nslookup` tới domain, kiểm tra firewall. Xem log `caddy` |
| `403 FORBIDDEN` khi ghi từ trình duyệt | Origin không nằm trong `ALLOWED_ORIGIN` | Thêm origin vào `ALLOWED_ORIGIN` (danh sách phân tách bằng dấu phẩy), restart api |
| Không xoá được admin (`409`) | Xoá tài khoản đang đăng nhập, hoặc xoá admin cuối cùng | Tạo admin khác trước, rồi xoá |
| `create-admin` báo email đã có tài khoản | Email trùng (không phân biệt hoa thường) | Dùng email khác, hoặc xoá tài khoản cũ từ admin |
| `pnpm e2e` báo `E2E_ADMIN_PASSWORD is not set` | Chưa đặt biến trong shell | `export E2E_ADMIN_PASSWORD=...` trong shell, không ghi vào file |
| Object cũ vẫn còn trong bucket sau khi xoá outfit | Chưa có tiến trình dọn object (mục L8) | Đã biết, ghi trong roadmap |

## Kiểm tra sau triển khai

Sau mỗi lần deploy, kiểm tra theo thứ tự:

1. `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml --env-file .env.prod ps`: `api`, `web`, `mongo` healthy, `caddy` đang chạy.
2. `docker ps` hoặc `ps` cột PORTS: chỉ `caddy` publish cổng. Mongo và RustFS không có `->` ra host.
3. `https://<domain>/` trả 200 (nếu chưa có outfit nổi bật, trang hiện thông báo trống).
4. `https://<domain>/api/health` trả 404 từ bên ngoài (đúng thiết kế).
5. `https://<domain>/media/` trả 403 (không liệt kê được bucket). Method ghi (ví dụ POST) trả 405.
6. Đăng nhập admin, mở một outfit, lưu, rồi kiểm tra trang public của outfit đó đã cập nhật.
7. Chạy thử sao lưu một lần và kiểm tra thư mục đầu ra.

Chưa kiểm chứng trong v1: bước 3 đến 6 trên HTTPS thật (chưa có VPS và domain). Cookie `secure` qua HTTPS thật chưa được thử.
