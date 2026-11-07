# Quy chuẩn code Under30ss

Tài liệu này mô tả cấu trúc monorepo và quy ước đang áp dụng trong code. Mọi mục đều đối chiếu với file thật trong repo. Khi quy ước đổi, cập nhật cùng commit.

Liên quan: [Kiến trúc hệ thống](./system-architecture.md) · [Triển khai](./deployment-guide.md)

## Contents
- [Cấu trúc monorepo](#cấu-trúc-monorepo)
- [Đặt tên file](#đặt-tên-file)
- [Kích thước file](#kích-thước-file)
- [Phân lớp và cách tổ chức code](#phân-lớp-và-cách-tổ-chức-code)
- [Hợp đồng dùng chung](#hợp-đồng-dùng-chung-packagesshared)
- [Cấu hình, không fix cứng giá trị nghiệp vụ](#cấu-hình-không-fix-cứng-giá-trị-nghiệp-vụ)
- [Danh sách lọc, tìm kiếm, phân trang](#danh-sách-lọc-tìm-kiếm-phân-trang)
- [Comment](#comment)
- [Commit và nhánh](#commit-và-nhánh)
- [Line ending và file nhị phân](#line-ending-và-file-nhị-phân)
- [Kiểm tra trước khi commit](#kiểm-tra-trước-khi-commit)
- [Kiểm thử](#kiểm-thử)
- [Bảo mật trong code](#bảo-mật-trong-code)

## Cấu trúc monorepo

pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). Các lệnh ở gốc chạy trên mọi workspace.

```
.
├── apps/
│   ├── api/                  # @under30ss/api: Express 5, Mongoose, sharp, S3
│   │   ├── src/
│   │   │   ├── config/       # env-config.ts: schema env (Zod)
│   │   │   ├── db/           # kết nối Mongo, build index
│   │   │   ├── lib/          # tiện ích dùng chung của API (semaphore, device cookie, ...)
│   │   │   ├── middleware/   # session, origin, JSON-only, rate limit, lỗi
│   │   │   ├── models/       # schema Mongoose: outfit, admin-user, settings
│   │   │   ├── routes/       # khai báo route, gọi service
│   │   │   ├── scripts/      # create-admin, seed-samples (chạy bằng tsx hoặc node dist/)
│   │   │   ├── services/     # nghiệp vụ: outfit, media, settings, revalidate, ...
│   │   │   ├── storage/      # client S3
│   │   │   ├── create-app.ts # ghép middleware và route (createApp)
│   │   │   └── server.ts     # điểm vào: nạp env, kết nối Mongo, listen
│   │   ├── test/             # test tích hợp (supertest + mongodb-memory-server)
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── web/                  # @under30ss/web: Next.js 16 (App Router)
│       ├── src/
│       │   ├── app/          # route: /, /look/[slug], /admin/..., /api/revalidate, robots, sitemap
│       │   ├── components/   # admin/, lookbook/, public/
│       │   ├── hooks/admin/  # hook của editor admin
│       │   ├── lib/          # client API (browser/server), SEO, web-env, media-url
│       │   └── styles/       # design-tokens.css (token CSS)
│       ├── test/             # vitest + jsdom + Testing Library
│       ├── Dockerfile
│       └── .env.example
├── packages/
│   └── shared/              # @under30ss/shared: schema Zod, kiểu, hằng API, fixtures
├── infra/
│   ├── caddy/Caddyfile
│   ├── rustfs-init/          # script tạo bucket và policy
│   ├── backup/               # sao lưu Mongo + bucket
│   ├── docker-compose.yml    # stack dev
│   ├── docker-compose.prod.yml
│   └── .env.prod.example
├── e2e/                      # Playwright (spec, teardown, support/)
├── seed/sample-outfits.json  # dữ liệu mẫu
├── scripts/assets/           # script Python/TS xử lý ảnh mẫu và validate seed
├── assets-source/            # ảnh nguồn đã cắt (raw/ bị gitignore)
├── plans/                    # kế hoạch và báo cáo phase
├── docs/                     # tài liệu này
├── .env.example              # env cho docker compose (copy thành .env)
├── playwright.config.ts
├── eslint.config.mjs
└── tsconfig.base.json
```

Thư mục `.claude/`, `.agent/`, `.agents/`, `.cursor/`, `.opencode/` là công cụ AI cục bộ, không thuộc ứng dụng (gitignore).

## Đặt tên file

- Tên file dùng **kebab-case** và mô tả đúng nội dung. Ví dụ `login-rate-limit-middleware.ts`, `device-cookie.ts`, `outfit-editor-toolbar.tsx`, `compute-connector-paths.ts`.
- Test: `*.test.ts` hoặc `*.test.tsx`, đặt trong `src/` (cạnh code) hoặc trong `test/` của workspace.
- Playwright: `*.spec.ts` cho test, `*.teardown.ts` cho dọn dẹp (`e2e/`).
- Ngoại lệ bắt buộc của Next.js: tên file/thư mục quy ước của App Router (`page.tsx`, `layout.tsx`, `route.ts`, `robots.ts`, `sitemap.ts`, `not-found.tsx`), thư mục động `[slug]`, nhóm `(protected)`.
- Module CSS: `*.module.css`. Token CSS dùng chung: `design-tokens.css`.
- Script: kebab-case (`clean-model-lines.py`, `backup-mongo-and-bucket.sh`).
- Tên hàm và biến: camelCase. Kiểu và schema: PascalCase. Hằng: UPPER_SNAKE_CASE (`PUBLIC_KEY_PREFIX`, `ERROR_CODES`).
- Mã lỗi API và giá trị enum: UPPER_SNAKE_CASE (`PAYLOAD_TOO_LARGE`) hoặc chữ thường theo schema (`draft`, `published`).
- Tên biến môi trường: UPPER_SNAKE_CASE. Tiền tố theo nhóm: `LOGIN_RATE_LIMIT_*`, `S3_*`, `ADMIN_*`, `ARGON2_*`.

## Kích thước file

- Mỗi file code dưới **200 dòng**. Vượt ngưỡng thì tách module (hàm tiện ích sang file riêng, nghiệp vụ sang service, component con).
- Ưu tiên composition hơn kế thừa cho component.
- Hiện trạng đo ngày 2026-11-07 bằng `wc -l`: file lớn nhất là `apps/web/src/components/lookbook/lookbook.module.css` (195 dòng). File TypeScript lớn nhất khoảng 183 dòng (`apps/api/test/outfits-admin-crud.test.ts`).
- Lịch sử: các file test vượt 200 dòng đã được tách trong P7 (xem [Lịch sử thay đổi](./project-changelog.md)).

## Phân lớp và cách tổ chức code

### API (`apps/api`)

Luồng xử lý một request: `middleware` → `routes` → `services` → `models`.

- **Route** chỉ parse input (qua `validateBody` hoặc schema query), gọi service, rồi trả JSON. Route không gọi Mongoose trực tiếp.
- **Service** chứa nghiệp vụ và là nơi duy nhất truy cập model. Ví dụ `outfit-service.ts`, `settings-service.ts`, `admin-user-service.ts`.
- **Phụ thuộc bên ngoài được tiêm qua `AppContext`** (`lib/app-context.ts`): `env`, `storage` (interface `ObjectStorage`), `revalidate`. Test thay thế các phụ thuộc này thay vì mock module.
- **Lỗi nghiệp vụ** ném `AppError` (kèm mã và HTTP status) hoặc các helper `badRequest`, `notFound`, `conflict`, `unauthorized`. `error-handler-middleware.ts` đổi thành JSON chuẩn.
- Điểm vào `server.ts` làm các việc khởi động (nạp env, kết nối Mongo, build index, warm-up hash). Lỗi ở bước nào thì thoát tiến trình với mã khác 0.

### Web (`apps/web`)

- Trang public là Server Component. Dữ liệu lấy qua `lib/seo/public-data-loaders.ts` (đã bọc `cache`) và `lib/api-client-server.ts`.
- Admin gọi API qua `lib/api-client-browser.ts` (đường dẫn tương đối, cùng origin). Lỗi API đi qua `api-client-error.ts`.
- Biến môi trường web đọc qua `lib/web-env.ts`, parse lười. Không đọc `process.env` rải rác.
- Không dùng `next/image` tối ưu hoá (`unoptimized: true`, xem `apps/web/next.config.ts`). Lý do ghi trong file config.

### Lookbook

Component lookbook nằm trong `components/lookbook/`. Đường cong connector tính trong `compute-connector-paths.ts` (cubic Bézier). Các giá trị hiển thị (kích thước, tỉ lệ cột, độ cong) nằm trong token ở `styles/design-tokens.css`, không hard-code trong component.

## Hợp đồng dùng chung (`packages/shared`)

- Mọi schema request/response, kiểu DTO, mã lỗi, đường dẫn API (`API_PATHS`, `apiUrl`) và hằng header (`REVALIDATE_SECRET_HEADER`) đều nằm trong `packages/shared/src`. API và web cùng import `@under30ss/shared`.
- Đừng định nghĩa lại kiểu hoặc đường dẫn API ở một workspace khác.
- **Đổi hợp đồng phải báo trước** và cập nhật cả API lẫn web trong cùng thay đổi. Chạy `pnpm typecheck` và `pnpm test` để thấy lệch.
- Cách nạp: typecheck và vitest dùng điều kiện `source` (đọc `src/*.ts` trực tiếp). Runtime (`node dist/...`, build Docker) dùng `dist/`. Sau khi đổi `packages/shared/src`, chạy `pnpm --filter @under30ss/shared build` trước khi chạy runtime trên host. `pnpm dev` và `pnpm build` đã build shared trước.
- Fixtures mẫu cho test: `@under30ss/shared/fixtures` (`packages/shared/src/fixtures`).
- Quy ước chuỗi: thông điệp lỗi cho người dùng viết tiếng Việt; tên trường, mã lỗi và khoá JSON viết tiếng Anh.

## Cấu hình, không fix cứng giá trị nghiệp vụ

Giá trị nghiệp vụ (giới hạn upload, ngưỡng rate limit, số trang, múi giờ, thời gian cache, tên site) không được hard-code. Chúng nằm ở một trong ba nơi, ưu tiên theo thứ tự:

1. **Settings trong DB** (admin sửa trên UI): tên site, SEO, OG image, `uploadMaxMb`.
2. **Biến môi trường** có schema: `apps/api/src/config/env-config.ts`, `apps/web/src/lib/web-env.ts`, tham số tuỳ chọn trong `apps/api/src/lib/runtime-defaults.ts`.
3. **Compose**: giá trị mặc định cho các biến trong `infra/docker-compose.yml` (dạng `${VAR:-default}`).

Ngoại lệ là guard kỹ thuật, không phải giá trị nghiệp vụ (ví dụ `MAX_INPUT_PIXELS` 100 triệu, `REVALIDATE_TIMEOUT_MS` 3000, `JSON_BODY_LIMIT` 1 MB, `MAX_PATHS` 50). Ngoại lệ phải có lý do ghi trong code.

**Checklist khi thêm một biến môi trường mới:**

- [ ] Thêm vào schema (`env-config.ts` hoặc `web-env.ts`), hoặc vào `runtime-defaults.ts` nếu là tham số tuỳ chọn.
- [ ] Thêm vào `.env.example` ở gốc (nếu compose dùng) và/hoặc `apps/api/.env.example`, `apps/web/.env.example`.
- [ ] Thêm vào `environment:` của service trong `infra/docker-compose.yml`. Compose prod kế thừa, không cần thêm trừ khi cần ghi đè.
- [ ] Thêm vào `infra/.env.prod.example` nếu là biến production bắt buộc hoặc cần đổi theo môi trường.
- [ ] Cập nhật bảng trong [Triển khai](./deployment-guide.md#tham-chiếu-biến-môi-trường).

## Danh sách lọc, tìm kiếm, phân trang

- Query, lọc, sắp xếp và phân trang làm ở **server**. Admin gọi `GET /api/admin/outfits?q&status&page&size` và nhận đúng một trang. Không kéo toàn bộ dữ liệu về trình duyệt rồi lọc bằng JS.
- Kích thước trang mặc định và tối đa lấy từ `ADMIN_PAGE_SIZE_DEFAULT` và `ADMIN_PAGE_SIZE_MAX`.
- Tương tác nhỏ (ô tìm kiếm, phân trang) dùng form hoặc link để server dựng lại kết quả.

## Comment

- Comment viết **tiếng Anh**, và chỉ khi cần giải thích **vì sao** (ràng buộc, workaround, lỗi thư viện, invariant). Không comment lại điều code đã nói rõ.
- Không viết JSDoc cho hàm đơn giản. Chỉ viết cho API public hoặc hành vi có điểm bất ngờ.
- Không dùng comment chia khu (`// ===== ... =====`) và không ghi lịch sử sửa đổi trong comment.
- Một số file cũ còn comment tiếng Việt. Không dịch hàng loạt. Comment mới viết tiếng Anh.

## Commit và nhánh

- Commit message **tiếng Anh**, theo Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Không nhắc tới công cụ AI trong commit message, PR hoặc comment.
- Ví dụ thật từ lịch sử repo:
  - `fix: harden login limiter with device cookie and ensure outfit indexes`
  - `feat: add production compose override and mongo/bucket backup script`
  - `test: add Playwright e2e for admin flow, public lookbook and visuals`
- Mỗi commit chỉ chứa thay đổi của một mục đích. Không commit file môi trường, khoá, mật khẩu, `.env*` (trừ `.env.example`, `infra/.env.prod.example`).
- Nhánh chính là `main`.

## Line ending và file nhị phân

- `.gitattributes`: `* text=auto eol=lf`. Mọi file text lưu với LF, kể cả script shell.
- Nhị phân được khai báo `binary`: `*.png`, `*.jpg`, `*.webp`, `*.onnx`.
- Script shell trong repo (`infra/backup/backup-mongo-and-bucket.sh`) phải giữ LF. Lưu ý quyền thực thi: xem [Triển khai, mục sao lưu](./deployment-guide.md#sao-lưu).

## Kiểm tra trước khi commit

Chạy ở gốc repo:

| Lệnh | Nội dung |
|------|----------|
| `pnpm lint` | `eslint .` (cấu hình `eslint.config.mjs`) |
| `pnpm typecheck` | `pnpm -r typecheck` cho từng workspace, rồi `tsc -p tsconfig.json` (gồm `e2e/` và `playwright.config.ts`) |
| `pnpm test` | `pnpm -r test`: shared, api, web |
| `pnpm e2e` | Playwright, cần stack đang chạy (xem [Kiểm thử](#kiểm-thử)) |

Quy tắc: không bỏ qua test đang fail để qua build. Không dùng mock thay cho hành vi thật ở test tích hợp và e2e.

## Kiểm thử

| Phạm vi | Công cụ | Vị trí | Số test (2026-11-07) |
|---------|---------|--------|----------------------|
| `packages/shared` | Vitest | `packages/shared/src/**/*.test.ts` | 32 |
| `apps/api` | Vitest, supertest, mongodb-memory-server | `apps/api/src/**/*.test.ts`, `apps/api/test/**/*.test.ts` | 83 |
| `apps/web` | Vitest, jsdom, Testing Library | `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/test/**/*.test.{ts,tsx}` | 166 |
| E2E | Playwright (Chromium) | `e2e/*.spec.ts`, `e2e/cleanup.teardown.ts` | 17 |

Chi tiết:

- **API.** `apps/api/vitest.config.ts` dùng `globalSetup: test/setup/shared-mongod-global-setup.ts`. Một MongoDB in-memory được khởi động cho cả lần chạy, nên test không cần Mongo thật. Test HTTP dùng supertest trên `createApp`.
- **Web.** `environment: jsdom`, `globals: true`, setup `apps/web/test/setup.ts`. Alias `@/` trỏ tới `apps/web/src`.
- **E2E.** `playwright.config.ts` ở gốc, `testDir: e2e`, `baseURL` mặc định `http://localhost:8080`. Config không tự khởi động server, stack phải chạy sẵn.
  - Project `admin-flow` tạo outfit qua UI. `public` phụ thuộc `admin-flow` (kiểm link, hover, viewport 390 và 320 px, chế độ không JS, 404). `visual` chụp ảnh so với ảnh mẫu. `cleanup` là teardown: xoá outfit test qua API.
  - Biến môi trường: `E2E_ADMIN_PASSWORD` (bắt buộc, không có giá trị mặc định, không lưu trong repo), `E2E_ADMIN_EMAIL` (mặc định `admin@under30ss.local`), `E2E_BASE_URL` (mặc định `http://localhost:8080`).
  - Test chỉ đăng nhập thành công, không thử sai, nên không chạm rate limit. Mỗi lần chạy tốn hai lần đăng nhập thành công (`admin-flow` và `cleanup`). Playwright chạy `retries: 0`.
- **Lighthouse.** Mục tiêu SEO và accessibility ≥ 95 (kế hoạch P7). Lần đo gần nhất 2026-11-06 cho 100 ở cả hai, trên `/` và `/look/dramatic`, desktop và mobile. Không có script tự động trong repo, chạy tay bằng Lighthouse CLI.

## Bảo mật trong code

- Secret chỉ đi qua biến môi trường. Không ghi vào repo, không đặt trong `*.example`.
- Mật khẩu admin không nhận qua tham số dòng lệnh. `create-admin` từ chối cờ `--password` và hỏi mật khẩu qua prompt (ẩn khi có TTY).
- Mọi input đi qua schema Zod ở biên (`validateBody`, schema query, schema body upload). Không tin dữ liệu từ client.
- Ảnh được decode và encode lại bằng sharp, không lưu file gốc. Chỉ nhận định dạng cho phép.
- Key object S3 công khai phải nằm dưới `public/`. Mọi đường ghi chỉ qua API.
- Dùng `timingSafeEqual` cho so sánh secret và chữ ký. Dùng `crypto.randomUUID` cho key ảnh.
- Thông báo lỗi 500 không lộ stack hay chi tiết nội bộ cho client.
