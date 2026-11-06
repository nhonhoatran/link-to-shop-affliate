# Phase 01 — Foundation & contracts

## Context Links
- [plan.md](./plan.md) · [brainstorm](../reports/brainstorm-261106-1201-under30ss-shop-the-look.md)

## Overview
- Priority: P1 · Status: Done — chờ kiểm runtime ở P7 (chưa có Docker) · Effort: 7h · Wave 1 (tuần tự, chặn mọi phase khác)
- Dựng khung monorepo, compose, cài **toàn bộ** dependency, chốt hợp đồng chung (zod schema, API contract, design tokens, API client) để wave 2–3 chạy song song không đụng file.

## File Ownership
Xem bảng P1 trong [plan.md](./plan.md#file-ownership-matrix). Sau phase này các file đó đóng băng.

## Key Insights
- MinIO CE hết bảo trì → mặc định RustFS (Apache-2.0, GA 1.0 2026-09-16); code chỉ dùng S3 API.
- Caddy gộp 1 domain → không CORS, cookie session dùng chung.
- Cài hết deps ở đây để `pnpm-lock.yaml` chỉ 1 phase sở hữu.
- Project mới chưa có pattern UI → chạy `ui-consistency:finding-patterns` để ghi checklist + design tokens dùng cho P4/P5/P6.

## Requirements

### 1. Monorepo & hạ tầng
- pnpm workspace `apps/*`, `packages/*`; `apps/web` (Next.js App Router, TS, `src/`, CSS Modules), `apps/api` (Express TS, `tsx watch` dev, `tsc` build), `packages/shared`.
- `infra/docker-compose.yml`: mongo, rustfs (verify image `rustfs/rustfs` + env user/pass trong README chính chủ), job init bucket + policy public-read prefix `public/`, api, web, caddy.
- Caddy: `/api/*` → api:4000, `/media/*` → rustfs:9000 (strip `/media`), còn lại → web:3000.

### 2. Dependencies (cài hết ở đây)
- api: express, express-session, connect-mongo, mongoose, argon2, helmet, express-rate-limit, multer, sharp, @aws-sdk/client-s3, zod; dev: tsx, typescript, vitest, supertest, mongodb-memory-server, @types/*.
- web: next, react, react-dom, zod, @dnd-kit/core, @dnd-kit/sortable; dev: vitest, @testing-library/react, @testing-library/user-event, jsdom, @playwright/test.
- shared: zod.
- Kiểm license (MIT/Apache) + bản hiện hành từng gói.

### 3. Env (`apps/api/src/config/env-config.ts`, zod parse, thiếu là crash sớm)
api: `MONGODB_URI`, `SESSION_SECRET`, `SESSION_MAX_AGE_HOURS`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`, `MEDIA_PUBLIC_BASE_URL`, `WEB_REVALIDATE_URL`, `REVALIDATE_SECRET`, `UPLOAD_MAX_MB`, `WEBP_QUALITY`, `ALLOWED_ORIGIN`.
web: `API_INTERNAL_URL`, `SITE_URL`, `MEDIA_PUBLIC_BASE_URL`, `REVALIDATE_SECRET`.

### 4. Hợp đồng `packages/shared`
- `outfit-schemas.ts`: `anchorSchema`, `imageRefSchema`, `outfitItemSchema`, `outfitInputSchema` (refine: `published` thì mọi món phải có `affiliateUrl`), `outfitSchema` (+ `id`, `updatedAt`).
- `public-outfit-dto.ts`: `PublicOutfitDto` = outfit published, ảnh đã có `url` tuyệt đối, items sort sẵn theo side+order.
- `settings-schemas.ts`, `auth-schemas.ts` (login input, `AdminUserDto`).
- `seed-file-schema.ts`: định dạng `seed/sample-outfits.json` (P3 ghi, P2 đọc).
- `api-contract.ts`: hằng path + kiểu request/response từng endpoint; `ApiErrorBody = { error: { code: string; message: string; fields?: Record<string,string> } }`.
- `revalidate-contract.ts`: `POST /api/revalidate`, header `x-revalidate-secret`, body `{ paths: string[] }`.
- `slugify-vietnamese.ts` (+ unit test).
- `fixtures/sample-public-outfit.ts`: 1 outfit mẫu hợp lệ (validate bằng schema) cho test component P4/P5/P6.

Schema chính:
```ts
export const anchorSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
export const imageRefSchema = z.object({ key: z.string().min(1), width: z.number().int().positive(), height: z.number().int().positive() });
export const outfitItemSchema = z.object({
  id: z.string(), name: z.string().min(1).max(80), subtitle: z.string().max(80).optional(),
  description: z.string().max(240).optional(), image: imageRefSchema,
  side: z.enum(['left', 'right']), order: z.number().int().min(0), anchor: anchorSchema,
  affiliateUrl: z.union([z.string().url().startsWith('https://'), z.literal('')]),
});
```

API endpoints (P2 hiện thực, P5/P6 gọi):
| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | — |
| POST | `/api/auth/login`, `/api/auth/logout` · GET `/api/auth/me` | — / session |
| GET | `/api/public/outfits/featured`, `/api/public/outfits/:slug`, `/api/public/outfits/slugs`, `/api/public/settings` | public |
| GET | `/api/admin/outfits?q=&status=&page=&size=` → `{items,total,page,size}` | session |
| POST · GET · PUT · DELETE | `/api/admin/outfits[/:id]` | session |
| POST | `/api/admin/outfits/:id/featured` | session |
| GET · PUT | `/api/admin/settings` | session |
| GET · POST · DELETE | `/api/admin/admins[/:id]` | session |
| POST | `/api/admin/media?kind=model\|item` multipart `file` → `{key,width,height,url}` | session |

### 5. Web nền
- `app/layout.tsx`: `lang="vi"`, Be Vietnam Pro (`next/font/google`, subsets vietnamese+latin), import tokens.
- `styles/design-tokens.css`: màu (chữ #111, mô tả ~#444, đường chỉ #222, nền #fff), font size `clamp()`, spacing, motion (duration, dim opacity, hover scale) — đo từ ảnh mẫu.
- `lib/api-client-server.ts` (fetch `API_INTERNAL_URL`, forward cookie khi cần, `next.tags`), `lib/api-client-browser.ts` (fetch `/api`, JSON, parse `ApiErrorBody`), `lib/media-url.ts`.
- `next.config.ts`: `images.remotePatterns` từ `MEDIA_PUBLIC_BASE_URL`.

### 6. Test config
- `vitest.config.ts` cho api (node), web (jsdom, `test/setup.ts` nạp `@testing-library/jest-dom` nếu dùng), shared — để P2/P4/P5/P6 chỉ viết file test trong thư mục của mình.

### 7. Scripts root
`dev`, `build`, `lint`, `typecheck`, `test`, `e2e`, `seed:samples` (→ api), `create-admin` (→ api).

## Implementation Steps
1. Workspace + 3 package + tsconfig base strict.
2. Cài toàn bộ deps mục 2; commit lockfile vào ownership P1.
3. Env config api + web, `.env.example`.
4. Compose + Caddy + bucket init.
5. `ui-consistency:finding-patterns` → checklist + design tokens.
6. Shared contracts + fixture + test schema (slug sai, anchor >100, link `http:`/`javascript:` bị chặn, publish thiếu link bị chặn).
7. Layout, API clients, media-url, next.config.
8. `pnpm typecheck && pnpm test` sạch.

## Todo List
- [x] Workspace + tsconfig
- [x] Cài toàn bộ deps
- [x] Env config + `.env.example`
- [x] Compose + Caddy + bucket init (viết xong; chờ P7 — chưa có Docker)
- [x] Design tokens (`styles/design-tokens.css`)
- [x] `ui-consistency:finding-patterns` đã chạy 2026-11-06; checklist không ghi file (theo skill) mà đưa thẳng vào đề bài P4/P5/P6, verifying đã calibrate + kiểm 3 loại trang
- [x] Shared schemas + contract + fixture + tests
- [x] Web layout + API clients + next.config
- [x] Typecheck + test sạch (+ build + lint sạch)

## Success Criteria
- [ ] `docker compose up mongo rustfs caddy` chạy; file test trong bucket xem được qua `/media/...` — chờ P7 (chưa có Docker).
- `pnpm typecheck`, `pnpm test` (shared) pass.
- Hợp đồng đủ để P2–P6 làm mà không cần sửa file P1.

## Risk Assessment
- Hợp đồng thiếu → phase sau phải sửa file P1 → báo lead, lead sửa tuần tự (không để 2 agent sửa).
- `sharp` trên Alpine → api Dockerfile dùng Debian slim.

## Security Considerations
- `.env*` trong `.gitignore` (trừ example). Mongo/RustFS chỉ network nội bộ.

## Next Steps
- Mở wave 2: P2, P3, P4 song song. Git init: hỏi account GitHub trước.

## Ghi chú đồng bộ 2026-11-06
Đối chiếu với code (nguồn: `packages/shared/src/outfit-schemas.ts`, `apps/web/next.config.ts`, `infra/caddy/Caddyfile`, `.env.example`, fix-round-2 reports).
- `next.config.ts`: spec ghi `images.remotePatterns`; code dùng `images.unoptimized: true` (fix H2, container không tới được `localhost`).
- `anchor` trong `outfitItemSchema` là optional (spec ghi required). Publish vẫn bắt buộc anchor (`outfit-schemas.ts:47`).
- Env thêm ngoài spec: `SESSION_COOKIE_SECURE`, `UPLOAD_MAX_MB_CEILING`, `ARGON2_MAX_QUEUE`, `LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL`, `LOGIN_RATE_LIMIT_*`, `DEFAULT_SITE_NAME`/`DEFAULT_SEO_*`, `PUBLIC_REVALIDATE_SECONDS`, `ADMIN_TIME_ZONE`. Cần bổ sung vào danh sách mục 3 khi đóng phase.
- Fixture nằm tại `packages/shared/src/fixtures/sample-public-outfit.ts`, export `samplePublicOutfit` (spec ghi `fixtures/sample-public-outfit.ts`, đúng đường dẫn tương đối).
- TypeScript ghim 6.0.3 (không dùng 7) vì typescript-eslint 8.72.1 chưa hỗ trợ (theo phase-01 report, mục 10).
- `ui-consistency:finding-patterns`: đã chạy; checklist nằm trong đề bài giao P4/P5/P6, không ghi file.
- Chưa kiểm runtime: `docker compose up`, Dockerfile build, RustFS public-read policy (`infra/rustfs-init/init-bucket.sh`), Caddy rewrite `/media`. Chuyển P7.
- Sửa ngoài ownership qua fix round: `apps/web/src/lib/web-env.ts`, `styles/design-tokens.css`, `app/globals.css`.
