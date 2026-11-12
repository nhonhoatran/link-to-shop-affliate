# Tester report: TikTok-style photo post feed (phase 02)

Date: 2026-11-12. Scope: unit tests, e2e cases, snapshot check. Docs untouched.

## Status

- Web unit: PASS. 106 files, 730/730 (baseline 694, +36 new). No skips.
- Typecheck `apps/web` (`tsc -p tsconfig.json --noEmit`): clean.
- E2E public feed + no-JS: PASS 26/26 (run with `E2E_BASE_URL=http://localhost:3000 pnpm e2e e2e/public-outfit-feed.spec.ts e2e/public-viewport-and-no-js.spec.ts`).
- E2E full suite: NOT CLEAN. Blocked by API login rate limit (429) during the last attempts. Earlier full runs: 89 passed / 1 failed (cause found and fixed, see below), and 77 passed / 10 failed (429 cascade). Clean full run still outstanding.
- Visual snapshots: no failures seen in any full run (`visual` project 4/4 ok in run 3). No snapshot was updated. Nothing to review.
- Product bugs found: none. No product code under `apps/web/src` changed.

## Files

Created:
- `apps/web/test/feed/feed-photo-track.test.tsx` (67 lines): track order, "Ảnh i/n" labels, buy links (sponsored rel, new tab), unsafe URL → `aria-disabled`, `tabindex=-1`, no-items outfit.
- `apps/web/test/feed/feed-photo-nav.test.tsx` (103 lines): hidden for 1 photo, dots/arrows call `scrollTo` with correct left, edge disabling, smooth vs reduced motion, dots up to 10, `i/n` counter above 10.
- `apps/web/test/feed/feed-shop-sheet.test.tsx` (~110 lines): open/close, item list, rel/target, unsafe URL, close button, backdrop click, Esc (simulated close), focus returns to "Mua đồ" after close (per lead update for `useModalDialog`).
- `apps/web/test/feed/feed-share-button.test.tsx` (90 lines): native share args (title, absolute URL), clipboard fallback when no share, fallback on NotAllowedError, AbortError silent, failure message, status clears after 2 s.
- `apps/web/test/feed/feed-step-photo-keys.test.tsx` (106 lines): ArrowRight/ArrowLeft target the nearest slide's track, modifier keys ignored, form field and `<dialog>` keys ignored, unhandled keys ignored.
- `e2e/support/feed-photo-helpers.ts`: `firstSlide`, `firstTrack`, `photoIndex` (reads real scroll index), `swipeLeft` (CDP touch input, needs `hasTouch`).

Changed:
- `e2e/public-outfit-feed.spec.ts` (237 lines, over the 200-line guideline): new `photo posts` block. Mobile 390x844 touch swipe 1→2 with dot/counter check; "Mua đồ" lists all items (count from label), sponsored/_blank links, Esc closes, focus returns. Desktop 1440x860 next arrow + ArrowRight/ArrowLeft. Lookbook item card hit-test via `elementFromPoint` at 390 and 1440 px.
- `e2e/public-viewport-and-no-js.spec.ts` (182 lines): no-JS `/looks` case. Track has 2 + items photos, last label matches, "Mua đồ" hidden, "Xem tiếp" link (conditional, same pattern as existing spec).

Not changed: `docs/` (per instruction).

## Unit test details

- Test edits made during work, all to match real behaviour, not to hide a bug:
  - jsdom `<dialog>` is closed, so role queries need `hidden: true`.
  - Stub for `getBoundingClientRect` must subtract `scrollTop` (a real rect moves as the feed scrolls).
  - `showModal`/`close` stubs: `close` dispatches the `close` event, as the browser does, so `useModalDialog` returns focus.
  - `subtitle` is optional in the DTO; guarded the assertion (type error found by tsc).

## E2E details and environment changes (IMPORTANT for the lead)

Dev DB settings were not in the state the e2e suite expects. I changed three values with the admin API (one login per change). Original values are recorded.

| Setting | Original | Now | Why |
|---|---|---|---|
| `homeMode` | `sections` | `feed` | `/` showed home sections; the existing `/` feed specs need `feed` (default is `feed`, `packages/shared/src/settings-schemas.ts:74`). |
| `looksPageSize` | `1` | `12` | `1` made the existing stepping specs fail ("needs at least 2 outfits"). `3` broke `content-collections` (`/collections` also uses this size, `apps/web/src/app/(public)/collections/page.tsx:34`). `12` passes both. Feed total 17 > 12, so the pagination spec runs and is not skipped. |

Originals saved at `d:\MyProject\affliate\...` scratchpad: `C:\Users\LENOVO\AppData\Local\Temp\claude\a0157126994b7d90\1828daba-76a4-4a71-9623-e70c20b98499\scratchpad\settings-flip\original-home-mode.txt` (`sections`) and `...\original-looks-page-size.txt` (`1`). Decide whether to restore the originals. If you restore `homeMode=sections`, the existing `/` feed specs fail again. If you restore `looksPageSize=1`, `content-collections` fails.

New e2e cases use `/looks` (always feed), so they do not depend on `homeMode`.

Login budget: my manual settings logins plus several e2e runs hit the 20 per 15 min limit. Full run 2 gave 77 passed / 10 failed (429s and a teardown that refused to run). Run 3 and the last background attempt also got 429 at the start. Each 429 attempt seems to extend the block. Wait a full 15 min after the last login before a single full run.

## Commands and outputs

```
apps/web: npx vitest run
 Test Files  106 passed (106)
      Tests  730 passed (730)

apps/web: npx tsc -p tsconfig.json --noEmit   -> exit 0

e2e public feed + no-JS (after looksPageSize=3):
 26 passed (33.5s)
```

Full run 1 (homeMode=feed, looksPageSize=3): 89 passed, 1 failed — `content-collections` "published collection shows on /collections" (new collection not on page 1 with size 3). Cause: my settings change, fixed by size 12.

## Snapshots

No snapshot was updated. `visual` project (lookbook `/look/dramatic`, `/look/mesh-84` at 390/1440) passed in run 1 and run 3. Nothing to review.

## Concerns / unresolved

1. Clean full e2e run not done. Needs one run after the login window clears; expected green per run 1 except the setting fixed since.
2. Settings left at `homeMode=feed`, `looksPageSize=12` (see table). Lead to decide restore.
3. `e2e/public-outfit-feed.spec.ts` is 237 lines, above the 200-line guideline. Lead asked for these cases in that file. Split into a separate spec if preferred.
4. No-JS "Xem tiếp" check is conditional (passes when no next link), same as the existing spec. Dev data currently has a next link.
5. Share-status clear test uses fake timers and a fixed 2 s fallback (CSS var not read in jsdom).

**Status:** DONE_WITH_CONCERNS
**Summary:** Unit tests 730/730 green (+36 new feed tests, typecheck clean). New e2e photo-post and no-JS cases pass 26/26 with public feed specs. Full e2e run not clean due to login 429; the only real failure seen was caused by my temporary settings and is fixed. No product bugs found; no snapshots changed.
**Concerns/Blockers:** clean full e2e run pending login window; dev settings changed (homeMode feed, looksPageSize 12; originals sections/1) need owner decision.

**Final result (2026-11-12, cập nhật sau báo cáo):** vitest web 730/730 pass. `pnpm e2e` full 132/132 pass (~10:20). Photo-post e2e đã tách sang `e2e/public-outfit-feed-photo-post.spec.ts` (báo cáo này ghi trong `public-outfit-feed.spec.ts`, phần đó đã cũ). Concern 1 và 3 đã đóng. Concern 2 đã chốt giữ `homeMode=feed`, `looksPageSize=12`.
