# Phase 02 report: Backend API

## Verification (run at repo root)
- `pnpm --filter @under30ss/api typecheck` -> `tsc -p tsconfig.json --noEmit`, no errors
- `pnpm --filter @under30ss/api test` -> `Test Files 5 passed (5)`, `Tests 38 passed (38)`
- `pnpm --filter @under30ss/api build` -> `tsc -p tsconfig.build.json`, no errors; `require('dist/create-app')` loads (connect-mongo named import OK in CJS)
- `pnpm lint` -> `eslint .`, no output (clean)
- CLI smoke: `create-admin --password x` -> refused; piped short password -> zod error. Real DB write not run.
- Not run: compose upload to RustFS (Docker not installed, deferred to P7), `seed-samples` against real S3/`seed/` (P3 not delivered yet).

## Endpoints
All errors: `{error:{code,message,fields?}}`. All write methods go through origin check (403 FORBIDDEN on mismatch when Origin header present) and JSON-only check (415 UNSUPPORTED_MEDIA_TYPE, except multipart on media). Body > 1mb -> 413 PAYLOAD_TOO_LARGE; bad JSON -> 400.

| Method Path | Auth | Success | Errors |
|---|---|---|---|
| GET /api/health | none | 200 `{status:'ok'}` | - |
| POST /api/auth/login | none, rate-limited | 200 AdminUserDto (+session cookie `u30.sid`) | 400 VALIDATION_ERROR, 401 UNAUTHORIZED ("Email hoặc mật khẩu không đúng"), 429 RATE_LIMITED, 403, 415 |
| POST /api/auth/logout | none | 204 | 403 |
| GET /api/auth/me | admin | 200 AdminUserDto | 401 |
| GET /api/public/outfits/featured | none | 200 PublicOutfitDto | 404 NOT_FOUND (none featured, or featured one is draft) |
| GET /api/public/outfits/slugs | none | 200 `{items:[{slug,updatedAt}]}` | - |
| GET /api/public/outfits/:slug | none | 200 PublicOutfitDto | 404 (missing or draft) |
| GET /api/public/settings | none | 200 PublicSettingsDto | - |
| GET /api/admin/outfits?q&status&page&size | admin | 200 Paginated<AdminOutfitListItemDto> | 400 (bad query), 401 |
| POST /api/admin/outfits | admin | 201 AdminOutfitDto | 400 (fields e.g. `items.1.affiliateUrl`, `modelImage.key`), 401, 409 CONFLICT (`fields.slug`) |
| GET /api/admin/outfits/:id | admin | 200 | 401, 404 (also malformed id) |
| PUT /api/admin/outfits/:id | admin | 200 | 400, 401, 404, 409 |
| DELETE /api/admin/outfits/:id | admin | 204 | 401, 404 |
| POST /api/admin/outfits/:id/featured `{featured}` | admin | 200 AdminOutfitDto | 400, 401, 404 |
| GET /api/admin/settings | admin | 200 (env defaults if none saved) | 401 |
| PUT /api/admin/settings | admin | 200 | 400, 401 |
| GET /api/admin/admins | admin | 200 `{items}` | 401 |
| POST /api/admin/admins | admin | 201 AdminUserDto | 400, 401, 409 (`fields.email`) |
| DELETE /api/admin/admins/:id | admin | 204 | 401, 404, 409 (self, or last admin) |
| POST /api/admin/media?kind=model\|item (multipart `file`) | admin | 201 `{key,width,height,url}` | 400 (bad kind, missing/fake file; `fields.file`/`fields.kind`), 401, 413 PAYLOAD_TOO_LARGE |

Unknown route -> 404 NOT_FOUND. Unknown error -> 500 INTERNAL_ERROR (logged). Error codes used: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, PAYLOAD_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE, INTERNAL_ERROR (all of `ERROR_CODES`).

Behaviour notes:
- Session: express-session + connect-mongo (reuses mongoose client, collection `sessions`), cookie httpOnly, sameSite lax, secure in production, session id regenerated on login. `requireAdmin` checks the DB each request, so deleting an admin revokes access instantly.
- argon2id hashing; unknown-email login burns a dummy verify (timing).
- Rate limit: failed logins only, key = IP (ipKeyGenerator) + lowercased email.
- Featured: partial unique index + clear-others-then-set. Works on create, update and the dedicated endpoint.
- Image keys outside `public/` rejected (400) in outfits and settings.ogImage.
- Revalidate after outfit create/update/delete/featured: `['/', '/look/<slug>', '/sitemap.xml']` (+ old slug on rename). After settings update: `/`, `/sitemap.xml` and every published slug. POST with `x-revalidate-secret`, 3s timeout, failures only `console.warn`, request never fails.
- Media: sharp metadata check (jpeg/png/webp/AVIF), 100M pixel guard, `.rotate()`, resize inside (no enlarge), WebP at `WEBP_QUALITY`, metadata stripped, alpha kept. Key `public/{kind}/{yyyy}/{mm}/{uuid}.webp`, `CacheControl: public, max-age=31536000, immutable`. Size limit = `settings.uploadMaxMb ?? UPLOAD_MAX_MB`.

## Env vars read
Required schema (`config/env-config.ts`): NODE_ENV, PORT, MONGODB_URI, SESSION_SECRET, SESSION_MAX_AGE_HOURS, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_FORCE_PATH_STYLE, MEDIA_PUBLIC_BASE_URL, WEB_REVALIDATE_URL, REVALIDATE_SECRET, UPLOAD_MAX_MB, WEBP_QUALITY, IMAGE_MAX_EDGE_MODEL, IMAGE_MAX_EDGE_ITEM, ADMIN_PAGE_SIZE_DEFAULT, ADMIN_PAGE_SIZE_MAX, ALLOWED_ORIGIN (comma list allowed).
New optional vars read directly from `process.env` in `src/lib/runtime-defaults.ts` (not in the env schema or `.env.example`, which P1 owns):
- LOGIN_RATE_LIMIT_WINDOW_MINUTES (default 15), LOGIN_RATE_LIMIT_MAX_FAILURES (default 5)
- DEFAULT_SITE_NAME (default "Under30ss"), DEFAULT_SEO_TITLE (default "Under30ss - Shop the look"), DEFAULT_SEO_DESCRIPTION (default "") : used only when no settings document exists

## Files
Created under `apps/api/src`:
- `server.ts`, `create-app.ts`
- `db/mongo-connection.ts`
- `lib/`: `app-error.ts`, `app-context.ts`, `object-id.ts`, `runtime-defaults.ts`, `load-dotenv.ts`, `zod-fields.ts`
- `models/`: `outfit-model.ts`, `admin-user-model.ts`, `settings-model.ts`
- `middleware/`: `session-`, `require-admin-`, `origin-check-`, `json-only-`, `validate-body-`, `login-rate-limit-`, `error-handler-` `...-middleware.ts`
- `routes/`: `health-`, `auth-`, `public-outfit-`, `admin-outfit-`, `admin-settings-`, `admin-user-`, `admin-media-` `...-routes.ts`
- `services/`: `outfit-service.ts`, `outfit-mapper.ts`, `public-outfit-service.ts`, `settings-service.ts`, `admin-user-service.ts`, `password-service.ts`, `image-processing-service.ts`, `media-service.ts`, `revalidate-web-service.ts`, `seed-service.ts`
- `storage/s3-client.ts`
- `scripts/`: `create-admin.ts`, `seed-samples.ts`, `terminal-prompt.ts`

Created under `apps/api/test`: `auth.test.ts`, `outfits.test.ts`, `media-settings-admins.test.ts`, `seed.test.ts`, `helpers/test-app.ts`, `helpers/outfit-payloads.ts`. No binary fixtures (PNGs generated with sharp). Largest source file 106 lines. Edited: `plans/261106-1201-under30ss-shop-the-look/phase-02-backend-api.md` (todos ticked; compose criterion left unchecked, noted "Docker not installed"). No dependency/package.json/lockfile/config/shared edits.

## Tests (38 total incl. 4 pre-existing env-config)
- auth (8): health; login ok + cookie flags + no hash + me/logout; generic message for wrong pw / unknown email; malformed body fields; admin routes need session; deleted admin loses access; cross-origin 403 + form 415; rate limit 3 fails -> 429 (other email unaffected)
- outfits (11): CRUD with media urls; 404 malformed/unknown id; publish with missing link -> 400 `items.1.affiliateUrl`; http link + non-public key rejected; duplicate slug 409; single featured (create/endpoint/update); list q (regex-escaped)/status/page/size cap; drafts hidden + public DTO sorted; featured 404 when none/draft; revalidate paths + secret + old slug (real local HTTP receiver); web 500 does not fail write
- media-settings-admins (11): PNG alpha -> WebP alpha with exact PutObject input (Bucket, Key, ContentType, CacheControl, no EXIF); edge limits no enlarge; JPEG + hostile filename ignored; fake file/bad kind/no file/anonymous; size limit from settings -> 413; settings defaults/save/public view/clear/validation; admins create/dup/weak/list/delete/self-delete refused
- seed (5): idempotent re-run (1 doc, same content-addressed keys `public/{kind}/seed/<sha256-24>.webp`); real processed dimensions stored; published without links saved as draft; `--publish-with-placeholder` keeps published, refused when NODE_ENV=production; missing and path-escaping image files fail clearly
- Fakes: only the S3 sender (`send`) boundary; Mongo is mongodb-memory-server; revalidate receiver is a real HTTP server.

## Deviations / interpretations
1. Script names follow package.json (`create-admin.ts`, `seed-samples.ts`), not phase file.
2. Seed semantics (phase-07 only says "allow publish placeholder"): without the flag, a seed outfit marked `published` that fails the publish rule (empty links / missing anchors) is stored as `draft` with a console note. With the flag it stays `published`, links stay empty (no fabricated URLs); items without anchors are still dropped by the public DTO. Flag refused when NODE_ENV=production.
3. Seed image keys are content-addressed (not uuid) so re-runs overwrite instead of piling up objects; stored width/height are the processed output sizes, not the declared seed values.
4. "Last admin" guard exists, but the self-delete rule already makes it unreachable in practice.
5. Origin check allows requests with no Origin header (non-browser clients); mismatching Origin is 403. SameSite=Lax is the second layer.
6. Featured draft outfit is allowed to be flagged; the public featured endpoint then returns 404 (published only).
7. Settings update revalidates all published slugs, capped at 50 paths by the shared revalidate schema (over that, extra slugs are dropped).
8. Revalidate is awaited (max 3s) so the effect is deterministic and testable; a down web app adds up to 3s to a write.
9. Admin media upload for `settings.ogImage` uses kind `model` (contract has only model|item).
10. User-facing API messages are Vietnamese; field messages from shared zod schemas stay English.
11. `loadDotenv` (local dev/scripts only) loads `.env` from cwd and `../../.env` via `process.loadEnvFile`, never overriding real env.

## Unresolved questions
- Should P1 add the optional vars (LOGIN_RATE_LIMIT_*, DEFAULT_SITE_NAME/SEO_*) to `apps/api/.env.example`? I cannot edit it.
- Is `/api/health` expected to check Mongo connectivity for the Docker healthcheck? Currently static ok.
- `seed/sample-outfits.json` did not exist yet (P3); seeding with the real file untested.
- Does P5/P6 want `ogImage` upload kind distinct from `model`?

**Status:** DONE_WITH_CONCERNS
**Summary:** All planned endpoints, middleware, services, S3/image pipeline, revalidate, create-admin and seed CLIs implemented; typecheck, 38 tests, build and lint pass.
**Concerns/Blockers:** Real RustFS upload and seeding with the real `seed/` file are untested (no Docker, P3 pending). Optional env vars are not documented in `.env.example` (P1-owned). Seed publish-with-placeholder semantics are my interpretation of phase-07.
