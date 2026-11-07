# Research: Motion + CSS animations for Next.js 16 App Router (under30ss web)

Date: 2026-11-07 | Scope: `apps/web` only | No source code modified

## Verified environment

- `apps/web/package.json`: `next ^16.4.5`, `react ^19.3.1`. Installed: next 16.4.5, react 19.3.1 (`node -p`).
- `motion` is NOT yet a dependency of `apps/web`.
- `npm view motion@14.10.1`: exists. Peer: `react ^18||^19`, `react-dom ^18||^19`, `remix ^3.1.0`. Its only runtime dep is `framer-motion@14.10.1` (+ `tslib`). Motion is a thin re-export layer; real code lives in `framer-motion`.
- Package exports (`motion@14.10.1/package.json`): `./react`, `./react-client`, `./react-m`, `./react-mini`, `./react-animate-view`, `./debug`, `./mini`, etc.
- Existing e2e: `e2e/public-viewport-and-no-js.spec.ts:61` uses `test.use({ javaScriptEnabled: false })`. `e2e/visual-reference-screenshots.spec.ts:21` uses `emulateMedia({ reducedMotion: 'reduce' })` and `screenshot({ animations: 'disabled' })`.
- Existing reduced-motion handling: `apps/web/src/app/globals.css:37` (global kill rule), `apps/web/src/components/lookbook/lookbook.module.css:188` (per-component).
- Lookbook connectors: `apps/web/src/components/lookbook/lookbook-interactions.tsx:30-60`. Paths start as `[]`, are measured inside `useEffect` (so SSR has no connectors), re-measured on `ResizeObserver`, `load` (capture), and `document.fonts.ready`.

## Sources (5 web lookups used)

| # | Source | Used for | Credibility |
|---|---|---|---|
| W1 | https://motion.dev/docs/react-motion-component | import paths, RSC note, `whileInView`/`viewport.once`, SSR output of `initial` | Official, maintainer |
| W2 | https://motion.dev/docs/react-lazy-motion | `LazyMotion`, `domAnimation`, `m`, `strict`, bundle claims | Official (page did not cover `domMax`) |
| W3 | https://nextjs.org/docs/app/guides/view-transitions (lastUpdated 2026-10-15) | View transitions in App Router, React 19.3 `ViewTransition`, browser notes | Official, Next.js |
| W4 | https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline | Baseline status | Official MDN (compat table truncated, not read) |
| Local | `node_modules` typings + tarballs of `motion@14.10.1` / `framer-motion@14.10.1` (`npm pack`) | exports, type names, prop names | Ground truth for installed code |

Verified in code/typings (not just docs): `motion/react` exports `LazyMotion`, `MotionConfig`, `domAnimation`, `domMax`, `m`, `useInView`, `useMotionValueEvent`, `useReducedMotion`, `useScroll`, `useTransform`, `animate`. `MotionConfig.reducedMotion?: ReducedMotionConfig` where `ReducedMotionConfig = "always" | "never" | "user"`. `LazyMotion.strict?: boolean`.

---

## Q1. Motion + RSC, import path, bundle

**Import path**
- Client leaves: `import { motion, LazyMotion, domAnimation } from "motion/react"` (W1, typings verified).
- `motion/react-client` exists and W1 documents it for RSC setups. CAVEAT: in the tarball, `framer-motion/dist/es/client.mjs` has NO `"use client"` directive (grep count 0). RSC-safety of this entry is therefore UNVERIFIED here. Do not rely on it.
- Safe pattern regardless: keep pages as Server Components, put `'use client'` in a small leaf file that imports from `motion/react`.

```tsx
// components/motion/reveal.tsx
'use client';
import { m, LazyMotion, domAnimation } from 'motion/react';   // m = light component (see below)
```

Rules:
- Motion components cannot be created inside a render. W1: `motion.create()` in render "will make a new component every render, breaking your animations".
- Server Components cannot pass functions/motion components across the boundary. Pass plain data (strings, numbers) as props.
- W1: `motion` components are SSR-compatible. The server emits the `initial` style (W1 example comment: "Server will output `translateX(100px)`"). This matters for Q7.

**Bundle (vendor-stated, NOT measured here)**
- W2: full `motion` component "around 43kb". `m` + `LazyMotion`: "about 5kb for the initial render", feature subsets loaded sync/async.
- W2 does not list what `domAnimation` excludes. From memory (unverified): `domMax` adds drag and layout animations. Check `framer-motion/dist/es/*` before relying on it.
- Measure with `next build` output or `@next/bundle-analyzer` before committing to a number. (Open item.)

**LazyMotion + `m` (W2)**

```tsx
// components/motion/motion-provider.tsx
'use client';
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
```

```tsx
'use client';
import * as m from 'motion/react-m';     // W2: m component import path
export function FadeIn({ children }: { children: React.ReactNode }) {
  return <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{children}</m.div>;
}
```

- `strict` (W2, typings verified) throws if a full `motion.*` component renders inside `LazyMotion`. Use it to enforce the small bundle.
- Mount `MotionProvider` only in segments that animate (not the admin tree unless needed).

---

## Q2. Page transitions

Verified:
- W3: `<ViewTransition>` ships in React 19.3 (installed react 19.3.1 contains `ViewTransition`). "View transitions work in the App Router with no configuration." Route navigations are transitions, so `<ViewTransition>` activates automatically.
- W3: animations need `startTransition`/`<Suspense>`/`useDeferredValue` (route navigations count). Browser support: Chromium 125+. "Without browser support ... the transitions do not animate." Safari/Firefox may differ.
- Config flag: none found. `grep viewTransition` in installed `next/dist/server/config-shared.d.ts` returned nothing. Do NOT add `experimental.viewTransition`. (Existence of that file not separately confirmed.)
- `Link transitionTypes` prop and `router.push(..., {transitionTypes})` exist (W3). Not needed for this project unless directional motion is wanted.

Options:

| Option | How | Pros | Cons | Fit |
|---|---|---|---|---|
| A. CSS fade in `template.tsx` | `@keyframes fade-in` on wrapper; `template.tsx` remounts per navigation | Zero JS, no bundle, works with JS off, no hydration risk | Plain fade only, no shared-element morph | Best default |
| B. React `<ViewTransition>` | Wrap thumbnail + detail hero with same `name` | Real shared-element morph (lookbook thumb -> detail) | Newer API, Safari/Firefox inconsistent, needs `startTransition`-style navigation | Only if product wants morph |
| C. `AnimatePresence` + motion | Exit animations on route change | Familiar API | Poor fit: App Router unmounts the old route without exit hooks; needs client-router hacks | Avoid |

```tsx
// app/template.tsx  (Server Component, no 'use client' needed)
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
```

```css
/* route-fade.module.css or globals.css */
.route-fade { animation: route-fade-in 220ms ease-out both; }
@keyframes route-fade-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .route-fade { animation: none; } }
```

Note: CSS keyframes run without JS, and `both` ends at opacity 1. No-JS users still see the page.

---

## Q3. Staggered load reveal + scroll reveal for a card grid

Options ranked:

| Option | No-JS safe | Bundle | Support | Code | Verdict |
|---|---|---|---|---|---|
| 1. CSS `animation` (load stagger) + `animation-timeline: view()` inside `@supports` | Yes (default state visible) | 0 kB | timeline: W4 says "Newly available" (Baseline 2026); per-browser matrix NOT read | Low | **Recommended** |
| 2. `motion` `whileInView` + `viewport={{ once: true }}` | Only if `initial` is gated (see Q7) | ~5kb LazyMotion (W2 claim) | motion handles it | Medium | Use if JS choreography needed |
| 3. Hand-rolled `IntersectionObserver` | Only if gated | 0 kB | broad | Highest | Only if 1 and 2 rejected |

Option 2 (verified API, W1):
```tsx
'use client';
import { m } from 'motion/react';
export function RevealCard({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: i * 0.06 }}   // per-item delay; stagger helper not verified
    >
      {children}
    </m.div>
  );
}
```

Option 1 (recommended, pure CSS):
```css
/* card-grid.module.css */
.card {
  animation: card-in 500ms ease-out both;
  animation-delay: calc(var(--i, 0) * 60ms);   /* set style={{ '--i': index }} */
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}

/* scroll-linked reveal, progressive enhancement only */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .card {
      animation: card-in linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 30%;
      animation-delay: 0ms;   /* timeline replaces time-based delay */
    }
  }
}
@media (prefers-reduced-motion: reduce) { .card { animation: none; } }
```

Caveats:
- `animation-timeline` browser matrix unverified (W4 compat table truncated). Treat unsupported browsers as "show immediately" (the default), which is the intended fallback.
- Load-stagger and scroll-timeline should not both apply to the same element. Pick one per list (load stagger for above-the-fold; scroll reveal for below-fold grids).

---

## Q4. SVG path draw-in, animate once after measurement

Facts from code: `lookbook-interactions.tsx` sets paths in `useEffect`, so the first render has no paths. `ResizeObserver` and `load` re-measure and change `d`. Resize must not replay the draw.

Approach: `pathLength="1"` normalizes dash values, so no DOM length measurement is needed. A one-shot `drawn` flag switches from `pending` to `drawn` once. Later `d` changes keep `drawn=true`, so nothing replays.

```tsx
'use client';
import { useEffect, useState } from 'react';
import styles from './connectors.module.css';

type Path = { id: string; d: string };

export function ConnectorLines({ paths, ready }: { paths: Path[]; ready: boolean }) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (drawn || !ready || paths.length === 0) return;
    // Let the pending state paint first, then flip once.
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [drawn, ready, paths.length]);

  return (
    <svg aria-hidden="true">
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          pathLength={1}
          className={drawn ? styles.drawn : styles.pending}
        />
      ))}
    </svg>
  );
}
```

```css
/* connectors.module.css */
.pending, .drawn { transition: stroke-dashoffset 900ms ease-out; stroke-dasharray: 1; }
.pending { stroke-dashoffset: 1; }
.drawn   { stroke-dashoffset: 0; }
@media (prefers-reduced-motion: reduce) { .pending, .drawn { transition: none; } }
```

Notes:
- `ready` should be true only after `document.fonts.ready` and images load, otherwise the one-shot fires on a wrong geometry. The lookbook currently measures before images load. Pass `ready` from the existing `load`/`fonts.ready` logic.
- `pathLength` and dash scaling are standard SVG; NOT verified in browsers in this session.
- Alternative with motion: `m.path` + `initial={{ pathLength: 0 }}` + `animate={drawn ? { pathLength: 1 } : {}}`. Same one-shot logic. Only worth it if motion is already in use.
- Also ensure `d` changes do not re-trigger: `drawn` never flips back to false. Verify in a resize test.

---

## Q5. Hide-on-scroll-down / show-on-scroll-up header

Ranked:

| Option | Re-renders | Deps | Verdict |
|---|---|---|---|
| 1. Passive scroll listener + rAF + `data-hidden` attribute + CSS transition | 0 (DOM attribute only) | 0 | **Recommended** |
| 2. `useScroll` + `useMotionValueEvent` + `animate`/`m.header` | 0 per frame; re-render only on direction flip if state is used | motion (~5kb) | Only if motion already present |
| 3. `useState` updated on every scroll | Every frame | 0 | Reject |

```tsx
'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './site-header.module.css';

const THRESHOLD = 4;     // px, ignore jitter
const REVEAL_TOP = 80;   // px, always show near top

export function SiteHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < THRESHOLD) return;
      el.dataset.hidden = String(delta > 0 && y > REVEAL_TOP);
      lastY = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  return <header ref={ref} className={styles.header}>{children}</header>;
}
```

```css
/* site-header.module.css */
.header { position: sticky; top: 0; transition: transform 200ms ease-out; }
.header[data-hidden='true'] { transform: translateY(-100%); }
@media (prefers-reduced-motion: reduce) { .header { transition: none; } }
```

Notes:
- Add `focusin` handler that forces `data-hidden="false"` so keyboard focus is never hidden.
- Hidden state is only set on scroll, so SSR and no-JS show the header (no `data-hidden` attribute).
- Transform only: no layout shift.

---

## Q6. Reduced motion + screenshot stability

- `MotionConfig reducedMotion="user"` (typings verified: `"always" | "never" | "user"`). `"user"` follows the OS/browser preference. What exactly motion disables under `"user"` is NOT verified here (W1/W2 did not cover it).
- Hook (verified export): `useReducedMotion()` for conditional logic, e.g. choosing an opacity-only variant.
- CSS: keep the `@media (prefers-reduced-motion: reduce)` blocks in every module (pattern already used in `globals.css:37` and `lookbook.module.css:188`).
- Playwright: `emulateMedia({ reducedMotion: 'reduce' })` is already in `visual-reference-screenshots.spec.ts:21`. Expected to make `matchMedia('(prefers-reduced-motion: reduce)')` true, so `MotionConfig "user"` should honor it. UNVERIFIED end-to-end: add an assertion in a spec.
- `screenshot({ animations: 'disabled' })` (already used) covers CSS animations/transitions and Web Animations per Playwright docs (from memory, not fetched). It does NOT cover arbitrary JS-driven motion (e.g. spring physics in rAF). That is why `reducedMotion="user"` plus emulation is needed. Verify by screenshot diff.
- Keep the e2e reduced-motion emulation in the visual project config so every new screen inherits it.

---

## Q7. Transform/opacity only, CLS, SSR and no-JS

- Animate only `transform` and `opacity` (compositor-friendly, no layout). The header example and reveal examples comply. Avoid animating `top`, `height`, `width`, `margin`.
- CLS: transforms do not shift layout. For reveal, reserve space (the element is in the flow with its final box). Do not use `height: 0 -> auto` (layout shift).
- SSR: W1 confirms motion components render their `initial` style into server HTML. So `initial={{ opacity: 0 }}` on text content makes it invisible with JS disabled.
- Playwright `toBeVisible()` checks non-empty box and no `visibility: hidden`, NOT opacity (from memory, not fetched). So the existing no-JS test (`public-viewport-and-no-js.spec.ts:61`) would PASS while real users see nothing. Add an explicit check:

```ts
// add to the no-JS describe block
const opacity = await page.locator('h1').evaluate((el) => getComputedStyle(el).opacity);
expect(opacity).toBe('1');
```

- Gate JS-dependent hidden states: either use CSS keyframes (no-JS safe, Q3 option 1), or gate `initial` hidden states behind a class added by JS. Option: `@media (scripting: enabled)` (MDN Media Queries L5 feature; NOT verified in this session).
- Hydration: keep the first client render identical to SSR. Use `initial={false}` for above-the-fold content so there is no flash.
- Animating only decorative/secondary content (not names, descriptions, affiliate links) keeps the no-JS guarantee trivial.

---

## Trade-off summary

| Need | Choice | Why |
|---|---|---|
| Route fade | CSS in `template.tsx` | 0 JS, no-JS safe |
| Shared-element morph | React `<ViewTransition>` (defer) | Only real morph option; browser-gated |
| Card reveal | CSS + `animation-timeline` (`@supports`) | 0 kB, graceful fallback |
| Connector draw | CSS `pathLength` one-shot class | No measurement, no replay on resize |
| Header hide | Passive scroll + `data-hidden` | 0 deps, 0 per-frame render |
| JS choreography (rare) | `motion/react` + LazyMotion + `m` + `strict` | Smallest motion bundle |

## Adoption risk

- `motion@14.10.1`: wrapper over `framer-motion@14.10.1`. Maturity, community size, and breaking-change history NOT verified (npm metadata only). Pin exact version; the project's `package.json` has no motion yet.
- React `ViewTransition`: new in React 19.3, Chromium-first. Medium risk.
- `animation-timeline`: Baseline 2026 "Newly available" (W4). Low risk with fallback.
- Next.js: no config flag needed (W3). Low risk.

## Recommendations for this project (ranked)

1. **CSS first.** Route fade (`template.tsx`), card reveal (CSS + `@supports animation-timeline`), SVG draw (`pathLength` one-shot class), header (passive scroll + `data-hidden`). Zero deps, works without JS, no hydration risk. Matches YAGNI/KISS.
2. **Add `motion` only if** a leaf needs JS-driven choreography. If added: pin `motion@14.10.1`, use `motion/react` in `'use client'` leaves, `LazyMotion domAnimation strict`, `m.*` components, `MotionConfig reducedMotion="user"` in one provider.
3. **Defer `<ViewTransition>`** until product asks for shared-element morph (lookbook thumb -> detail). Do not add `experimental.viewTransition`.
4. **Test updates:** (a) add computed-opacity assertion to the no-JS test; (b) add reduced-motion assertion for the visual project; (c) add a resize test for connector draw-once.
5. **Lookbook:** pass a `ready` flag (after `fonts.ready` + image `load`) into the connector draw; keep the existing measurement logic.

## Limitations

- No code or dependency installed; bundle numbers are vendor claims, not measured.
- W4 compat table truncated; per-browser support for `animation-timeline` and `ViewTransition` not confirmed.
- `motion/react-client` RSC behavior not verified (framer-motion client entry lacks `"use client"`).
- `domAnimation` vs `domMax` feature lists not verified.
- Playwright `toBeVisible` and `animations: 'disabled'` behavior from memory.
- Only 5 web lookups; W2 did not cover `domMax`, `MotionConfig` details, or `useScroll`.

## Unresolved questions

1. Does `motion/react-client` need to be used in server files, or is `motion/react` in `'use client'` leaves always correct? (Needs a Next build check.)
2. Measured bundle delta for `m` + `domAnimation` in this app (run `next build`)?
3. What does `reducedMotion="user"` disable exactly in motion 14.10.1?
4. Browser matrix for `animation-timeline: view()` and `ViewTransition` (Safari/Firefox) for the target audience?
5. Is a shared-element morph (lookbook thumb -> detail) actually wanted? Product decision; default is no.
6. Should the admin tree get any motion, or stay static?

**Status:** DONE_WITH_CONCERNS
**Summary:** CSS-first recommendation: route fade via `template.tsx`, card reveal via CSS plus `@supports animation-timeline`, one-shot SVG draw via `pathLength`, header hide via passive scroll plus `data-hidden`. `motion@14.10.1` only for rare JS-driven leaves (LazyMotion + `m` + `strict`, `MotionConfig reducedMotion="user"`). Defer React `ViewTransition`. Report at `D:\MyProject\affliate\plans\261107-0913-professional-ui-refactor-client-admin\research\researcher-01-motion-animation-report.md`.
**Concerns/Blockers:** Bundle sizes are vendor claims, unmeasured. `motion/react-client` RSC safety unverified. Browser support for `animation-timeline` and `ViewTransition` not fully confirmed. Existing no-JS e2e test would not catch opacity-0 content (add assertion).
