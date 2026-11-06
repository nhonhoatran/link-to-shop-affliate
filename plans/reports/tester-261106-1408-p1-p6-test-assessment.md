# Tester report: Under30ss P1-P6 test assessment

Date: 2026-11-06 | Scope: full workspace, READ-ONLY (no source/test edits, no deps added, no git)
Env: Windows 11, Git Bash, Node 24, pnpm 11.3, vitest 5.1.0. Docker absent. api tests use mongodb-memory-server (real mongod).

## 1. Commands and results

| Command | Exit | Result |
|---|---|---|
| `pnpm test` | 0 | shared 30/30, api 38/38, web 82/82 |
| `pnpm typecheck` | 0 | `tsc --noEmit` clean in shared, api, web |
| `pnpm lint` | 0 | `eslint .` no output (no errors/warnings printed) |
| `pnpm exec tsx --conditions=source scripts/assets/validate-seed-file.ts` | 0 | `dramatic: 8 items, draft, featured=true`; `mesh-84: 9 items, draft, featured=false`; "all image files exist with matching dimensions" |
| `pnpm build` | not run | not in requested scope |

Per package (vitest run):

| Package | Files | Tests | Pass | Fail | Skip |
|---|---|---|---|---|---|
| packages/shared | 2 | 30 | 30 | 0 | 0 |
| apps/api | 5 | 38 | 38 | 0 | 0 |
| apps/web | 13 | 82 | 82 | 0 | 0 |
| **Total** | **20** | **150** | **150** | **0** | **0** |

Phase report claims (P1 30/6, P2 38, P4 28, P5 47, P6 82) match the run.

Timing: shared 238ms, api 6.1s cold (2.6s warm), web 6.5s cold (5.5s warm). No slow test over 1s.

Flaky check: full `pnpm test` plus 2 extra api runs and 1 extra web run, all identical. No flakes seen.

## 2. Coverage

NOT measured. `@vitest/coverage-v8` is not in `node_modules/.pnpm`. Not installed (per instructions). Line/branch/function % = N/A.
Coverage was approximated by mapping critical paths to tests (section 4). Ask before installing the provider if an 80% gate is wanted.

## 3. Test quality checks

- `.skip` / `.only` / `.todo` / `xit` / `xdescribe`: none in any test file. (grep hits were `process.exit` and mongoose `.skip()` in a query, not test skips.)
- Assertion-free tests: none. Every test file has 4+ `expect` calls.
- Mocks: api tests use a real mongod, but S3 is an injected fake `send()` that captures PutObject inputs (`apps/api/test/helpers/test-app.ts`). No real RustFS/S3 is exercised. Web tests mock `next/cache`, `next/navigation`, and `fetch`.
- jsdom noise: `apps/web test: Not implemented: navigation to another Document` comes from `apps/web/test/lookbook/lookbook-interactions.test.tsx` ("does not prevent navigation on a real link"). Harmless, but cosmetic fix is to `preventDefault` in that test.
- Weak assertion found: see gap #1.

## 4. Critical-path coverage map

| Area | Covered by | Verdict |
|---|---|---|
| Login, logout, /me, generic error msg | `apps/api/test/auth.test.ts` (8 tests) | covered |
| Origin check on writes, non-JSON body | `auth.test.ts:80` | covered |
| Login rate limit per IP and email | `auth.test.ts:97` | covered |
| Session required on admin routes | `auth.test.ts:66` | covered |
| Session revoked when admin deleted | `auth.test.ts:72` | covered |
| Featured exclusivity (`/featured`, PUT) | `apps/api/test/outfits.test.ts:81` | covered, good |
| Publish blocked without link/anchor, exact field reported | `outfits.test.ts:54`, shared `outfit-schemas.test.ts` | covered |
| Slug 409, https-only links, image keys under public/ | `outfits.test.ts:63,74` | covered |
| Draft hidden from public API, featured 404 when unpublished | `outfits.test.ts:123,139` | covered |
| Revalidate on write, survives web failure | `outfits.test.ts:153,164` | covered |
| Media: PNG alpha to WebP, edge limit, no enlarge, JPEG | `media-settings-admins.test.ts:24-50` | covered |
| Media: fake bytes, bad kind, missing file, anon 401 | `media-settings-admins.test.ts:58` | covered |
| Media: size limit | `media-settings-admins.test.ts:77` | WEAK (gap #1) |
| Admin delete: self-delete refused | `media-settings-admins.test.ts:155` | covered |
| Admin delete: malformed id, last-admin guard | none | gap #5 |
| Seed idempotent, real dims, publish-with-placeholder prod refusal | `apps/api/test/seed.test.ts:61-97` | covered |
| Revalidate route: auth, body, all 401/400 cases | `apps/web/test/public/revalidate-route.test.ts` (9 cases incl. it.each) | covered |
| Revalidate route: env invalid to 500 | none | gap #6 |
| Lookbook connectors, hover/focus sync, disabled link, a11y levels | `apps/web/test/lookbook/*` (22 tests) | covered |
| JSON-LD escaping, metadata fallbacks | `apps/web/test/public/build-outfit-*.test.ts` | covered |
| Admin editor: publish blocked, dirty guard, server field errors | `apps/web/test/admin/outfit-editor.test.tsx` (6), `editor-state.test.ts` (7) | covered |
| Admin list query parse (q/status/page) | `admin-hooks-and-list-query.test.tsx:59` | helper only, page untested (gap #3) |
| `/look/[slug]` page (404, metadata, JSON-LD) | none | gap #2 |
| Admin 401 to redirect `/admin/login`, 404 to notFound | none | gap #4 |
| Admin login page, settings page, users page UI | none | gap #7,#8 |
| `sitemap.ts`, `robots.ts` | none direct | gap #9 |

## 5. Top 10 coverage gaps (ranked by production risk)

1. **Size-limit test asserts the wrong thing.** `apps/api/test/media-settings-admins.test.ts:77`. First assertion sends 1.2 MB random bytes and expects 400. Default `UPLOAD_MAX_MB` is 10 (`apps/api/src/config/env-config.ts:25`), so 1.2 MB is under the limit. The 400 comes from sharp rejecting non-image bytes, not from the size check. The "falls back to env default" claim is unproven. Fix: start app with `UPLOAD_MAX_MB=1` and send a valid PNG over 1 MB, expect 413. Then set settings `uploadMaxMb: 5`, same file, expect not 413.
2. **`/look/[slug]` page untested.** `apps/web/src/app/look/[slug]/page.tsx` has `notFound()` on both `generateMetadata` and the page. Suggest new `apps/web/test/public/look-page.test.tsx`: mock `@/lib/seo/public-data-loaders` to return null, expect `notFound` thrown. Then return a DTO, expect one h1 and the JSON-LD script.
3. **Admin 401/404 mapping untested.** `apps/web/src/app/admin/_lib/admin-api.ts:15-16`. Suggest `apps/web/test/admin/admin-api.test.ts`: mock `apiGet` to throw `ApiError` with 401, expect `redirect('/admin/login')`. With 404, expect `notFound()`. Also check `getCurrentAdmin` memoization.
4. **Admin protected layout untested.** `apps/web/src/app/admin/(protected)/layout.tsx` calls `getCurrentAdmin` and renders `admin.email`. The redirect-on-401 path is only covered by gap #3 if written. Add a render test that the email shows and nav renders.
5. **Admin delete guards.** `apps/api/src/services/admin-user-service.ts:46-52`. Malformed id to 404 is untested. Suggest `DELETE /api/admin/admins/not-an-id` expects 404 in `media-settings-admins.test.ts`. The last-admin guard (`countDocuments() <= 1`) is practically unreachable over HTTP, because the self-delete check fires first. Either drop it (YAGNI) or cover it at service level.
6. **Revalidate route env failure.** `apps/web/src/app/api/revalidate/route.ts:12-16` returns 500 when `getWebEnv()` throws. Add to `revalidate-route.test.ts`: unset `REVALIDATE_SECRET`, expect 500 and no `revalidatePath` call.
7. **Admin login page untested.** `apps/web/src/app/admin/login/page.tsx`. Suggest `apps/web/test/admin/login-page.test.tsx`: wrong credentials show the generic message; success navigates to `/admin`.
8. **Admin list page wiring untested.** `apps/web/src/app/admin/(protected)/page.tsx:14-18`. Suggest a test that calls the default export with `searchParams: Promise.resolve({q:'x',status:'draft',page:'2'})` and asserts the `adminGet` path. Invalid params fall back to defaults.
9. **sitemap/robots untested.** `apps/web/src/app/sitemap.ts`, `robots.ts`. Suggest `apps/web/test/public/sitemap.test.ts`: only published slugs appear, URLs are absolute on `SITE_URL`. Mock the slugs fetch.
10. **Media upload edge cases and session/security headers.** Missing: SVG or GIF bytes (expect 400 with `fields.file`), truncated PNG header (expect 400, not 500), and a logged-in session that keeps working after logout (expect 401 on reuse of the old cookie). Helmet headers and cookie flags (`httpOnly`, `sameSite`, `secure` in production) are unasserted. Suggest additions to `apps/api/test/media-settings-admins.test.ts` and `auth.test.ts`.

Lower priority: web settings and users pages (no UI tests), `apps/web/src/app/admin/_lib` cache behaviour.

## 6. Other observations

- Real S3/RustFS never exercised. The "right S3 input" test checks captured PutObject args only. Needs P7 integration run with RustFS (blocked here, no Docker).
- Real mongod is used (mongodb-memory-server). Good, but it downloads/uses a binary, so first cold run is slower.
- `pnpm lint` exit 0 with empty output. Did not verify rule coverage of `eslint.config.mjs`.
- Vite warning on all 3 packages: "ESM syntax in a file loaded as CommonJS (vitest.config.ts)". Fix: rename to `.mjs` or set `"type": "module"`. Non-blocking.

## 7. Next steps (prioritised)

1. Fix the size-limit assertion (gap #1). Small, high value.
2. Add tests for `/look/[slug]` 404 and admin 401 redirect (gaps #2, #3). These are the public SEO path and the admin auth UX.
3. Add malformed-id delete test and revalidate 500 test (gaps #5, #6).
4. Decide on last-admin guard: test or remove.
5. Install `@vitest/coverage-v8` only with approval, then measure the 80% gate.
6. Run real RustFS integration in P7.
7. Fix the vitest config warning and the jsdom navigation noise.

## Unresolved questions

- Is an 80% coverage gate required? If yes, approve installing `@vitest/coverage-v8` for the numbers.
- Keep the last-admin delete guard (unreachable via HTTP) or remove it?
- Should S3 be tested against a real RustFS in P7, or is the injected fake acceptable for v1?

**Status:** DONE_WITH_CONCERNS
**Summary:** 150/150 tests pass (shared 30, api 38, web 82), typecheck and lint exit 0, seed validator OK, no skipped or focused tests, stable across reruns. Coverage % not measured (provider absent). Critical API paths are well covered. Main gaps are web public `/look/[slug]`, admin 401 redirect, admin login/list page wiring, and one weak size-limit assertion.
**Concerns/Blockers:** No coverage % (provider not installed, not installed per rule). S3 is a fake client, so real storage is unverified until P7 with RustFS. Weak assertion in media size test (gap #1).
