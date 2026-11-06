# Phase 02 — Backend API

## Context Links
- [plan.md](./plan.md) · [phase-01 contract](./phase-01-foundation-and-contracts.md)

## Overview
- Priority: P1 · Status: Done — chờ kiểm runtime ở P7 (chưa có Docker, chưa seed thật) · Effort: 14h · Wave 2 (song song P3, P4) · blockedBy: P1
- Hiện thực toàn bộ endpoint trong hợp đồng P1: auth, outfit, settings, admins, media upload S3, gọi revalidate, CLI admin, seed script.

## File Ownership
- `apps/api/src/**` **trừ** `apps/api/src/config/**` (P1)
- `apps/api/test/**`
- Chỉ đọc: `packages/shared/**`, `seed/**` (P3 ghi)

## Key Insights
- Items embed trong outfit (≤30 món, luôn đọc chung).
- Session server-side (connect-mongo) → thu hồi được.
- Upload qua Express (không presigned) để kiểm file + chuẩn hoá WebP một chỗ; lưu `key`, không lưu URL.
- Revalidate lỗi chỉ log, không fail request ghi.

## Requirements
- Đúng path/kiểu trong `packages/shared/src/api-contract.ts`; lỗi trả `ApiErrorBody` (có `fields` cho lỗi validate).
- Public chỉ trả `published`, map sang `PublicOutfitDto` (url ảnh = `MEDIA_PUBLIC_BASE_URL/key`).
- List admin: `q` (regex escaped title/slug), `status`, `page`, `size` (max lấy từ env/settings), sort `updatedAt desc`.
- Featured: chỉ 1 outfit; set mới bỏ cũ.
- Admins: không xoá chính mình, không xoá admin cuối.
- Media: kiểm định dạng qua `sharp().metadata()` (JPEG/PNG/WebP/AVIF), `limitInputPixels`, size ≤ `settings.uploadMaxMb ?? UPLOAD_MAX_MB`; resize `model` cạnh dài ≤2000, `item` ≤800 (giá trị env), `.rotate()`, giữ alpha, WebP `WEBP_QUALITY`, strip EXIF; key `public/{kind}/{yyyy}/{mm}/{uuid}.webp`, `CacheControl: public, max-age=31536000, immutable`.
- Sau ghi outfit/settings → `POST WEB_REVALIDATE_URL` theo `revalidate-contract` với paths `['/', '/look/<slug>', '/sitemap.xml']` (+ slug cũ nếu đổi slug).
- CLI `create-admin` (prompt mật khẩu, không echo).
- `seed-sample-outfits.ts`: đọc `seed/sample-outfits.json` (validate `seed-file-schema`), xử lý ảnh qua image service → S3, upsert theo slug (idempotent). Hiện thực + test với file fixture nhỏ trong `apps/api/test/fixtures/`; chạy với dữ liệu thật ở P7.

## Architecture
```
server.ts → create-app.ts (helmet, json limit, session, origin-check, routes, error handler)
routes/*  → services/* → models/* (mongoose) | storage/s3-client.ts
```
`create-app.ts` export factory để test dùng supertest không cần listen.

## Related Code Files (create)
- `src/server.ts`, `src/create-app.ts`
- `src/db/mongo-connection.ts`
- `src/models/outfit-model.ts`, `admin-user-model.ts`, `settings-model.ts`
- `src/middleware/session-middleware.ts`, `require-admin-middleware.ts`, `origin-check-middleware.ts`, `validate-body-middleware.ts`, `error-handler-middleware.ts`, `login-rate-limit-middleware.ts`
- `src/routes/health-routes.ts`, `auth-routes.ts`, `public-outfit-routes.ts`, `admin-outfit-routes.ts`, `admin-settings-routes.ts`, `admin-user-routes.ts`, `admin-media-routes.ts`
- `src/services/outfit-service.ts`, `public-outfit-mapper.ts`, `settings-service.ts`, `admin-user-service.ts`, `password-service.ts`, `image-processing-service.ts`, `revalidate-web-service.ts`
- `src/storage/s3-client.ts`
- `src/scripts/create-admin-cli.ts`, `src/scripts/seed-sample-outfits.ts`
- `test/**` (vitest + supertest + mongodb-memory-server)

## Implementation Steps
1. Mongo connection + models (unique `slug`, index `status`, `featured`; `email` unique lowercase).
2. create-app + middleware (session cookie httpOnly, secure ở prod, sameSite lax; origin-check cho POST/PUT/DELETE so với `ALLOWED_ORIGIN`; chỉ nhận JSON trừ media).
3. Auth: argon2id, rate-limit theo IP+email, lỗi chung "Email hoặc mật khẩu không đúng".
4. Outfit service + routes public/admin + featured.
5. Settings, admins.
6. S3 client + image service + media route.
7. Revalidate service.
8. CLI create-admin, seed script.
9. Test: auth đúng/sai/rate-limit, CRUD, draft không lộ public, publish thiếu link → 400 có `fields`, upload PNG alpha → WebP alpha, file giả → 400, seed chạy 2 lần không trùng.

## Todo List
- [x] Models + connection
- [x] create-app + middleware
- [x] Auth + rate limit
- [x] Outfit public/admin + featured
- [x] Settings + admins
- [x] S3 + image service + media route
- [x] Revalidate service
- [x] CLI create-admin + seed script
- [x] Tests pass

## Success Criteria
- `pnpm --filter api test` pass; `pnpm --filter api typecheck` sạch.
- [ ] Chạy với compose: upload ảnh xem được qua `/media/...` — chờ P7 (chưa có Docker).
- [x] `pnpm --filter api test` 65/65 pass (nguồn: fix-round-2-api-infra report)

## Risk Assessment
- Featured race → transaction nếu Mongo replica set, không thì 2 lệnh tuần tự (admin ít, chấp nhận).
- Thiếu dep → báo lead (không tự cài).

## Security Considerations
- Không trả `passwordHash`; helmet; body limit; key upload không dùng tên file người dùng; chỉ admin upload; `affiliateUrl` chỉ https.

## Next Steps
- P7 chạy seed thật + e2e.

## Ghi chú đồng bộ 2026-11-06
Đối chiếu với `apps/api/src/**` và reports fix round 1 (inline) + round 2.
- Tên file khác spec: `outfit-mapper.ts` (spec: `public-outfit-mapper.ts`), `seed-samples.ts` (spec: `seed-sample-outfits.ts`), `create-admin.ts` (spec: `create-admin-cli.ts`). Thêm `public-outfit-service.ts`, `lib/semaphore.ts`.
- Test fixture: spec ghi `apps/api/test/fixtures/`, không tồn tại. Ảnh test sinh bằng sharp trong `test/helpers/`.
- `/api/health` ping Mongo, 503 khi mất kết nối (spec: static). Caddy trả 404 cho `/api/health` từ ngoài (chưa kiểm runtime).
- Featured: `findOneAndUpdate` nguyên tử + partial unique index, E11000 thì clear rồi thử lại một lần. Không dùng transaction (spec phương án replica set).
- Revalidate sau settings: gửi `{scope:'all'}` (fix M6), không liệt kê path. Revalidate lỗi chỉ log.
- Upload: giới hạn = `min(settings.uploadMaxMb ?? UPLOAD_MAX_MB, UPLOAD_MAX_MB_CEILING)` (fix M3).
- Đăng nhập: 3 limiter (IP mọi lần thử; IP+email thất bại; email thất bại mọi IP) + semaphore argon2 (`ARGON2_MAX_QUEUE`, quá tải → 503).
- `PUT /api/admin/outfits/:id` bỏ qua `featured` (fix M1). Chỉ `/featured` đổi cờ.
- Lỗi validate field từ shared zod vẫn tiếng Anh (L9 hoãn P7).
- Seed: `published` không đủ điều kiện → lưu `draft`. Cờ `--publish-with-placeholder` bị từ chối khi `NODE_ENV=production`.
- Chưa kiểm runtime: upload thật lên RustFS, seed với `seed/sample-outfits.json` thật, compose healthcheck. Chuyển P7.
