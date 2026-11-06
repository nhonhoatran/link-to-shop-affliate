# Phase 04 report: Lookbook UI components

## Public API (unchanged from phase file)
`apps/web/src/components/lookbook/index.ts`:
```ts
export { LookbookLayout } from './lookbook-layout';
export type { LookbookLayoutProps } from './lookbook-layout';
// LookbookLayoutProps = { outfit: PublicOutfitDto; headingLevel?: 'h1' | 'h2' }  (default 'h1')
```
Import: `import { LookbookLayout } from '@/components/lookbook'`. `LookbookLayout` is a Server Component (no `'use client'`); the only client file is `lookbook-interactions.tsx`. No fetch. Items are sorted with `compareOutfitItems`, so P5/P6 may pass them in any order. Empty `affiliateUrl` renders `href="#"` + `aria-disabled="true"` (no target/rel), click prevented by the client part.

DOM contract other phases/e2e can rely on: root `section[data-lookbook]`; `ul[data-side=left|right]`; card and hotspot are both `a[data-item-id=<id>]` (hotspot also has `data-hotspot`); active state = `data-active-id` on root + `data-active` on matching card, hotspot, svg path.

## Checklist, line by line
- root holder: `section[data-lookbook]`, CSS grid `minmax(0,var(--lookbook-col-left|model|right))`, `max-width: var(--lookbook-max-width)`, `margin-inline:auto`, gaps `--lookbook-gap` (column) / `--lookbook-row-gap` (column list gap + vertical padding). `lookbook.module.css:1`.
- outfit title: tag = `headingLevel`. The reference images show no title on the canvas, so it is visually hidden (sr-only clip) but kept in DOM. Because hidden, `--page-title-size / --font-weight-bold / --color-ink` are NOT applied (nothing to style). Deviation, see concerns.
- item column: `<ul>` per side, `<li>` per item, `flex column; justify-content: space-between` with row-gap as minimum spacing; grid `align-items: stretch` makes it span the model height.
- item card: one `<a>` wraps image + `<hN>` name + subtitle + description. href/target/rel from shared `affiliateLinkProps` (`target=_blank`, `rel="sponsored nofollow noopener noreferrer"`). Image alt = name. Name heading = h2 under h1, h3 under h2. Empty link behaviour as above.
- type bundles: name `--lookbook-title-size`, bold, uppercase, `--lookbook-line-height`, `--color-ink`; subtitle `--lookbook-subtitle-size`, regular, ink; description `--lookbook-description-size`, `--color-muted`, `display:none` under `@media (max-width: 639.98px)` (comment points to the token). DEVIATION: no line-clamp-1, see concerns.
- model figure: `<figure>` with `next/image` (`width/height` from DTO, `sizes`, `preload` for LCP; `priority` is deprecated in Next 16.4.5, checked in `get-img-props.d.ts`). Hotspots `<a aria-label=name>` same href/target/rel, `left:x%; top:y%`, centered with translate.
- connector: one `<svg aria-hidden="true" focusable="false">` overlay (`inset:0`, `pointer-events:none`), stroke `--color-line`, width `--lookbook-connector-width` (active: x2 via calc), marker size from `--lookbook-arrow-size`, curve from `--lookbook-curve-ratio`. Arrow size + curve ratio read via `getComputedStyle(root).getPropertyValue` in `measure-connectors.ts`; no number literals (parse fail -> 0). Redraw on ResizeObserver, any descendant `load` (capture), `document.fonts.ready`.
- interaction: pointerover/out (touch ignored, and ignored when `matchMedia('(hover: hover)')` is false) and focusin/out (only `:focus-visible`) on the root, state `hoverId ?? focusId`, applied as `data-active*` attributes. Active image `scale(--lookbook-hover-scale)` + drop-shadow, path stroke x2, hotspot `::after` pulse, others `opacity: var(--lookbook-dim-opacity)`. Transitions use `--duration-fast/base` + `--easing-standard`. Works both ways card <-> hotspot (same `data-item-id`). Pulse and transitions off under `prefers-reduced-motion`.
  - Note: "hover only under @media (hover: hover)" is enforced in JS (matchMedia + non-touch pointer), not in CSS, because the active attribute is shared by hover and keyboard focus.
- focus ring: no component focus style; the global `:focus-visible` is used.
- tokens only: colour/spacing/type all `var(--...)`. Remaining literals: `639.98px` media query; `0`; keyframe `from/to` values; `calc(... * 2)` stroke multiplier; `calc(--duration-base * 4)` pulse duration; the `sizes` strings.
- 320px / 11px: 3 columns with `minmax(0, ...)`, `overflow-wrap:anywhere` on cards; all text sizes use clamp with 11px min from tokens. Visual verification at 320/390px not done here (no browser run); left for P7.
- not copied from reference: no baked threads, no 941px pixel sizes (all ratios/tokens).

## Token gaps (existing token used instead)
- Drop-shadow colour: no `--lookbook-shadow-color`; used `--color-muted`.
- Pulse duration: no token; `calc(var(--duration-base) * 4)`.
- Hotspot size: no `--lookbook-hotspot-size`; used `--space-5` (24px).
- `sizes` strings (`(min-width: 960px) 278px, 29vw` / `403px, 42vw`) are literals derived from `--lookbook-max-width` and the 29/42/29 ratio; must be updated by hand if those tokens change (noted in `lookbook-image-sizes.ts`).
- Item image aspect ratio token `--lookbook-item-image-ratio` unused: images use DTO width/height.

## Files (all under apps/web)
src/components/lookbook/: `index.ts`(2), `lookbook-layout.tsx`(25), `lookbook-item-column.tsx`(19), `lookbook-item-card.tsx`(31), `lookbook-model-figure.tsx`(24), `lookbook-hotspot.tsx`(16), `lookbook-interactions.tsx`(130, client), `compute-connector-paths.ts`(42), `measure-connectors.ts`(48), `lookbook-link-props.ts`(10), `lookbook-image-sizes.ts`(3), `lookbook.module.css`(181).
test/lookbook/: `compute-connector-paths.test.ts`, `lookbook-layout.test.tsx`, `lookbook-interactions.test.tsx`.
Also ticked Todo + Status in `plans/261106-1201-under30ss-shop-the-look/phase-04-lookbook-ui-components.md`. plan.md untouched. No deps/config/tokens/globals edited. grep for private forms of address on components + tests: no match.

## Results (repo root)
- `pnpm --filter @under30ss/web test`: `Test Files 4 passed (4)`, `Tests 28 passed (28)` (6 existing api-client + 22 new: 7 connector paths, 7 layout, 8 interactions incl. hover card -> active, hover hotspot -> card active, keyboard focus hotspot -> card active, focus card -> hotspot active, touch ignored, disabled link prevented).
- `pnpm --filter @under30ss/web typecheck`: `tsc -p tsconfig.json --noEmit` exit 0, no output.
- `pnpm lint`: `eslint .` exit 0, no output.
- NOT run: `next build` (no page imports the components yet, so CSS module compile under Turbopack is unverified; all selectors contain a local class to satisfy CSS-modules purity), real browser visual check.

## Concerns / for P5, P6, P7
1. Description: only one breakpoint literal allowed, so "line-clamp 1 on narrow screens + hidden below 639.98px" collapses to "hidden below 639.98px, full text above". Add a clamp token/breakpoint if wanted.
2. Connectors are quadratic curves bowing upward from the image's inner edge centre to the hotspot centre (arrow tip at hotspot centre, ring around it stays transparent). Looks unverified against the references; may cross when items are evenly spread vs. hotspot heights. Tune `--lookbook-curve-ratio` in P7 visual pass.
3. Without JS, an empty-link item jumps to `#` on click (preventDefault needs the client component). Admin preview (P6) is always hydrated, fine.
4. Hotspot is a 24px target; small for touch but tap opens the same link as the card.
5. Preview in admin (P6) must be rendered inside a container with the design tokens loaded (globals.css already imports them).

**Status:** DONE_WITH_CONCERNS
**Summary:** `LookbookLayout` (server) + client `LookbookInteractions` implemented with tokens-only CSS, connector paths computed from real DOM, two-way hover/focus. 28 web tests, typecheck, lint pass.
**Concerns/Blockers:** No line-clamp (single breakpoint rule); title visually hidden so title tokens unused; token gaps listed above; visual check and `next build` with the component are not done (P5/P7).
