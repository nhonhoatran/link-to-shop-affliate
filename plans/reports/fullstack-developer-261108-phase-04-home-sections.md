# Phase 4 report: home sections restyle + 4 new views + newsletter form

Status: DONE_WITH_CONCERNS (code + unit tests green; live API run and visual check not done).

## Spike PRG no-JS (step 1)
Route tam `app/newsletter-prg-spike` (da xoa). Form Server Action + `redirect('/newsletter-prg-spike?x=..#note-1')`.
Render ra `<form method="POST" encType="multipart/form-data">` + hidden `$ACTION_ID_*`. POST bang curl (khong JS):
`HTTP/1.1 303 See Other`, `Location: /newsletter-prg-spike?x=hello#note-1`; GET theo Location render `id="note-1" role="status"` voi ket qua.
=> hash giu nguyen trong Location, khong can phuong an du phong. Chua thu tren trinh duyet that (curl only).

## Files
Created (home-sections): campaign-banner-view.tsx/.module.css, marquee-view.tsx/.module.css, gallery-view.tsx, gallery-mosaic.module.css,
gallery-image-sizes.ts, gallery-mosaic-layout.ts, newsletter-signup-view.tsx/.module.css, newsletter-submit-button.tsx,
hero-slider-caption.module.css (tach tu hero-slider).
Created (lib): lib/newsletter/{subscribe-newsletter-action,newsletter-client-ip,newsletter-anchor}.ts (anchor helper them ngoai plan, dung chung view + action).
Modified: home-section-views.ts, home-section-list.tsx (LCP theo HOME_SECTION_META.hasImage, prop newsletter), home-section-copy.ts, section-shell.tsx/.css
(eyebrow, action, hairline, SectionEyebrow, SectionViewAll = text link, NewsletterFormState), hero-slider-{view,autoplay}.tsx + css, outfit-list-view.tsx/.css,
scroll-rail.tsx/.css, collection-tiles-view.tsx, text-with-image-view.tsx/.css, faq-view.tsx/.css, commitments.module.css, app/(public)/page.tsx, lib/api-client-server.ts (apiPost).
Shared (transfer): default-home-content.ts reorder (FeaturedLookbook, CollectionTiles, OutfitList, Gallery, NewsletterSignup), home-section-schemas.test.ts order assertion.
Tests created: gallery-mosaic-layout, marquee-view, campaign-banner-view, gallery-view, newsletter-signup-view, lib/newsletter/{subscribe-newsletter-action,newsletter-client-ip}, lib/api-client-server-post.
Tests modified: views-client-safe (adds editorial fixtures, newsletter prop; regex untouched), home-section-list (LCP + newsletter state), app/home-page (searchParams, result param, 5-section default order).

## Checks run
- `pnpm exec tsc --noEmit` (apps/web): clean.
- `pnpm exec eslint` on touched dirs: clean.
- vitest apps/web full: 97 files / 660 tests pass. packages/shared: 7 files / 164 tests pass.
- Live: `curl :3000/` 200; `/api/public/home` default order is now FeaturedLookbook, CollectionTiles, OutfitList, Gallery (Newsletter hidden: no consent saved).
  P2 endpoint is live (`POST /api/public/newsletter {}` -> 400). NOT done: real no-JS submit (needs admin to save consent first; admin login not performed).
- Not run: Playwright e2e/visual (lead), no browser screenshots. CSS (hero scrim/mobile panel, marquee, mosaic, banner) not visually checked.

## Decisions / deviations
- Hero: mobile (<768px) text on solid ink panel under photo; >=768px scrim via `::before` at 190% height of caption so all text lies in bottom ~53% (alpha >= 0.6). Arrows hidden below 768px (swipe + dots remain). Counter `01 / 03` in an ink chip; dots strip has ink background so they stay visible on bright photos.
- Marquee and CampaignBanner stay inside the container (no full-bleed prop): avoids 100vw horizontal-scroll hack. Add later if wanted.
- CampaignBanner/NewsletterSignup use `label=heading` (aria-label) on the section with own h2 inside the panel, not the shell title row.
- OutfitList "Xem tat ca" stays per tab at panel end (href differs per tab); CollectionTiles uses header action.
- Action treats any 2xx ApiError (e.g. 202 with non-JSON body) as ok; 409 expires `public-home` tag; unexpected throw -> `error`.
- Action posts `source: 'home'` itself (form has no source field; contract only allows 'home').
- Files owned by the pending list not touched: outfit-list-tabs.tsx, hero-image-props.ts, commitments-view.tsx, featured-lookbook-view.tsx, outfit-card-rail.tsx (no change needed).
- Observed on `/` (not mine): 5 `<link rel=preload as=image>` + 4 eager imgs from lookbook area; the LCP "only one priority image" criterion for the whole page is not met by pre-existing lookbook code. Gallery/Banner preload only when `priority`.

## Unresolved
- Real no-JS submit + reduced-motion computed style + 320/390/768/1024/1440 visual pass pending (needs saved consent / published 11-type layout via admin).
- Q4 consent copy/link still open (shared concern).
- Browser check of the hash scroll after 303 (curl verified headers only).
