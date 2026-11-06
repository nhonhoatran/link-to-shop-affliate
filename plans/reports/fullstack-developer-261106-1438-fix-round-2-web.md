# Fix round 2 (web/admin UI)

## Changes per item
1. `admin-form-field.tsx`: new `display` prop -> control gets `.display` class (no input styling), never `aria-invalid`; label + `aria-describedby` (hint/error) kept. `item-edit-form.tsx` anchor field uses `display`.
2. `admin-panel.tsx`: heading always inside one `.panelHeader` flex row (margin-bottom on row, `.panelTitle` margin 0). No more `.toolbar` + title margin stack.
3. Tokens `--focus-ring-width`, `--focus-ring-offset` in `design-tokens.css`; used by `globals.css :focus-visible` and `admin-dropzone.module.css` (with `--color-focus`). Removed unused `--admin-focus-ring`.
4. `save-status-text.tsx`: rule = saving > error > dirty > saved("Đã lưu") > empty. `SaveStatus` gains `'saved'` (`use-outfit-actions.ts` sets it after save/featured success). Settings: error when client zod blocks (fieldErrors) or server fails; `router.refresh()` after save. Initial state is empty in both editor and settings.
5. `StatusMessage` exported from `save-status-text.tsx`; used by SaveStatusText, user-create success line, dropzone upload line.
6. Words (see table). Dropzone: hint passed -> hint is the only line (rendered inside the zone, wired via aria-describedby); no hint -> instruction only.
7. Pending rule documented in `save-status-text.tsx`. Verified: editor/settings Save = fixed "Lưu" + status line; login "Đang đăng nhập…", logout "Đang đăng xuất…", create outfit "Đang tạo…", user create "Đang thêm…", user row/outfit delete "Đang xoá…" (own button).
8. Users page uses `.narrow` for whole page; form no longer has its own `.narrow` -> list and form same width/left edge.
9. Tokens `--admin-dim-opacity` 0.35, `--admin-width-page` 896px, `--admin-width-narrow` 512px, `--admin-width-dialog` 384px, `--admin-preview-mobile-width` 384px; replaced `--lookbook-dim-opacity` and `calc(var(--space-8)*N)` in admin CSS (admin.module, admin-form.module, admin-editor.module).
10. Sitemap flake root cause: test did `vi.resetModules()` + cold dynamic `import('@/app/sitemap')` inside each test, so the first test paid the full transform/import of sitemap, web-env, zod, seo modules inside the 5 s test timeout; under heavy CPU load that exceeds 5 s. The reset only existed because `getWebEnv` memoises `process.env`. Fix: static import (loaded at collection, outside test timeout) and `vi.mock('@/lib/web-env')` wrapper calling the real `getWebEnv({...process.env})` (skips cache, real schema still validates); added `vi.unstubAllEnvs()` in afterEach. No retry/skip/timeout change; assertions unchanged. Not reproduced under synthetic load by me (only verified 3 idle runs).

## User-facing strings old -> new
| Where | Old | New |
|---|---|---|
| Create outfit submit | Tạo và mở trình chỉnh sửa | Tạo outfit |
| User row delete button | accessible name "Xoá" | visible "Xoá", aria-label "Xoá quản trị viên {email}" |
| Editor/settings status, initial | Đã lưu | (empty) |
| Editor/settings after save | (idle -> "Đã lưu" always) | Đã lưu (only after a save this session) |
| Settings, client validation blocked | no error text | Chưa lưu được |
| Dropzone with hint | instruction + hint (2 lines) | hint only |
Item/outfit deletes already used same label on button and confirm ("Xoá món", "Xoá outfit"); unchanged. Rule: button label = confirm label; repeated row buttons use short visible text + aria-label starting with the confirm label.

## Tests
New: `test/admin/save-status-text.test.tsx`, `test/admin/outfit-create-and-item-form.test.tsx`. Updated: admin-form-field (display), settings-and-users (status rule, error on validation, refresh, pending, StatusMessage role), media-dropzone (hint), outfit-editor (initial empty), sitemap.
Results: web typecheck pass; web test 27 files / 164 tests, 3 consecutive runs pass; `pnpm lint` 0 problems; web build OK with given env.

## Unresolved
- Create-outfit pending label has no automated test (needs an uploaded model image to pass client validation).
- Sitemap fix verified idle only, not under CPU burners.

**Status:** DONE
**Summary:** All 10 items done; typecheck, tests (3x), lint, build pass.
**Concerns:** see Unresolved.
