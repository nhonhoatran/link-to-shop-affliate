# Review fixes (H1, M1-M4, Low 1/2/4/5)

- H1: cards eager+fetchPriority high only when `firstRow && highPriority`; grids pass `highPriority` only for index 0 (so /looks and /collections also emit 1 preload). `LookbookLayout`/`LookbookModelFigure` got `preload` (default true); `FeaturedLookbookView` passes `preload={priority}`. curl: `/`=1, `/looks`=1, `/collections`=1 image preloads.
- M1: `shownOutfitSlugs` in `home-section-resolver-service.ts` also excludes the FeaturedLookbook slug; new API test; two existing tests got one more outfit so Gallery is not empty.
- M2: new client `newsletter-status-message.tsx` (focus on result, tabIndex=-1, still SSR-visible); email input `aria-describedby` when `invalid`.
- M4: `stale` added to `NEWSLETTER_RESULTS`; 409 -> stale; copy in `home-section-copy.ts`; tests updated.
- M3: `docs/deployment-guide.md` notes on NODE_ENV=production / trust proxy / CDN trusted_proxies.
- L1: CampaignBanner now uses `attachSectionImageUrls`. L2: `MAX_EMAIL_LENGTH`, new shared `MAX_SECTION_ID_LENGTH`, `MAX_PRIVACY_LABEL_LENGTH`. L4: marquee checkbox has fixed `aria-label`. L5: `SectionShell` `labelledBy` prop, newsletter h2 has id.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` (shared 164, api 223, web 664) green.
