# Tester report: editorial redesign e2e (Phase 6, partial)

Date: 2026-11-08. Stack: `pnpm dev` (web :3000, api :4000), `NEWSLETTER_RATE_LIMIT_MAX_PER_IP=1000`. Code state: after coordinator's review fixes. Not committed.

## Scope status
| Item | Status |
|---|---|
| Full e2e baseline (red list) | DONE |
| Fix old specs with reasons | DONE |
| 3 new specs + support + teardown | DONE (all green) |
| Visual lookbook candidates | DONE, awaiting owner approval, not updated |
| axe / hero pixel / LCP-CLS / bundle / font | NOT RUN |
| IP-chain smoke on compose | NOT RUN (unverified) |
| Docs, UI checklist, final gate | NOT in scope / NOT RUN |

Unit gate (run before the latest app fixes): lint, typecheck, test green. Shared 164, api 222, web 663. Not re-run after the latest app changes.
E2E lint + typecheck re-run after spec edits: green.

## Test results (e2e) - UPDATED 2026-11-08 after close-out
Final full run `pnpm e2e` (dev stack, no `--no-deps`): **111 passed, 0 failed, 0 skipped** (2.0 min). Close-out details: `fullstack-developer-261108-e2e-closeout.md`.
| Project / chain | Pass | Fail | Notes |
|---|---|---|---|
| admin-flow + public | 61 of 61 | 0 | header 320px fixed (nav wraps) |
| admin-shell | all | 0 | |
| visual | 4 of 4 | 0 | re-baselined once (Q2 approved), re-run without flag green |
| content chain | all | 0 | collections and mobile editor specs fixed |
| content-newsletter-signup / admin, editorial render | 6 / 8 / 9 | 0 | |
| content-cleanup, cleanup (teardown) | pass | 0 | |

Earlier numbers (before close-out): public 60 of 61, visual 0 of 4, content chain 43 pass / 2 fail / 1 not run.

Chain run: `pnpm e2e --no-deps --workers=1 --project content-setup ... --project content-cleanup`. Used `--no-deps` because `content-setup` depends on `visual`, which is red until Q2 approval. Without this, the whole content chain is blocked ("did not run"). That is a gate concern (see below).

Chain failures still red:
1. `content-collections-flow.spec.ts:118` "delete collection... removes header link once none is published". Header keeps `href="/collections"`. Cause: dev DB has a published non-e2e collection (`test`). Nav shows the link while settings `collectionsNavEnabled` is absent or true. Spec assumes empty DB. Needs decision: clean dev data or change spec. Not changed.
2. `content-home-editor-mobile.spec.ts:52` keyboard drag. After Space, ArrowUp x2, Space, the status region never shows "Đã thả ... tại vị trí 1/5". Possible app bug at `apps/web/src/components/admin/home-editor/section-reorder-announcements.ts:25`, or spec timing (100 ms pause). Unresolved; needs manual check.

## Old specs changed (reasons)
- `e2e/public-responsive-viewports.spec.ts`: removed exact link counts (banner 3, nav 2). The "Bộ sưu tập" nav link appears when a collection is published, so the count depends on data. Bounds and tap-size checks kept.
- `e2e/content-home-editor-flow.spec.ts`, `content-home-editor-mobile.spec.ts`: default card count 3 to 5 (Q3 default layout). Mobile reorder expectations updated to new default order: Lookbook, Bộ sưu tập, Outfit khác, Thư viện, Đăng ký (positions x/5).
- `e2e/content-collections-flow.spec.ts` (move test): asserts row position change and public order, not totals (other published collections exist).
- `e2e/visual-reference-screenshots.spec.ts`: not changed. Red by design (Q2).

## New specs / support
- `e2e/content-newsletter-signup.spec.ts` (6): no consent = no form; saved consent: JS post, pending button disabled, `?newsletter=ok`; unchecked consent blocks post; JS off post; honeypot ok but no record; JS off stale (409) = `?newsletter=stale`. No 429 test.
- `e2e/content-newsletter-admin.spec.ts` (8): list shows subscribed; email and status filters; CSV (BOM, exact header, row); unsubscribe confirm + badge; resubscribe; CSV history `subscribe / unsubscribe(admin) / subscribe`; delete confirm; consent change bumps version and home shows new text.
- `e2e/content-editorial-sections-render.spec.ts` (9): 11 types in order, one h1; marquee pause (label click, `checked`) and reduced-motion no animation; gallery links and no empty tile; campaign CTA; no horizontal scroll 320-1440; no-JS; one LCP hint (preload + fetchpriority high = 1); default layout gallery does not repeat outfit list.
- `e2e/support/newsletter-fixtures.ts`, `e2e/support/editorial-home-layout.ts` (new).
- `e2e/support/admin-settings.ts`: `newsletterConsent` added to writable keys and restore. Without this, every settings PUT would clear the consent.
- `e2e/content.teardown.ts`: also deletes e2e subscribers (`@example.test`).
- `playwright.config.ts`: chain extended: editorial, newsletter-signup, newsletter-admin before footer-and-nav.

Teardown incidents: login limit (20/15 min) hit twice, teardown could not log in and did not restore. Restored manually from the setup snapshot, then teardown re-run and passed. Playwright also clears `test-results/` at start, which deletes `content-snapshot.json`. A teardown-only run then fails with "snapshot missing". Recommend moving the snapshot outside `test-results/`.

## Visual lookbook (Q2, NOT updated)
Files: `plans/261108-0923-editorial-luxury-redesign-and-new-sections/visuals/lookbook-{dramatic,mesh-84}-{1440,390}-{candidate,baseline,diff}.png` (12 files).

| Image | Size base/cand | Differing px | Verdict |
|---|---|---|---|
| dramatic 1440 | 960x1777 / same | 7574 (0.01) | font only (labels) |
| dramatic 390 | 358x826 / 358x810 | 30444 (0.11) | LAYOUT: column 16 px shorter, label wrap changed ("TÚI ĐEO CHÉO" 1 line vs 2), model and hotspots shift. Bug for P3 |
| mesh-84 1440 | 960x1739 / same | 8058 (0.01) | font only (labels) |
| mesh-84 390 | 358x888 / same | about 4430 (0.02) | font only (labels) |

Owner: approve the three font-only pairs by eye. Dramatic 390 needs P3 fix first, then `--update-snapshots` once for visual spec (not done).

## Bugs (app code, not fixed)
1. `apps/web/src/components/public/site-header.module.css:42` `.nav { overflow-x: auto }`. At 320px, the third nav link (Bộ sưu tập) is clipped: right edge at 386.8 px (viewport 320). Test: `public-responsive-viewports.spec.ts:24` at 320. Fix: let nav wrap or stack on phones, or menu for narrow widths. Relevant because the nav hides a link without any cue.
2. Mobile keyboard drop announcement not seen (see chain failure 2). Unresolved.

## Not run / unverified
- axe (contrast on 6 pages x 2 themes): not run. `@axe-core/playwright` not in repo deps; plan says no new deps.
- Hero pixel test (white image): not run.
- LCP/CLS, bundle KiB vs 199.1 baseline (needs a prod build, which would clash with the running dev `.next`), font preload check: not run. Dev-only check: `/` HTML has 1 preload image (default layout). Editorial layout: hero uses fetchpriority=high, 0 preload (by design, plan decision 5). Combined LCP hint = 1.
- Compose smoke (Caddy, `NEWSLETTER_RATE_LIMIT_MAX_PER_IP=3`, two sources, XFF, server action path): not run. Docker only in WSL, not attempted. Newsletter go-live should stay blocked until run.
- Public header 320 test is red (bug 1), so public project is not fully green.

## Gate concerns
- Full `pnpm e2e` cannot pass while visual is red: content chain (13+ specs) is blocked behind visual dependency. Options: approve Q2 then re-baseline, or move `content-setup` off `visual`.
- Rate limiter dev bucket: 1000 set for e2e. Stack left running with this value.

## Unresolved questions
- Who decides the dev DB content: remove the published `test` collection, or make the collections spec independent of it?
- Keyboard drop announcement (mobile editor): app bug or spec timing?
- Approve visual font-only pairs now, and fix dramatic 390 layout in P3 first?
- Owner for compose smoke run (needs Docker in WSL).

**Status:** DONE_WITH_CONCERNS
**Summary:** Newsletter, editorial and admin content specs added and green (23 tests). Old specs fixed for Q3 and data. Lookbook candidates produced: 3 font-only, dramatic 390 is layout. Axe, hero, LCP/CLS, bundle, font and compose smoke not run.
**Concerns/Blockers:** public header 320 clipping (`site-header.module.css:42`); mobile keyboard drop announcement unresolved; collections delete spec red (dev data); chain blocked by visual dependency; teardown login fragility and snapshot in `test-results/`.

## Prod verification (2026-11-08, compose stack :8080)

Stack: `docker compose --env-file .env -f infra/docker-compose.yml up -d --build` with `NEWSLETTER_RATE_LIMIT_MAX_PER_IP=3` on the shell (compose forwards it; `docker inspect under30ss-api-1` shows `3`, `NODE_ENV=production`). Images rebuilt from current uncommitted code. Build exit 0; no warn/deprecat lines in the compose log (full build log not reviewed).

Mongo and RustFS are shared with the dev stack (dev API `MONGODB_URI` host is `localhost:27017`), so they stayed up. Only `caddy`, `web`, `api` were stopped and removed. Volumes untouched. Dev `:3000` and `:4000` still answered 200 after.

### Smoke chuỗi IP (red team F8)
Run 1 (before one API restart) and run 2 (after `restart api` to clear in-memory buckets) agree.

| Step | Source | Result | RateLimit `r=` | Bucket (pk) |
|---|---|---|---|---|
| A1 POST, no XFF | host, `localhost:8080` | 202 | 2 | A |
| A2 POST, XFF `198.51.100.23` (spoof) | host | 202 | 1 | A (spoof ignored) |
| A3 Server Action, form on `/` | browser, JS on | `?newsletter=ok` | 0 | A |
| A4 Server Action, 2nd submit | browser | `?newsletter=rate` | - | A |
| B1 POST via `http://caddy` | web container | 202 | 2 | B |
| B2 POST via `http://caddy` | web container | 202 | 1 | B |
| A5 POST, no XFF | host | 429 | 0 | A |

- Run 1 (same code): A spoof with XFF `203.0.113.250` still decremented A (r 1 → 0), then 429. B 202, 202, 202, then 429 (r 0).
- Result: PASS. Spoofed XFF from A does not create a bucket (`Caddyfile` replaces client XFF). A and B have different pk, so separate buckets. Server Action forwards the client IP: form submits drained A's bucket (exactly 2 submits), and B stayed 202 after. If the action did not forward XFF, the form would drain the web container bucket (same as B) and B would 429.
- Not covered: spoofed XFF through the browser form, API direct on `api:4000`.

### Hiệu năng `/` (prod image, Playwright Chromium, 1 load + full scroll per viewport)

| Metric | 1440x900 | 390x844 | Ngưỡng | Kết quả |
|---|---|---|---|---|
| LCP | 368 ms (run 1: 328 ms) | 328 ms | - | LCP = model image, preloaded |
| CLS | 0 (no layout-shift entries) | 0 | < 0.1 | PASS |
| `link[rel=preload][as=image]` (DOM) | 1 | 1 | 1 hint | PASS |
| `fetchpriority="high"` on img | 0 | 0 | - | Note F1 |
| `link[rel=preload][as=font]` (DOM) | 8 | 8 | - | PASS |

Note: raw HTML of `/` has no image preload. React emits it when the streamed lookbook renders. Measured in DOM only.

### Font

| Check | Result |
|---|---|
| Playfair vietnamese subset (`U+1EA0-1EF9`) loaded | yes, `ece6651c07dc3133-s.p.0t8ljjjn9wtsx.woff2`, also preloaded |
| Playfair latin subset | loaded, preloaded (`9d036f80216c14ee`) |
| Playfair latin-ext / cyrillic | loaded on demand, not preloaded (Next default) |
| `document.fonts.check` for `ệ` in Playfair | true |
| h2 "Bộ sưu tập" computed font-family | Playfair first, then fallback |
| computed `--font-display` | `"Playfair Display", "Playfair Display Fallback", Georgia, serif` (non-empty) |

### Hero contrast (formula, no pixel)
- No HeroSlider published on the shared DB: no caption node, headings are the default layout (FeaturedLookbook, CollectionTiles, OutfitList, Gallery, Newsletter). Pixel test not run.
- Scrim: `apps/web/src/styles/client-theme-tokens.css:42`. Caption `::before` is 190% of caption height: `apps/web/src/components/home-sections/hero-slider-caption.module.css:49-58`.
- Caption top sits at 1/1.9 = 0.526 of scrim height from bottom. Alpha there = 0.611. Ink `#111` over pure white photo = rgb(110).
- Text `--client-on-ink: #ffffff` (`client-theme-tokens.css:9`): 5.10:1. Threshold 4.95:1 = rgb 112. 4.5:1 = rgb 118. PASS by formula.
- Under 768px the caption sits on solid `--client-ink` (`hero-slider-caption.module.css:8`): white on #111 ≈ 18.9:1.

### Bundle (`scripts/perf/measure-first-load-js.mjs`)
- Ran against `http://localhost:8080` (prod web container). No `next build` in `apps/web`, dev `.next` untouched.
- `/`: 199.8 / 199.8 / 199.8 KiB (median 199.8), 10 scripts. Baseline 199.1, delta +0.7 KiB, budget ≤ 214.1 KiB. PASS.
- Caveat: wire size depends on Caddy encoding. Same 10 scripts via curl: gzip 199.5 KiB, zstd 208.8 KiB. Baseline encoding not known.

### Cleanup and state
- Consent: snapshot had no `newsletterConsent`, `newsletterConsentVersion` 24. Consent saved for the run (version 25). Restored: writable keys equal snapshot, consent absent. Version counter stays 25 (monotonic, not reset through API). Dev home shares the DB and showed the smoke consent for the run window.
- Smoke subscribers: 11 `smoke+…@example.test` created, all 11 deleted. Re-list shows 0 left.
- Admin login: 1 (20/15 min limit untouched).
- `docker compose down` not run as written. Mongo and RustFS would stop and break the dev stack. Ran `stop` + `rm -f` on `caddy`, `web`, `api` only.

### Findings (no app code edited)
- F1 (low): LCP preload has no `fetchpriority="high"`. `apps/web/src/components/lookbook/lookbook-model-figure.tsx:18` sets `preload: true` only. Browser treats preload as high priority, so not blocking. Decide whether code-standards wants `fetchPriority` too.
- F2 (low): `infra/caddy/Caddyfile:3` `encode zstd gzip`. For these chunks zstd (208.8 KiB) is bigger than gzip (199.5 KiB). Measure before changing.
- Public header 320 clipping, mobile keyboard drop, visual lookbook: still open from earlier run, not re-checked here.

### Not run / unverified
- axe: `@axe-core/playwright` not in deps, plan forbids new deps. Not run.
- Hero pixel test: needs a published HeroSlider on the shared DB. Not run.
- Lighthouse CLI: not run. Performance API used instead.
- Spoofed XFF through browser form: not run.

### Unresolved questions
- Publish a test HeroSlider (white image) on the shared DB to run the pixel test? Or accept formula?
- Accept consent version counter 25 (was 24)?
- Compose `down`: keep mongo/rustfs running for dev, or should the next run use a separate DB?
- Lock the `zstd` vs `gzip` order in Caddy after F2 measurement?

**Status:** DONE_WITH_CONCERNS
**Summary:** Smoke PASS (A bucket 2 sources, XFF spoof ignored, form path counts into client IP, B 202 after form drain). CLS 0, LCP 328-368 ms, 1 image preload, Playfair vietnamese preloaded and loaded. Bundle `/` 199.8 KiB vs 199.1 (+0.7, budget +15). Hero 5.10:1 by formula (pixel not run). axe not run.
**Concerns/Blockers:** `down` changed to app-only stop (shared mongo with dev). Consent version counter 24→25 on shared DB. F1/F2 low. Hero pixel and axe still open.
