# Fix round 2: API / infra / shared

## Per item
1. N1 login limiter: `apps/api/src/middleware/login-rate-limit-middleware.ts`, `lib/runtime-defaults.ts`. Three limiters: per-IP all attempts (unchanged); per `IP|email` failures (`LOGIN_RATE_LIMIT_MAX_FAILURES`, 5); per-email failures all IPs (`LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL`, 50). Tests `test/auth-rate-limit.test.ts`: rotating emails blocked (kept); one email from many IPs blocked only at loose threshold (set 3 in test); attacker 5 failures -> 6th and even right password 429, owner from fresh IP -> 200.
2. M7: `PUBLIC_REVALIDATE_SECONDS` (300) and `ADMIN_TIME_ZONE` (Asia/Ho_Chi_Minh) in compose `web.environment` + root `.env.example`. Names match `apps/web/src/lib/web-env.ts`.
3. Featured: `services/outfit-service.ts`. `applyFeatured(true)` = atomic `findOneAndUpdate({_id, status:'published'})`. Deviation: partial unique index rejects a second `featured:true`, so order is set-first; on E11000 clear others then retry once (never clears others for a missing/draft target). null -> `exists` ? 409 "Chỉ đặt nổi bật cho outfit đã đăng" : 404. Second clash -> 409 race msg. `updateOutfit` writes no `featured` except `featured:false` when status = draft. Tests in `test/outfits.test.ts`: concurrent feature of 2 outfits keeps exactly 1 featured; race-conflict test re-pointed to `findOneAndUpdate`; existing 404/409/draft-clears tests pass.
4. M1: `outfitUpdateSchema` (+ `OutfitUpdateInput`) in shared = `outfitBaseSchema.omit({featured})` then `superRefine`; `UpdateOutfitRequest = OutfitUpdateInput`; PUT validates with it. Zod 4 `z.object` strips unknown keys by default (docs below), so no `.strip()` needed; shared test proves a stale `featured:true` is accepted and dropped. `outfitInputSchema`/`OutfitInput` unchanged.
5. Semaphore: `createSemaphore(limit, {maxQueue, onFull})`; `ARGON2_MAX_QUEUE` (20); `password-service` maps full to `AppError(503, INTERNAL_ERROR, "Hệ thống đang bận, vui lòng thử lại sau")` (same code health 503 uses; no new ErrorCode). `verifyPassword` now only swallows argon2 errors inside the task so 503 propagates. Tests: `lib/semaphore.test.ts` (overflow rejects, then recovers), `services/password-service.test.ts` (503 message/status).
6. `dummyHash` reset on rejection (only if still the cached promise). Test: first hash rejects, second call retries (hash called 2x); success is cached.
7. Caddy: `handle_errors 413` returns JSON `{"error":{"code":"PAYLOAD_TOO_LARGE","message":"Ảnh vượt quá dung lượng cho phép"}}` with Content-Type application/json. Caddyfile placeholders cannot do arithmetic, so `max_size {$UPLOAD_BODY_MAX_MB:21}MiB`, and the caddy service gets `entrypoint /bin/sh -c` + command `UPLOAD_BODY_MAX_MB=$$((UPLOAD_MAX_MB_CEILING + 1)) exec caddy run ...` (one source of truth: the ceiling). UNVERIFIED at runtime (no Docker).
8. Removed `MEDIA_PUBLIC_BASE_URL` ARG/ENV + usage comment from `apps/web/Dockerfile` and `web.build.args` in compose. `apps/web/next.config.ts` has no env reads (grep "MEDIA|env" empty); the var is still passed at runtime via `web.environment`.
9. Compose comment on `SESSION_COOKIE_SECURE`: HTTPS deployments must set true (P7 prod compose does).
10. Caddyfile: `@health path /api/health /api/health/*` -> `respond @health 404`, placed before `handle /api/*`. Compose healthcheck hits `127.0.0.1:4000` inside the api container, unaffected.
11. Test infra: `apps/api/test/setup/shared-mongod-global-setup.ts` (one MongoMemoryServer, `launchTimeout` 120 s, `project.provide('mongoBaseUri')`, stopped in teardown); `vitest.config.ts` `globalSetup`; `test/helpers/test-app.ts` uses `inject('mongoBaseUri')` + unique db `under30ss-test-<uuid>` per `startTestApp`, drops it in `stop()`.

## New env vars
`LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL` (50), `ARGON2_MAX_QUEUE` (20): documented in `apps/api/.env.example`, root `.env.example`, compose api env. `PUBLIC_REVALIDATE_SECONDS`, `ADMIN_TIME_ZONE`: root `.env.example` + compose web. `UPLOAD_BODY_MAX_MB`: derived inside the caddy container only (not user-set). `LOGIN_RATE_LIMIT_MAX_FAILURES` meaning changed to per IP+email (comments updated).

## Docs
- Zod objects strip unknown keys: https://zod.dev/api?id=objects
- Caddy handle_errors (status code args, `{err.status_code}`): https://caddyserver.com/docs/caddyfile/directives/handle_errors
- Caddy request_body max_size (413, go-humanize sizes): https://caddyserver.com/docs/caddyfile/directives/request_body
- Not confirmed from docs: `header` inside `handle_errors` and `MiB` unit (go-humanize supports it; page lists only `MB` examples; the old config already used `MiB`).

## Verification
- shared test 32/32, build ok; api typecheck ok, test 65/65, build ok; `pnpm lint` clean.
- Root `pnpm test`, 5 consecutive runs, all exit 0, each: shared 2 files / 32 passed; api 9 files / 65 passed; web 27 files / 164 passed.

## Notes
- Files edited were CRLF in places (env examples, compose, Dockerfile, outfit-service); line endings preserved.
- Residual: attacker spreading 50 failures/15 min across IPs on one email can still lock it (loose limiter, by design D-trade-off).
- Residual: in `applyFeatured`, if the target is unpublished between the clear and the retry write, others are cleared and 409 is returned (microsecond window).

**Status:** DONE_WITH_CONCERNS
**Summary:** All 11 items done; shared/api tests, typecheck, build, lint pass; 5/5 consecutive root `pnpm test` runs green.
**Concerns:** Caddy 413 JSON + the sh-computed `UPLOAD_BODY_MAX_MB` entrypoint are config-only, untested (no Docker); featured flow sets-first-then-clears on unique clash (spec wording "then clear others" interpreted that way due to the partial unique index).
