# E2E close-out (editorial redesign)

Date: 2026-11-08. Dev stack :3000/:4000 untouched. Not committed.

## Result
Full `pnpm e2e` (no `--no-deps`): **111 passed, 0 failed** (2.0 min). Visual re-run without flag: 4/4. Root `pnpm lint`, `pnpm typecheck` green; `pnpm test` green (api 223, web 664) run after the header CSS change.

## Items
1. Header 320px (app bug): `apps/web/src/components/public/site-header.module.css` `.nav` now `flex-wrap: wrap; justify-content: center` instead of `overflow-x: auto`. All links visible, no sideways scroll. Spec unchanged.
2. Mobile keyboard drop (spec timing, not app): section-reorder-announcements.ts and the home-editor are not in the redesign diff. dnd-kit replaces the "Đã nhấc" announcement with "đang ở vị trí" immediately, and keys sent before the drop targets are measured are swallowed. Passed alone, failed in chain. `e2e/content-home-editor-mobile.spec.ts`: replaced the fixed 100 ms pause by waiting for each announcement (lift, 2 x ArrowUp) before the next key. Assertions on the final drop kept. Green in the full run.
3. Collections spec: `e2e/content-collections-flow.spec.ts` delete test no longer asserts the header link is gone (the dev DB has a published non-e2e collection `test`, which keeps it). It asserts the e2e collections vanish from `/collections`. No user data touched.
4. Snapshot moved to `e2e/.state/content-snapshot.json` (`e2e/support/content-snapshot.ts`), `e2e/.state/` added to `.gitignore`. Setup/teardown use the same constant.
5. Visual: `--update-snapshots` run once on the 4 approved candidates, then the plain run passed 4/4. 4 PNGs changed in `e2e/visual-reference-screenshots.spec.ts-snapshots/`. Phase-06 todo "Visual lookbook" ticked.

## Issues
- Login limit (20/15 min) hit twice while polling and re-running (my probes counted); teardown once could not log in (restored on the next full run, final run clean).
- I briefly corrupted `content-collections-flow.spec.ts` with a bad script edit (cut two tests); restored from the earlier read, `git diff` shows only the intended changes, 4/4 pass.

## Still not run (unchanged from tester report)
axe, hero pixel test, LCP/CLS, bundle size, font preload, compose IP-chain smoke.
