# Phase 7: Tests, verification, docs

## Context Links
- Brainstorm mục "Tiêu chí thành công". Research 01 mục 6–7 (reduced-motion, no-JS opacity). Research 02 mục 3–6.
- Code đã đọc: `playwright.config.ts` (project `admin-flow` chỉ khớp `admin-outfit-flow.spec.ts`, `public` khớp `public-.*\.spec\.ts` và phụ thuộc `admin-flow`, `visual` khớp `visual-.*`), `e2e/support/admin-helpers.ts` (chờ URL `/admin` sau login, vẫn đúng vì `/admin` thành Tổng quan), `e2e/admin-outfit-flow.spec.ts` (`goto('/admin/outfits/new')`), `e2e/public-viewport-and-no-js.spec.ts`.
- Phụ thuộc: P3, P4, P6 xong (P5 xong trước P6).

## Status (chốt 2026-11-07)
- Lint, typecheck xanh. `pnpm test`: shared 37 / api 102 / web 265 passed.
- `pnpm e2e`: 65/65 passed, gồm visual 4/4 (so với baseline P1) và project mới `admin-shell`.
- Lighthouse SEO 100 mobile + desktop trên `/`, `/looks`, `/look/dramatic` (lần đo trước `/looks` 92 đã được xử lý và đo lại).
- Review-fix round sau code review. Báo cáo: `plans/reports/code-reviewer-261107-1205-ui-refactor-review.md`, `plans/reports/ui-consistency-verifying-261107-1205-ui-refactor.md`, `plans/reports/tester-261107-0528-ui-refactor-e2e.md`.
- Số cũ 60/60 và 394 test trong lần chạy giữa chừng đã được thay bằng số chốt ở trên.

## Todo List status
- [x] Thêm project `admin-shell` vào Playwright config
- [x] Sửa admin-outfit-flow theo route mới (thêm dọn state cũ + assert list `/admin/outfits`)
- [x] Assert opacity no-JS + reduced-motion
- [x] Spec /looks + điều hướng + header ẩn/hiện
- [x] Spec connector draw-once khi resize
- [x] Spec responsive public + admin (5 viewport)
- [x] Spec theme/rail/drawer/toast/redirect admin
- [x] Toàn bộ lint/typecheck/test/e2e xanh (lint, typecheck, test, e2e 65/65, visual 4/4)
- [x] Lighthouse SEO (3 trang public): 100 mobile + desktop
- [x] ui-consistency:verifying + report (`plans/reports/ui-consistency-verifying-261107-1205-ui-refactor.md`)
- [x] Cập nhật 4 file docs (system-architecture, code-standards, project-changelog, development-roadmap), 2026-11-07

## Overview
- Priority: P1. Status: Done. Effort: 7h. Tuần tự, chạy cuối cùng.
- Cập nhật và thêm e2e cho UI mới, kiểm tra responsive 320/390/768/1024/1440, Lighthouse SEO, chạy `ui-consistency:verifying`, cập nhật docs.
- Spec visual thuộc P1 (baseline `[data-lookbook]`). Phase này chỉ **chạy**, không sửa.

## Key Insights
- Spec admin mới không khớp regex project nào → phải thêm project `admin-shell` (`/admin-shell-.*\.spec\.ts/`) vào `playwright.config.ts`. Không phụ thuộc `admin-flow` (không cần outfit test), cần stack đang chạy + tài khoản admin e2e như hiện tại.
- CSS animation vẫn chạy khi tắt JS → nội dung cuối cùng phải hiện. Kiểm bằng computed `opacity === '1'` sau khi animation xong (hoặc ngay lập tức dưới reduced-motion), không chỉ `toBeVisible()` (Playwright không xét opacity; research 01 ghi là chưa kiểm chứng, nên assert opacity tường minh).
- Draw-once connector: đổi kích thước viewport sau lần vẽ đầu không được chạy lại animation. Kiểm bằng class/attribute đánh dấu đã vẽ (P4 định nghĩa, vd `data-drawn`) và `getAnimations().length === 0` trên path sau resize.
- Cookie theme có `path: '/admin'` → e2e set/đọc cookie theo URL admin.

## Requirements
- Functional:
  - Admin flow cũ xanh với route mới (list `/admin/outfits`, quay lại list sau xoá).
  - Public: `/looks` phân trang (`?page=2`, `?page=abc` → trang 1 hoặc 404 theo P3 định nghĩa), header link, footer link, breadcrumb, mục "Outfit khác" không chứa outfit đang xem.
  - Header client (390px và 1440px): 2 link hiện thẳng, không cuộn ngang; cuộn xuống header ẩn, cuộn lên hiện lại; Tab vào link thì header hiện. Tắt JS: header hiện ở vị trí bình thường.
  - Admin shell: rail thu gọn nhớ sau reload (cookie), dark mode 3 trạng thái nhớ sau reload, không nháy (HTML đầu đã có `data-theme`), drawer mobile mở/đóng/focus, toast `role=status` khi lưu settings.
  - Redirect `/admin?status=draft` → `/admin/outfits?status=draft`.
  - Viewport 320/390/768/1024/1440: `document.documentElement.scrollWidth <= innerWidth` trên `/`, `/looks`, `/look/<slug>`, `/admin`, `/admin/outfits`, editor, settings, users.
- Non-functional: không bỏ qua test fail. Không mock trong e2e. E2E tổng xanh (17 cũ + mới).

## Architecture
```
playwright projects
  admin-flow  ── admin-outfit-flow.spec.ts (sửa)          ─┐ teardown: cleanup
  public      ── public-*.spec.ts (sửa + mới)  depends on ─┘
  admin-shell ── admin-shell-*.spec.ts (mới, độc lập)
  visual      ── visual-reference-screenshots.spec.ts (P1, chỉ chạy)
```

## Related Code Files
- Modify: `D:\MyProject\affliate\playwright.config.ts`, `e2e\admin-outfit-flow.spec.ts`, `e2e\public-viewport-and-no-js.spec.ts`, `e2e\public-lookbook-links-and-hover.spec.ts` (chỉ khi selector đổi), `e2e\support\admin-helpers.ts` (chỉ khi cần helper mới)
- Create: `e2e\public-looks-and-navigation.spec.ts`, `e2e\public-responsive-viewports.spec.ts`, `e2e\public-connector-draw-once.spec.ts`, `e2e\admin-shell-theme-and-drawer.spec.ts`, `e2e\admin-shell-responsive.spec.ts`, `plans\reports\ui-consistency-verifying-261107-<HHmm>-ui-refactor.md`
- Modify docs: `docs\system-architecture.md`, `docs\code-standards.md`, `docs\project-changelog.md`, `docs\development-roadmap.md`
- Delete: không.

## Implementation Steps
1. Chạy stack (`pnpm dev:infra` + `pnpm dev`, hoặc compose; xem memory/`docs/deployment-guide.md`). Chạy `pnpm e2e` trước khi sửa để ghi nhận spec nào gãy do route mới.
2. `playwright.config.ts`: thêm `{ name: 'admin-shell', testMatch: /admin-shell-.*\.spec\.ts/ }`.
3. `admin-outfit-flow.spec.ts`: sửa điều hướng/assert theo `/admin/outfits`. Giữ nhãn field (P6 cam kết không đổi).
4. `public-viewport-and-no-js.spec.ts`: thêm assert opacity:
   ```ts
   const opacities = await page.locator('[data-lookbook] h1, [data-lookbook] article').evaluateAll(
     (els) => els.map((el) => getComputedStyle(el).opacity));
   expect(opacities.every((o) => o === '1')).toBe(true);
   ```
   Chạy cả với `javaScriptEnabled: false` và `reducedMotion: 'reduce'`. Với JS bật + motion: chờ `document.getAnimations().every(a => a.playState === 'finished')` rồi assert.
5. `public-looks-and-navigation.spec.ts`: header → `/looks`, thẻ → `/look/<slug>`, breadcrumb về `/looks`, phân trang, "Outfit khác" loại outfit hiện tại, header ẩn khi cuộn xuống / hiện khi cuộn lên (chờ `transform` ổn định thay vì `waitForTimeout`).
6. `public-connector-draw-once.spec.ts`: tải `/look/<slug>` 1440px, chờ path có dấu đã vẽ, `setViewportSize(1024)`, assert path không có animation đang chạy và vẫn khớp hotspot (tái dùng logic `public-hotspot-alignment`).
7. `public-responsive-viewports.spec.ts` + `admin-shell-responsive.spec.ts`: lặp 5 viewport, assert không cuộn ngang, nút chính trong viewport, tap target ≥ 44px cho nav (`boundingBox`).
8. `admin-shell-theme-and-drawer.spec.ts`: chọn dark → reload → `[data-theme="dark"]` có trong HTML trả về (`page.request.get('/admin')` đọc body với cookie) → không nháy. Rail toggle → reload → còn rail. 390px: drawer mở/Esc/focus. Lưu settings → toast `role=status`. Redirect `/admin?status=draft`.
9. Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`. Fail → sửa nguyên nhân (báo phase chủ file nếu lỗi nằm ngoài e2e), không skip.
10. Lighthouse SEO (mobile + desktop) cho `/`, `/looks`, `/look/<slug>`: mục tiêu 100. Ghi điểm vào report.
11. Chạy `ui-consistency:verifying` với checklist P1 (`ui-consistency-checklist.md`). Lệch không cố ý → báo phase chủ, sửa, chạy lại. Lưu report.
12. Docs: `system-architecture.md` (route group `(public)`, `/looks`, `/api/public/outfits`, `/api/admin/stats`, cookie `admin-theme`/`admin-sidebar`, revalidate `/looks`), `code-standards.md` (token client/admin, animation lúc tải trang bằng CSS, `motion` chỉ cho tương tác sau hydrate qua `m.*` + `MotionProvider`, cấm trạng thái ẩn lúc SSR, quy tắc reduced-motion/no-JS, icon `aria-hidden`), `project-changelog.md`, `development-roadmap.md` (trạng thái, số test mới). Rà lại docs và plan dir: không có xưng hô cá nhân, chỉ văn phong trung lập.
13. Commit: `test: cover public shell, admin shell and responsive layouts`, `docs: document ui refactor architecture and standards`.

## Todo List
- [x] Thêm project `admin-shell` vào Playwright config
- [x] Sửa admin-outfit-flow theo route mới
- [x] Assert opacity no-JS + reduced-motion
- [x] Spec /looks + điều hướng + header ẩn/hiện
- [x] Spec connector draw-once khi resize
- [x] Spec responsive public + admin (5 viewport)
- [x] Spec theme/rail/drawer/toast/redirect admin
- [x] Toàn bộ lint/typecheck/test/e2e xanh (e2e 65/65, visual 4/4)
- [x] Lighthouse SEO 100 cho 3 trang public (mobile + desktop)
- [x] ui-consistency:verifying + report
- [x] Cập nhật 4 file docs
- [ ] Commit `test: cover public shell, admin shell and responsive layouts` và `docs: document ui refactor architecture and standards`: bỏ theo quyết định chủ repo

## Success Criteria
- `pnpm e2e` xanh toàn bộ (cũ + mới), `pnpm e2e --project visual` xanh với baseline P1 (lookbook không đổi pixel).
- Không cuộn ngang ở 5 viewport trên mọi trang đã liệt kê.
- Lighthouse SEO 100 (`/`, `/looks`, `/look/<slug>`).
- Report verifying không còn lệch ngoài điểm cố ý đã ghi.
- Docs phản ánh đúng code (đường dẫn, endpoint, cookie).

## Risk Assessment
| Rủi ro | Giảm thiểu |
|---|---|
| Spec flaky do animation | Reduced-motion mặc định trong spec không test animation; spec animation chờ `getAnimations()` xong thay vì `waitForTimeout` |
| Snapshot visual lệch do font/OS | Baseline P1 gắn hậu tố `win32`; chạy trên cùng máy. CI khác OS cần baseline riêng (ngoài phạm vi) |
| Lỗi nằm ở file của phase khác | Không sửa tại chỗ; báo phase chủ (ma trận sở hữu), sửa tuần tự |
| Lighthouse < 100 vì header/footer (link thiếu tên, contrast) | Sửa ở P3 rồi đo lại |

## Security Considerations
- E2E dùng tài khoản admin test hiện có, không commit credential. Cookie theme/sidebar không chứa dữ liệu nhạy cảm; kiểm Server Action từ chối giá trị lạ (`'evil'` → giữ nguyên theme).

## Rollback
- Chỉ thêm/sửa test và docs. Revert commit là xong, không ảnh hưởng runtime.

## Next Steps
- Đóng plan: cập nhật `plan.md` status `completed`, chạy `/ck:journal`.
- Sau plan: deploy VPS theo roadmap; cân nhắc thống kê lượt bấm (sub-project riêng).
