# Code review: TikTok-style outfit feed (uncommitted changes)

Date: 2026-11-10. Read-only review. Spec: `plans/261110-2143-tiktok-outfit-feed/`.

## Scope
- API: `public-outfit-feed-service.ts` (new), `public-outfit-routes.ts`, `settings-model.ts`, `settings-service.ts`, tests.
- Shared: `public-outfit-list-contract.ts`, `outfit-schemas.ts` (reserved slugs), `settings-schemas.ts` (`homeMode`), `api-contract.ts`.
- Web: `components/feed/*`, `lib/feed/load-feed-page-action.tsx`, `lib/seo/public-feed-loaders.ts`, pages `/`, `/looks`, `/collections/[slug]`, `public-shell*`, `site-header.module.css`, `design-tokens.css`, lookbook (`lookbook-fill.module.css`, `lookbook-layout.tsx`, `lookbook-item-card.tsx`, `measure-connectors.ts`), admin (`settings-home-mode-field*`, `home-mode-notice.tsx`, `settings-form*`, admin home page).
- Excluded: `next-env.d.ts`, `docs/deployment-guide.md`, `package.json`, `scripts/share/`, `e2e/**`.

## Checks run
- `tsc --noEmit` for shared, api, web: pass (no output).
- Vitest: web `test/feed`, `test/app/{home,looks,collection-detail}-page`, `test/admin/settings-home-mode` → 7 files / 49 tests pass. API `public-outfit-feed` + `settings-listing-fields` → 15 pass. Shared → 173 pass.
- curl against the running dev servers (:3000 / :4000), results quoted below.

## Overall
Solid and close to spec. The server action validates its input with the shared zod schema, the API path is a constant, and the query goes through `URLSearchParams`, so there is no SSRF or path injection. The load-more has a `busy` guard and disconnects its IntersectionObserver. Keyboard stepping skips editable fields and modifier keys, and reduced motion is respected. The cache tags (`home`, `collections`) are already revalidated by outfit, collection and settings writes. Every file is under 200 lines. One High (500 on invalid collection slugs), plus several Medium correctness and regression issues.

## Critical
None.

## High

### H1. `/collections/<invalid slug>` now returns 500 instead of 404
- `collections/[slug]/page.tsx:41-45` runs `getOutfitFeedPage(pageNumber, size, slug)` in parallel with `getCollectionPage`. The slug comes straight from the URL. The feed API validates `collection` with `collectionSlugSchema` and answers **400**. `nullOnNotFound` (`public-data-loaders.ts:23-30`) only maps 404 to null, so the 400 throws and the page shows the error boundary.
- Before this change, `/api/public/collections/:slug` did not validate the slug and returned 404, so the page showed a 404.
- Verified with curl: `/collections/Summer` 500, `/collections/a_b` 500, `/collections/slugs` 500, `/collections/khong-co` 404. `GET /api/public/collections/Summer` gives 404, while `GET /api/public/outfits/feed?collection=Summer` gives 400 VALIDATION_ERROR. The page `<title>` is "Không tìm thấy trang" but the status is 500.
- Impact: old or mixed-case links, typos and crawler probes produce 5xx responses (error logs and alerts, SEO penalty).
- Fix: in the page (and `generateMetadata`), check the slug first with `if (!collectionSlugSchema.safeParse(slug).success) notFound();`. Alternatively, have `getOutfitFeedPage` return null on `ApiError` 400 when `collection` is set.

## Medium

### M1. `/look/feed` now returns 500
- The new `GET /api/public/outfits/feed` route is matched before `/outfits/:slug`. Web `getOutfitBySlug('feed')` (`public-data-loaders.ts:36-38`) therefore receives a `Paginated` JSON object instead of a 404, and `look/[slug]/page.tsx:21-22` renders it as an outfit and crashes.
- Verified with curl: `/look/feed` 500 (new), `/look/slugs` 500 (pre-existing), `/look/featured` 200 (pre-existing duplicate of the featured outfit), `/look/khong-co` 404.
- Fix: `RESERVED_OUTFIT_SLUGS` is now exported. Use it in `getOutfitBySlug`: `if (RESERVED_OUTFIT_SLUGS.includes(slug)) return null;`. This fixes all three paths.

### M2. The `measure-connectors.ts` change also moves connectors on regular lookbooks
- `measure-connectors.ts:33-34` now measures `[data-item-image] img` before the `[data-item-image]` box for **every** lookbook, not only `fill`.
- Outside the feed, the `<img>` uses `display:block; max-width:100%; height:auto` (`globals.css:25-29`) and its width attribute is the intrinsic width, so it is narrower than its box whenever the image is smaller than the column. The live data has item images 95–330px wide (e.g. `mesh-84`: 95, 130, 164, 176…), while the desktop left column at 960px is about 290px.
- For left-side items, `sx = image.right` (`compute-connector-paths.ts:33`) moves from the column edge to the picture edge. That visibly changes `/look/[slug]` and the home "sections" lookbooks, which the brief says must stay unaffected.
- How this was checked: by reading the data and the CSS. No screenshot was taken.
- Fix: scope the change to fill mode, e.g. add `data-lookbook-fill` on the section when `fill` is set and pick the `img` only when `root.hasAttribute('data-lookbook-fill')`. If the new behaviour is wanted everywhere, say so and update the visual baselines.

### M3. Offset paging over a changing sort key shows duplicate or missed slides during a long scroll
- `public-outfit-feed-service.ts:25-27` sorts by `{featured:-1, updatedAt:-1, _id:-1}` with `skip/limit`. Infinite scroll keeps one session open across many pages, and every outfit write revalidates the `home` and `collections` tags.
- Scenario: a visitor has page 1 (12 slides) open. An admin edits outfit #20, which bumps its `updatedAt`, or publishes a new one, or changes the featured outfit. When the visitor scrolls, the action fetches page 2 fresh: outfit #12 appears again as the first slide of page 2, and the edited outfit is never shown in this session. The fragments are keyed by page and the slides by slug inside each fragment, so React does not complain, but the visitor sees the same outfit twice.
- The spec chose `updatedAt` (phase-01:15). The issue is the paging method, not the sort.
- Fix options:
  - (a) Keyset cursor: `nextCursor = {updatedAt,_id}` of the last item, with the featured outfit sent only on the first batch and excluded afterwards.
  - (b) A cheaper partial fix: sort by `createdAt`, which edits do not change, so only new publishes still shift pages.

### M4. The first page and later batches can use different page sizes
- The pages call `getOutfitFeedPage(page, settings.looksPageSize)` (home `page.tsx:57`, looks `page.tsx:27`, collection `page.tsx:43`). The action calls `getOutfitFeedPage(page, undefined, collection)` (`load-feed-page-action.tsx:18`), so the API picks the size itself.
- These are different cache entries with separate freshness. If the admin changes "Số outfit mỗi trang" and the `scope:'all'` revalidate call is lost (3s timeout, it only logs a warning; `revalidate-web-service.ts:14,61-63`), the cached settings can say 12 while the action pages at 6. Page 2 at size 6 is items 7–12, which repeat what page 1 already showed, or items are skipped in the opposite case.
- Fix: pass `feed.size` through `OutfitFeed` → `FeedLoadMore` → the action. The schema already accepts `size` and the API clamps it to `PUBLIC_PAGE_SIZE_MAX`. Paging then stays consistent within a session.

## Low

- **L1. The "next" button can stay disabled after a batch arrives.** `feed-step-buttons.tsx:66-81` recomputes `edge` only on `scroll` and on mount. On a slow connection, a visitor who reaches the bottom gets `end=true`. The batch is then appended below without any scroll event, so the down button stays disabled until they scroll by hand. The keyboard still works because `step` ignores `edge`. Fix: also call `update` from a `ResizeObserver` on the scroller's content (or a `MutationObserver` on `childList`).
- **L2. Item descriptions show on phones inside the feed.** `.fill [data-item-description] { display:-webkit-box }` (`lookbook-fill.module.css:53-58`, specificity 0,2,0) overrides `@media (max-width:639.98px) .itemDescription { display:none }` (`lookbook.module.css:169-172`, 0,1,0). So below 640px with 2–4 items per column, the feed shows descriptions that the normal lookbook hides, and the pictures get less room. That cuts against the mobile intent of the `@container (max-height:520px)` rule. Import order does not matter here because every fill rule has higher specificity. Confirm intent; if unintended, wrap the rule in `@media (min-width: 640px)`.
- **L3. No index matches the feed sort.** The indexes are `{status, updatedAt, _id}` and `{collectionIds, status, updatedAt, _id}` (`outfit-model.ts:76,79`). The sort leads with `featured`, so MongoDB does an in-memory top-k sort of full documents (items arrays included) with a k of `skip+limit`. That is fine at today's 16 outfits but grows with deep pages; `page` can go up to 100000 through the public action. Not checked with `explain` (no DB access was used). Fix: query the single featured outfit separately and page the rest on the existing indexes, or add `{status:1, featured:-1, updatedAt:-1, _id:-1}` and the matching index with the collection prefix (through a migration or index sync, per project process).
- **L4. A home page past the end is a soft 404.** `/?page=999` returns 200 with 0 slides, only the footer (verified with curl), while `/looks?page=999` returns 404 (`looks/page.tsx:36`). Fix: add the same `page > totalPages → notFound()` check in `(public)/page.tsx` after line 64.
- **L5. Seed schemas still accept reserved slugs.** `seed-file-schema.ts:16` and `seed-demo-schema.ts:24` use `slugSchema`, not `outfitSlugSchema`, so a seed can create an unreachable `feed`, `featured` or `slugs` outfit. Switch both to `outfitSlugSchema`.
- **L6. Load-more failures are never recovered.** After a deploy, an old tab's server action ID no longer exists. Every retry fails and "Không tải được, bấm để thử lại" repeats forever (`feed-load-more.tsx:41-43,74-77`). Fix: on a second consecutive failure, let the click follow `href` instead of calling `preventDefault`.
- **L7. The collection page makes one unused list query.** `getCollectionPage(slug, page, size)` (`collections/[slug]/page.tsx:42`) still fetches a page of outfit cards that the page no longer renders; only `collection` is used. Request a 1-item page, or add a lightweight collection-only loader.

## Verified OK (no action)
- Server action input: `publicOutfitFeedQuerySchema.safeParse` (page is an int from 1 to `MAX_LIST_PAGE`; the collection slug must match the slug regex and is not reserved). Fixed API path, query built with `URLSearchParams`, no `size` from the client, errors thrown without internal details.
- Duplicate loads: the `busy` ref plus the "loads the same batch only once" test. IO observer recreated on `status`/`nextPage` changes and disconnected on cleanup. No observer in the error state, so failures do not retry in a loop.
- `nextFeedPage` uses the response's `page*size < total`, and the footer appears only when `nextPage === null`.
- Collection filter: draft or unknown collection → 404 (API test plus curl `?collection=nope` 404). Route order means `/outfits/feed` is not swallowed by `/:slug`.
- `homeMode`: Mongoose enum, zod enum, `$unset` when absent (`OPTIONAL_KEYS`), public settings expose it only when stored, and the settings save revalidates `scope:'all'`. The admin form always sends a value (absent → `feed`), which is consistent with `DEFAULT_HOME_MODE`.
- `.shell:has([data-feed-wrap])` chain: shell 100dvh → `main` flex → template `div` flex → `.wrap` → `.feed` (`container-type:size`) → `.slide` 100cqh → `.fitArea` (size container) → `.fill` uses 100% and cqh/cqw. The resolution order is correct. The shell footer is hidden only while a feed is present.
- Lookbook `fill` is opt-in (`fill=false` by default). Apart from M2 and L2, the fill rules apply only under `.fill`.
- The related-outfits loader (`getRelatedOutfits` → `/api/public/outfits`) is unchanged, and the home "sections" branch keeps its previous render path.
- Project rules: sizes and colours come from tokens, copy from `FEED_COPY`, and list data is rendered on the server (first page via SSR, later batches as RSC from the server action). Comments are short and in English.

## Recommended actions (priority order)
1. H1: validate the collection slug before fetching (or map 400 to not found).
2. M1: short-circuit `RESERVED_OUTFIT_SLUGS` in the web `getOutfitBySlug`.
3. M2: scope the connector measurement to fill mode, or accept the change and update the baselines.
4. M4: pass `feed.size` into the action (small change, removes a class of duplicates).
5. M3: decide between keyset paging and accepting rare duplicates; record the decision in the plan.
6. L1–L7 when convenient.

## Unresolved questions
- M2: is the new connector start point on `/look/[slug]` intended?
- L2: should phones show item descriptions inside the feed?
- Not verified: whether Next 16 applies the Data Cache to `fetch` called inside a Server Action (it affects how stale M4 can get).
- The plan's phase 02 table still says `pending`; this read-only review did not update it.
