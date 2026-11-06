# Phase 01 report: Foundation & contracts

Status: DONE_WITH_CONCERNS (compose/Dockerfiles written, not run: Docker not installed)

## 1. Package wiring
- Workspace: `pnpm-workspace.yaml` (`apps/*`, `packages/*`) + `allowBuilds` (argon2, esbuild, mongodb-memory-server, sharp). `require('argon2')` hash OK, `require('sharp')` loads (0.35.5).
- `@under30ss/shared` is CJS (no `"type"`), built by `tsc` to `packages/shared/dist`. `exports`:
  - `"."` and `"./fixtures"`, each with conditions `source` (src .ts), `types` (dist .d.ts), `default` (dist .js).
- Import paths: `@under30ss/shared`, `@under30ss/shared/fixtures`. Relative imports inside shared are extensionless (CJS + NodeNext).
- Consumers:
  - Typecheck (api/web tsconfig.json): `customConditions: ["source"]` -> reads shared src, no build needed.
  - vitest (api/web/shared): alias to `packages/shared/src` -> no build needed. Aliases: `@under30ss/shared`, `@under30ss/shared/fixtures`, web also `@/` -> `apps/web/src/`.
  - api dev/scripts: `tsx watch --conditions=source` (verified `tsx` works both with and without the flag).
  - api build: `tsconfig.build.json` (no source condition, rootDir src) resolves shared via dist. api runtime = `node dist/server.js` requiring shared dist.
  - web (Next 16 Turbopack): consumes shared dist. NO `transpilePackages` needed.
- Build order: `pnpm build` = `pnpm -r build` -> shared, then api + web (topological). Root `pnpm dev` builds shared first, then runs `shared tsc --watch`, api `tsx watch`, web `next dev` in parallel.
- IMPORTANT for P2 and others: `apps/api/src/server.ts` (dev/start entry), `src/scripts/seed-samples.ts`, `src/scripts/create-admin.ts` are referenced by api scripts but are P2's to create. api `tsconfig.build.json` includes `src/**` minus `*.test.ts`; api vitest includes `src/**/*.test.ts` and `test/**/*.test.ts`. api module system: NodeNext, CJS output (no `"type":"module"`), so relative imports need NO `.js` extension.
- Web vitest: jsdom, `globals: true`, `@vitejs/plugin-react`, setup `apps/web/test/setup.ts` (jest-dom + auto cleanup). Includes `src/**/*.test.{ts,tsx}` and `test/**/*.test.{ts,tsx}`.
- Next.js typecheck types: `vitest/globals`, `@testing-library/jest-dom`. `@/*` path alias -> `apps/web/src/*`.

## 2. Exports of `@under30ss/shared`
outfit-schemas.ts
- `SLUG_PATTERN`, `MAX_ITEMS_PER_OUTFIT` (30): slug regex / item cap.
- `anchorSchema`, `imageRefSchema` ({key,width,height}), `imageWithUrlSchema` (+url), `slugSchema`, `affiliateUrlSchema` ('' or https URL only, max 2048, rejects http:/javascript:/relative).
- `outfitItemSchema` (anchor OPTIONAL, see deviations), `outfitStatusSchema`.
- `outfitInputSchema` (create/update body; publish refine -> issues at `items.<i>.affiliateUrl` / `items.<i>.anchor`; duplicate ids at `items.<i>.id`), `outfitSchema` (+id, createdAt, updatedAt; same refine).
- Types: `Anchor, ImageRef, ImageWithUrl, OutfitItem, OutfitStatus, OutfitInput, Outfit`.

public-outfit-dto.ts
- `publicOutfitItemSchema`, `publicOutfitSchema`, types `PublicOutfitItemDto`, `PublicOutfitDto` (id, slug, title, seoDescription?, modelImage{key,width,height,url}, updatedAt, items[] with anchor required, image with url).
- `OUTFIT_SIDE_ORDER`, `compareOutfitItems`: sort side (left first) then order.
- `buildMediaUrl(baseUrl, key)`: joins base + key.
- `toPublicOutfitDto(outfit, resolveUrl)`: Outfit -> PublicOutfitDto, sorted, drops items without anchor.

settings-schemas.ts: `settingsInputSchema` (siteName, seoTitle, seoDescription, ogImage?, uploadMaxMb?), `adminSettingsSchema`, `publicSettingsSchema` (siteName, seoTitle, seoDescription, ogImageUrl|null), types `SettingsInput, AdminSettingsDto, PublicSettingsDto`.

auth-schemas.ts: `emailSchema` (trim+lowercase), `loginInputSchema`, `createAdminInputSchema` (password min 8), `adminUserSchema`, types `LoginInput, CreateAdminInput, AdminUserDto` ({id,email,createdAt}).

seed-file-schema.ts: `seedImageSchema` ({file,width,height}, file relative to `seed/`), `seedItemSchema`, `seedOutfitSchema`, `seedFileSchema` ({version:1, outfits[]}; publish rule NOT enforced so samples with empty links are valid), types `SeedImage, SeedOutfit, SeedFile`.

api-contract.ts: `API_PATHS`, `apiUrl` (builders), `ERROR_CODES`/`ErrorCode`, `ApiErrorBody`, `HealthResponse`, request/response types (list below), `adminOutfitListQuerySchema`/`AdminOutfitListQuery`, `setFeaturedRequestSchema`/`SetFeaturedRequest`, `mediaKindSchema`/`MediaKind`, `MEDIA_UPLOAD_FIELD` ('file'), `Paginated<T>`, `AdminOutfitListItemDto`, `AdminOutfitDto`.

revalidate-contract.ts: `REVALIDATE_PATH` ('/api/revalidate'), `REVALIDATE_SECRET_HEADER` ('x-revalidate-secret'), `revalidateRequestSchema` ({paths: string[] each starting '/'}, 1..50), types `RevalidateRequest, RevalidateResponse` ({revalidated: string[]}).

slugify-vietnamese.ts: `slugifyVietnamese(input)`: strip diacritics, đ->d, kebab, max 80.

`@under30ss/shared/fixtures`: `samplePublicOutfit` (PublicOutfitDto, 3 left + 3 right items, https links, validated by `publicOutfitSchema.parse` at import).

## 3. API contract path constants (`API_PATHS`)
- health `/api/health`
- auth: login `/api/auth/login` (POST), logout `/api/auth/logout` (POST), me `/api/auth/me` (GET)
- public: featuredOutfit `/api/public/outfits/featured`, outfitSlugs `/api/public/outfits/slugs`, outfitBySlug `/api/public/outfits/:slug`, settings `/api/public/settings`
- admin: outfits `/api/admin/outfits` (GET list, POST), outfitById `/api/admin/outfits/:id` (GET, PUT, DELETE), outfitFeatured `/api/admin/outfits/:id/featured` (POST body `{featured:boolean}`), settings `/api/admin/settings` (GET, PUT), admins `/api/admin/admins` (GET, POST), adminById `/api/admin/admins/:id` (DELETE), media `/api/admin/media?kind=model|item` (POST multipart field `file`)
- Express route ordering note for P2: register `/api/public/outfits/featured` and `/slugs` before `:slug`.
- Builders `apiUrl.publicOutfit(slug)`, `.adminOutfit(id)`, `.adminOutfitFeatured(id)`, `.adminAdmin(id)`.
- Types: LoginRequest/Response(MeResponse)=AdminUserDto; FeaturedOutfitResponse/PublicOutfitResponse=PublicOutfitDto; OutfitSlugsResponse `{items:{slug,updatedAt}[]}`; PublicSettingsResponse; AdminOutfitListResponse=`Paginated<AdminOutfitListItemDto>` (`{id,slug,title,status,featured,updatedAt,modelImageUrl}`); CreateOutfitRequest/UpdateOutfitRequest=OutfitInput; OutfitResponse=AdminOutfitDto (images carry url); AdminSettingsResponse, UpdateSettingsRequest; AdminListResponse `{items: AdminUserDto[]}`, CreateAdminRequest/Response; MediaUploadResponse `{key,width,height,url}`.
- Contract decisions P2 must honour: (a) pagination size default/max come from env `ADMIN_PAGE_SIZE_DEFAULT/MAX`, query schema has no max; (b) featured=true clears featured on all other outfits (at most one); `/public/outfits/featured` 404 when none; (c) public items without anchor are dropped (`toPublicOutfitDto`); (d) media keys for anything public MUST start with `public/` because anonymous read is granted only to that prefix (and Caddy serves `/media/<key>`); (e) when no settings doc exists, defaults must come from P2 (no site name constant in shared); (f) `/api/revalidate` is a WEB route called API->web over the internal network (WEB_REVALIDATE_URL); Caddy sends public `/api/*` to the API, so it is not publicly reachable.

## 4. Env vars
api (`apps/api/src/config/env-config.ts`, exports `envSchema, Env, EnvConfigError, parseEnv(source?), getEnv(), resetEnvCache()`; invalid -> throws EnvConfigError listing every issue). Defaults in parentheses; no default = required:
`NODE_ENV` (development), `PORT` (4000), `MONGODB_URI`, `SESSION_SECRET` (min 32), `SESSION_MAX_AGE_HOURS` (168), `S3_ENDPOINT` (url), `S3_REGION` (us-east-1), `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE` ("true"/"false" -> boolean, default true), `MEDIA_PUBLIC_BASE_URL` (string; may be relative like /media), `WEB_REVALIDATE_URL` (url), `REVALIDATE_SECRET` (min 16), `UPLOAD_MAX_MB` (10), `WEBP_QUALITY` (82), `IMAGE_MAX_EDGE_MODEL` (1600), `IMAGE_MAX_EDGE_ITEM` (800), `ADMIN_PAGE_SIZE_DEFAULT` (20), `ADMIN_PAGE_SIZE_MAX` (100, DEFAULT must not exceed it), `ALLOWED_ORIGIN`.
web (`apps/web/src/lib/web-env.ts`, `getWebEnv()`, lazy, server-only): `API_INTERNAL_URL` (url), `SITE_URL` (url), `MEDIA_PUBLIC_BASE_URL`, `REVALIDATE_SECRET` (min 16). `next.config.ts` also reads `MEDIA_PUBLIC_BASE_URL` at BUILD time (Docker build arg wired).
Compose-only: `SITE_ADDRESS`, `CADDY_HTTP_PORT`, `CADDY_HTTPS_PORT`, `MONGO_DB`. Files: `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`.

## 5. Web lib (all server/client split)
- `lib/api-client-error.ts`: `ApiError` (status, code, fields, isUnauthorized, isNotFound), `readApiResponse<T>`, `networkError`, `NETWORK_ERROR_CODE` (status 0). Single source of ApiError; re-exported from both clients.
- `lib/api-client-server.ts`: `apiGet<T>(path, {cookie?, tags?, revalidate?, signal?})` (uses `API_INTERNAL_URL`; with cookie => `cache:'no-store'`), `forwardCookieHeader()` (async, `next/headers`).
- `lib/api-client-browser.ts`: `apiFetch<T>(path, {json?, ...RequestInit})` (relative path, same-origin credentials), `uploadMedia(file, kind, signal?)`.
- `lib/media-url.ts`: `mediaUrl(key)` (server-only, from env). `lib/web-env.ts`: `getWebEnv`.
- Tests: `lib/api-client.test.ts` (6 tests).

## 6. Design tokens (`apps/web/src/styles/design-tokens.css`, imported by `globals.css`)
Measured from the references (941px canvas; title 20px, description 17px, model ~42% width, item images ~30%, stroke ~1.5px).
- Colors: `--color-page --color-ink --color-muted --color-line --color-focus`.
- Type: `--font-sans` (uses `--font-be-vietnam-pro` set by layout), `--font-weight-regular/bold`, `--lookbook-title-size --lookbook-subtitle-size --lookbook-description-size` (clamp, min 11px), `--lookbook-line-height`, `--page-title-size`, `--body-size`.
- Spacing: `--space-1..8`, `--lookbook-gap`, `--lookbook-row-gap`.
- Lookbook: `--lookbook-max-width` (960px), `--lookbook-col-left/model/right` (29fr/42fr/29fr), `--lookbook-item-image-ratio`, `--lookbook-connector-width` (1.5px), `--lookbook-curve-ratio` (0.35), `--lookbook-arrow-size`, `--lookbook-dim-opacity` (0.35), `--lookbook-hover-scale` (1.04), `--duration-fast/base`, `--easing-standard`, `--lookbook-hide-description-below` (640px; media queries must hardcode `@media (max-width: 639.98px)`, documented in comment).
- Admin: `--admin-bg --admin-surface --admin-border --admin-border-strong --admin-text --admin-text-muted --admin-primary --admin-primary-contrast --admin-danger --admin-danger-bg --admin-success --admin-radius --admin-radius-sm --admin-focus-ring --admin-shadow --admin-control-height`.
- `layout.tsx`: `lang="vi"`, Be Vietnam Pro (vietnamese+latin, 400/500/700) as CSS var `--font-be-vietnam-pro`. No `metadata` in the layout (site name/SEO come from settings; P5 sets metadata). `globals.css`: reset, body font, focus-visible, reduced-motion.

## 7. Infra (written, NOT run)
- RustFS facts, verified from official sources: image `rustfs/rustfs` (tags latest / e.g. 1.0.4), S3 API 9000, console 9001, data `/data`, env `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY`, health `GET :9000/health`, runs as UID/GID 10001 (volume must be chowned). Sources: https://github.com/rustfs/rustfs , https://docs.rustfs.com/installation/docker/ , https://raw.githubusercontent.com/rustfs/rustfs/main/docker-compose-simple.yml
- Public-read policy: official RustFS page for anonymous/bucket policy NOT found (docs.rustfs.com/developer/mc.html 404). I used the standard S3 API `put-bucket-policy` via `amazon/aws-cli` (Allow `s3:GetObject` on `arn:aws:s3:::<bucket>/public/*`, Principal `*`) in `infra/rustfs-init/init-bucket.sh` + `policy.template.json`. UNVERIFIED that RustFS honours it exactly; first thing to test in P7.
- `infra/docker-compose.yml`: mongo:8, rustfs-permissions (chown helper), rustfs, rustfs-init, api, web, caddy. Only Caddy is published; mongo (27017) and rustfs (9000) are bound to 127.0.0.1 for local dev. `docker compose --env-file .env -f infra/docker-compose.yml up mongo rustfs caddy` is the intended smoke test.
- `infra/caddy/Caddyfile`: `/api/*` -> api:4000; `/media/*` -> strip `/media`, rewrite to `/<bucket>/<path>`, proxy rustfs:9000 (path-style); rest -> web:3000. `SITE_ADDRESS` env (default `:80`).
- Dockerfiles: api on `node:24-bookworm-slim` (multi-stage, prod-only reinstall in builder, copies node_modules + shared dist + api dist), web on standalone output (`node apps/web/server.js`, build arg `MEDIA_PUBLIC_BASE_URL`). `.dockerignore` at root.

## 8. Installed versions (latest stable at install, license checked via `npm view`)
- api: express 5.3.0, express-session 1.19.0, connect-mongo 6.0.0, mongoose 9.12.0, argon2 0.45.2, helmet 8.3.0, express-rate-limit 8.7.3, multer 2.5.0, sharp 0.35.5, @aws-sdk/client-s3 3.1162.0, zod 4.6.7; dev: tsx 4.23.15, vitest 5.1.0, supertest 7.3.1, mongodb-memory-server 11.3.0, @types/express 5.0.6, @types/express-session 1.19.0, @types/multer 2.3.0, @types/supertest 7.2.1, @types/node 26.6.6.
- web: next 16.4.5, react/react-dom 19.3.1, zod 4.6.7, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/utilities 3.2.2; dev: vitest 5.1.0, vite 8.3.6, @vitejs/plugin-react 6.2.1, jsdom 30.1.3, @testing-library/react 16.3.3, user-event 14.6.8, jest-dom 7.0.1, @types/react 19.3.0, @types/react-dom 19.3.0.
- root dev: typescript 6.0.3, tsx 4.23.15, @playwright/test 1.64.1 (browsers NOT installed), eslint 10.14.0, @eslint/js 10.0.1, typescript-eslint 8.72.1, eslint-plugin-react-hooks 7.1.1, @next/eslint-plugin-next 16.4.5, globals 17.14.0.
- All MIT / Apache-2.0 / ISC-class (sharp, aws-sdk, playwright, typescript Apache-2.0; rest MIT).
- pnpm 11 minimum release age made a few picks one patch behind `npm view` (client-s3 3.1162 vs 3.1163, jsdom 30.1.3 vs 31.0.0, playwright 1.64.1 vs 1.65.0).
- ESLint: root `eslint.config.mjs` (flat; typescript-eslint recommended, react-hooks rules, `@next/eslint-plugin-next` recommended rules; works with flat config; lenient: unused vars/type-imports are warnings).

## 9. Commands run and results (final run, repo root)
- `pnpm install` / per-package adds: OK; argon2 + sharp load verified after `allowBuilds`.
- `pnpm typecheck`: PASS (shared, api, web `Done`).
- `pnpm test`: PASS. shared 30 tests (2 files), api 4 tests (env-config), web 6 tests (api-client).
- `MEDIA_PUBLIC_BASE_URL=http://localhost:8080/media pnpm build`: PASS (shared tsc, api tsc, `next build` Turbopack compiled + TypeScript OK; only `/404` prerendered since no pages exist yet; fonts downloaded fine).
- `pnpm lint` (`eslint .`): PASS, no output.
- tsx probe importing `@under30ss/shared` and `/fixtures` with and without `--conditions=source`: both OK. `node -e require('@under30ss/shared/fixtures')` from apps/api: OK.
- grep for private forms of address over apps, packages, infra, root configs: no matches.
- NOT run: docker compose, Dockerfile builds, `playwright install`, git (per instructions).

## 10. Deviations / notes
1. TypeScript pinned to 6.0.3 instead of latest 7.0.2: typescript-eslint 8.72.1 peer range is `<6.1.0`. Revisit when typescript-eslint supports 7.
2. `outfitItemSchema.anchor` is OPTIONAL (plan shows required) so drafts can exist before anchors are placed; publish requires it (error at `items.<i>.anchor`). Public DTO keeps it required.
3. Added beyond plan: `toPublicOutfitDto`, `buildMediaUrl`, `compareOutfitItems` in shared (DRY for P2/P5); `imageWithUrlSchema`; duplicate item id check; `ERROR_CODES`; `.dockerignore`; web vitest uses `vite` + `@vitejs/plugin-react` (needed for TSX).
4. `outfitInputSchema`/`outfitSchema` are refined (ZodObject refinements in zod 4): do NOT call `.extend/.omit` on them; they are built from an internal base object. `seedItemSchema` extends the plain `outfitItemSchema` (ok).
5. Password min length 8 and field max lengths (name 80, description 240, title 120, slug 80) are validation limits fixed in shared (per plan); admin-editable limits left out (YAGNI).
6. Vitest prints a harmless Vite warning ("ESM syntax in a file loaded as CommonJS") because configs are `vitest.config.ts` in CJS packages; `--configLoader runner` breaks `__dirname`, so left as-is.
7. Status column in `plan.md` set to Done for phase 1 and phase-01 Todo checked (outside strict file ownership, doc only).
8. Two `next` instances appear in `node_modules/.pnpm` (peer variants from root playwright); web uses its own, harmless.
9. Next.js `next build` with API-dependent pages in Docker: API is unreachable at image build time, so P5 pages must not require API data at build (use dynamic/ISR with runtime fetch, no build-time `generateStaticParams` hard failure).
10. `next.config.ts`: `dangerouslyAllowLocalIP` is true outside production so dev media on localhost can be optimized.

## Unresolved questions
- RustFS anonymous-read via `put-bucket-policy`: unverified (no Docker here).
- Caddy `rewrite * /{$S3_BUCKET}{uri}` after `handle_path`: syntax reviewed, not executed.
- Dockerfile prod-only reinstall (`pnpm install --prod --filter ...`) with pnpm 11 in CI mode: not executed.

**Status:** DONE_WITH_CONCERNS
**Summary:** Monorepo, deps, shared contract (schemas, API paths/types, fixture, helpers), env configs, design tokens, web lib clients, infra files done. `pnpm typecheck`, `test`, `build`, `lint` all pass.
**Concerns/Blockers:** Docker artifacts (compose, Caddyfile, bucket policy, Dockerfiles) unrun, RustFS public-read policy unverified; TypeScript pinned 6.0.3 (not 7); item `anchor` optional until publish.
