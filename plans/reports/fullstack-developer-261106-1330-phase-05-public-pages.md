# Phase 05 report: Public pages & SEO

## Routes and rendering mode (Next 16.4.5, cacheComponents off)
| Route | Mode | Why |
|---|---|---|
| `/` | dynamic (`force-dynamic`) | featured can change; API unreachable at build |
| `/look/[slug]` | dynamic on demand, then cached (ISR-like) | no `generateStaticParams`, nothing fetched at build; fetch `tags: ['outfit:<slug>']` + safety `revalidate` |
| `/robots.txt` | dynamic | needs runtime `SITE_URL` |
| `/sitemap.xml` | dynamic | reads API per request; throws (500) if API fails, no silent empty sitemap |
| `/api/revalidate` | dynamic route handler (POST) | |
| not-found (`/_not-found`) | static | |

Docs checked (nextjs.org, 2026-06/10 pages): `revalidatePath(path, type?)` (type only needed for `[slug]` patterns; in route handlers it marks stale for next visit); `dynamic`/`revalidate` segment config still valid when cacheComponents is off; `params` is `Promise`.

## Files (all under apps/web)
- src/app: `page.tsx`, `look/[slug]/page.tsx`, `not-found.tsx`, `sitemap.ts`, `robots.ts`, `api/revalidate/route.ts`
- src/lib/seo: `absolute-url.ts`, `build-outfit-metadata.ts` (`buildOutfitMetadata`, `buildSiteMetadata`), `build-outfit-json-ld.ts` (+`serializeJsonLd`), `outfit-json-ld-script.tsx`, `public-data-loaders.ts` (React `cache` loaders: settings, outfit by slug, featured, slugs; null only on API 404)
- src/components/public: `public-page.tsx` + css (the one `<main>` with gutter), `public-message.tsx` + css, `public-copy.ts` (all new strings)
- test/public: `build-outfit-json-ld.test.ts`, `build-outfit-metadata.test.ts`, `revalidate-route.test.ts`
- Ticked Todo + Status in phase-05 file. plan.md untouched. No deps/config/layout/globals/tokens/api-client edited.

## Checklist, line by line
- page holder: every page renders exactly one `<main>` via `PublicPage` (PublicMessage wraps it too). Verified in served HTML of `/` (`<main` present).
- `/look/[slug]` and `/` with featured: `<main>` holds JSON-LD script + `<LookbookLayout outfit headingLevel="h1">` only; no header/footer.
- gutter: `public-page.module.css` padding `var(--space-6) var(--space-4)`.
- empty state + 404: both through `PublicMessage` (title/message/optional link); h1 `--page-title-size`, bold, `--color-ink`; message `--body-size` `--color-muted`; link `next/link` to `/`; centred; `max-width: calc(var(--space-8) * 8)` (derived from tokens, no message-width token exists). Own CSS module. Empty state on `/` has no link (it is already home); 404 has the link.
- JSON-LD: one `<script type="application/ld+json">` through `OutfitJsonLdScript`; `<` escaped to `<` (U+2028/2029 too). `CollectionPage` + `ItemList` (item url = affiliate link, else page url; absolute images).
- metadata only via `build-outfit-metadata.ts`; site name / description / og image come from `/api/public/settings`; title `{title} | {siteName}`; description falls back to settings when outfit's is empty/whitespace; canonical `${SITE_URL}/look/{slug}` (also on `/` when featured exists); OG/Twitter image = model image (absolute). No featured: `settings.seoTitle` + canonical `/`.
- request failure: `/look/[slug]` API 404 -> `notFound()` (curl: HTTP 404); other errors throw to the error boundary; `/` featured 404 -> empty state (curl verified, title from settings).
- tokens only: no colour/spacing/type literals in my CSS (only `calc(var(--space-8) * 8)`).
- copy: see list below. No literal site name, no hard-coded domain (`SITE_URL`).
- revalidate route: sha256 both sides then `timingSafeEqual` (length-mismatch safe), header `x-revalidate-secret` (shared const), body via `revalidateRequestSchema`, `revalidatePath` per path, 401 bad/missing secret (checked before body), 400 bad JSON/body, 500 if web env invalid; response `RevalidateResponse`. Error body shape `{error:{code,message}}` like the API.

## New copy (Vietnamese, for a person to read) — `components/public/public-copy.ts`
- Empty home: "Chưa có outfit nào" / "Bộ phối đồ nổi bật sẽ sớm xuất hiện ở đây."
- 404: "Không tìm thấy trang" / "Trang bạn tìm không tồn tại hoặc đã bị ẩn." (also used as the 404 `<title>`)
- Link: "Về trang chủ"
Machine-facing revalidate error messages are English (not user-visible).

## Env read
- `SITE_URL`, `API_INTERNAL_URL`, `REVALIDATE_SECRET`, `MEDIA_PUBLIC_BASE_URL` via `getWebEnv()` (existing).
- NEW optional, not in web-env/.env.example (not my files): `PUBLIC_REVALIDATE_SECONDS` (default 300, positive integer). Safety net bounding staleness if a revalidate call is lost. Lead: add to `.env.example`/web-env if wanted.

## Tests / checks (repo root)
- `pnpm --filter @under30ss/web test`: `Test Files 7 passed (7)`, `Tests 47 passed (47)` (19 new: json-ld 5, metadata 5, revalidate 9).
- `pnpm --filter @under30ss/web typecheck`: exit 0, no output.
- `pnpm lint`: exit 0, no output.
- `MEDIA_PUBLIC_BASE_URL=http://localhost/media API_INTERNAL_URL=http://127.0.0.1:1 SITE_URL=http://localhost:3000 REVALIDATE_SECRET=<placeholder> pnpm --filter @under30ss/web build`: success, API unreachable. Output: `Compiled successfully`, `Finished TypeScript`, `Generating static pages (4/4)`; routes `ƒ /`, `○ /_not-found`, `○ /admin/login`, `ƒ /api/revalidate`, `ƒ /look/[slug]`, `ƒ /robots.txt`, `ƒ /sitemap.xml`. (`/admin/login` is P6's.)
- Extra smoke: `next start` against a stub API (settings 200, everything else 404): `/look/x` 404; `/` shows "Chưa có outfit nào", `<title>T</title>`, canonical `/`; `/robots.txt` disallows `/admin` `/api` + sitemap URL; revalidate good secret -> `{"revalidated":["/"]}`, bad secret 401; `/sitemap.xml` 500 as designed when slugs call fails. Stub and server stopped afterwards.
- NOT verified here: rendering with real outfit data in a browser, Lighthouse, Google rich-results validation, sitemap with real slugs (P7).

## Notes / concerns
1. Data loaders live in `lib/seo/public-data-loaders.ts` (inside my ownership) rather than a separate lib folder.
2. `revalidatePath('/look/<slug>')` by P2 is the contract; `/look/[slug]` data uses tags too, but only path revalidation is wired. P2 should send `/`, `/look/<slug>` (old + new slug if renamed) and `/sitemap.xml`.
3. `/` is `force-dynamic`, so it fetches the internal API each request (cheap; no cache). Revalidating `/` is harmless.
4. Sitemap throws on API failure rather than returning a partial list, so crawlers retry instead of de-indexing.
5. Lookbook h1 is visually hidden (P4 deviation), so the visible page has no on-screen title; fine for SEO, flag for design.
6. Image URL in OG must be reachable publicly; with relative `MEDIA_PUBLIC_BASE_URL=/media` it is made absolute with `SITE_URL`.

**Status:** DONE_WITH_CONCERNS
**Summary:** `/`, `/look/[slug]`, 404, sitemap, robots, revalidate route, metadata + JSON-LD builders and shared PublicMessage/PublicPage are in. 47 web tests, typecheck, lint pass; `next build` succeeds with the API unreachable.
**Concerns/Blockers:** Optional env `PUBLIC_REVALIDATE_SECONDS` needs documenting by the lead; behaviour with real API data untested until P7; P2 must send the revalidate paths listed in note 2.
