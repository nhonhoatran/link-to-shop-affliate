# Tester report: Phase 7 e2e, verification, Lighthouse (ui-refactor)

Date: 2026-11-07 05:28 (Asia/Saigon). Stack: `pnpm dev` (web :3000, api :4000), dev mode, reused.
Scope: Phase 7 steps 1-10. Steps 11-12 (ui-consistency, docs) and 13 (commit) skipped per owner.

## Results

| Check | Result |
|---|---|
| `pnpm lint` | exit 0 (`eslint .`) |
| `pnpm typecheck` | exit 0 (packages/shared, apps/api, apps/web, root incl. e2e) |
| `pnpm test` | shared 3 files / 37 tests; api 17 / 102; web 43 / 255. All pass |
| `pnpm e2e` (all projects) | **60 passed, 0 failed** (~48 s). Projects: admin-flow 1, public 38, admin-shell 16, visual 4, cleanup 1 |
| `pnpm e2e --project visual` | **4 passed** (lookbook baseline unchanged, no `--update-snapshots`) |
| Baseline before edits | 17 passed (all old specs green with new routes) |

Runs were sequential, one process at a time. Earlier runs (before the final fixes) showed the same single failure noted below.

## Lighthouse SEO (dev server, Lighthouse 12.8.2, `--only-categories=seo`)

| Page | Mobile | Desktop |
|---|---|---|
| `/` | 100 | 100 |
| `/looks` | **92** | **92** |
| `/look/dramatic` | 100 | 100 |

`/looks`: `meta-description` = 0, "Document does not have a meta description".
Root cause (app code): `apps/web/src/lib/seo/build-looks-metadata.ts:19,26,32` uses `settings.seoDescription` only. Dev DB value is `""`, so no tag is emitted. Not fixed (app code).
Raw JSON: `C:\Users\LENOVO\AppData\Local\Temp\claude\a0157126994b7d90\2dce0854-3d92-424e-8079-f3b45fb495b4\scratchpad\lh\` (`mobile_*.json`, `desktop_*.json`).

## Failures and concerns (app code, not fixed)

1. **Settings change reaches `/looks` late (cache).** Admin saves `looksPageSize`, but the public list keeps the old size for ~10 s or more in some runs. Probe: after PUT, `/looks` still showed the old size; an explicit `POST /api/revalidate {scope:"all"}` did not change it either.
   - Root cause: `apps/web/src/lib/seo/public-data-loaders.ts` (`getPublicSettings` and the other loaders) use `apiGet(..., { revalidate: 300 })` with no tags. `apps/web/src/app/api/revalidate/route.ts` (scope `all`) calls only `revalidatePath('/', 'layout')`, which does not purge that fetch data cache.
   - Impact: site-wide settings (site name, SEO text, page size) can be stale for up to `PUBLIC_REVALIDATE_SECONDS` (300 s).
   - Suggested fix: tag the settings fetches and call `revalidateTag` in the scope-`all` branch (check the Next 16 signature).
   - Workaround in e2e (not weakening): `e2e/public-looks-and-navigation.spec.ts` `beforeAll` waits up to 60 s for `Trang 2` to appear. Before this wait, the first pagination test failed in all 4 full runs (404 on `?page=2`). A later manual probe saw the new size on the first request, so the delay is intermittent.

2. Not app code, but observed: the admin login API limits successful and failed attempts to 20 per IP per 15 min (`apps/api/src/lib/runtime-defaults.ts`, `login-rate-limit-middleware.ts`). A full e2e run uses about 4 logins (admin-flow UI login, cleanup login, 2 worker sessions). Manual probes plus repeated runs locked admin login (429) for about 20 min.
   - Mitigation done: shell specs share one API-created session per worker (`e2e/support/admin-api.ts`) instead of UI login per test.

## Changes made (owned: `e2e/*`, `playwright.config.ts`, phase-07 Status/Todo)

- `playwright.config.ts`: new project `admin-shell` (`/admin-shell-.*\.spec\.ts/`), no dependency on `public` so it always runs.
- `e2e/cleanup.teardown.ts` + `e2e/support/outfit-cleanup.ts`: delete logic moved to a shared helper. Delete accepts 404 (already gone) and still asserts the public route is 404.
- `e2e/admin-outfit-flow.spec.ts`: **teardown bug fixed**. Leftover "E2E mw5x0ga7" came from the single state file `test-results/e2e-outfit-state.json`. If a run died or its teardown failed, the state file kept the id, and the next run overwrote it, so that outfit was never deleted. Now the flow deletes any stale outfit from the state file before writing a new one. Also asserts the new title appears on `/admin/outfits`.
  - The leftover is no longer in the admin list, and the state file is absent. Not reproduced in this run.
- `e2e/public-viewport-and-no-js.spec.ts`: opacity = 1 check for lookbook content after page-load animations finish (JS on, reduced motion, no JS). Header rests at `transform: none` without JS. Animation wait ignores scroll-driven (view-timeline) reveals, which never finish below the fold.
- `e2e/public-hotspot-alignment.spec.ts` + `e2e/support/hotspot-offsets.ts`: measurement moved to a shared helper, reused by the connector spec.
- New specs:
  - `public-looks-and-navigation.spec.ts`: `/looks` pagination (page 2, prev/next, invalid page to page 1, page past last to 404), header/footer/breadcrumb links, related excludes current outfit, header hide/show on scroll, Tab focus shows header. Uses `e2e/support/admin-settings.ts` to set `looksPageSize=1` and restore it.
  - `public-connector-draw-once.spec.ts`: connectors draw once on load (`animationstart` counted), no pending path animation and no new draw after resize to 1024, hotspots still aligned.
  - `public-responsive-viewports.spec.ts`: no horizontal scroll at 320/390/768/1024/1440 on `/`, `/looks`, `/look/<slug>`. Header links inside viewport. Header nav links at least 44 px tall at 320/390.
  - `admin-shell-theme-and-drawer.spec.ts`: dark mode persists and is in SSR HTML (`div[data-theme]`), cookie `admin-theme` path `/admin` httpOnly, unknown value `evil` rejected (theme unchanged), rail persists after reload, `/admin?status=draft` gives 307 to `/admin/outfits?status=draft`, settings save toast `role=status` "Đã lưu cài đặt", drawer at 390 (open, Esc, focus back to menu button, close button, navigate closes).
  - `admin-shell-responsive.spec.ts`: no horizontal scroll at 5 widths on `/admin`, `/admin/outfits`, `/admin/outfits/new`, `/admin/settings`, `/admin/users`. Menu button at least 44 px at 320/390. Editor tabs ("Thông tin", "Món đồ", "Xem trước") at 390 and no tablist at 1440 (uses first existing outfit from API).

## Side effects and notes

- Settings specs (`setLooksPageSize`, toast save) create the settings document. The dev DB had none before, so it now stores `siteName` "Under30ss", `seoTitle` "Under30ss - Shop the look", `seoDescription` "" (same as defaults). `looksPageSize` is restored to unset.
- `setLooksPageSize` refuses to run if `ogImage` is set, because a settings PUT would unset it.
- Admin-shell runs in parallel with public (no dependency). Both touch the shared settings document, so a race is possible in theory: a toast-save PUT carrying stale `looksPageSize` could overwrite the pagination test's value. Not seen in 4 runs.
- Draw-once: path `d` did not change on resize to 1024, so the spec does not assume geometry changes. It checks animation starts and pending animations instead.
- Phase 7 "quay lại list sau xoá": the admin flow has no UI delete step. Delete happens in teardown through the API. UI delete flow not covered.
- Lighthouse ran against dev mode (`pnpm dev`), not a production build. Production scores may differ.
- Visual spec (P1) was only run; not edited, no snapshot updates.

## Unresolved questions

1. Should admin setting changes reach public pages immediately (tag-based revalidation), or is up to 300 s acceptable? Decides whether the 60 s wait in `public-looks-and-navigation.spec.ts` stays.
2. Who owns the `/looks` meta-description fix (P3 `build-looks-metadata.ts`)? Should the default `seoDescription` become required and non-empty in admin settings, or fall back to a configured default?
3. Should e2e use one shared admin session (Playwright global setup with storage state) to stay far below the login limit? Not done here; it touches the teardown and admin-flow login.
4. Concurrent e2e runs still share `test-results/e2e-outfit-state.json`. Unsafe, but the current rule is one run at a time.
