# Phase 7: Test e2e, kiểm chứng, docs

## Context Links
- `playwright.config.ts` (project theo tiền tố tên spec, `workers: 2`, `retries: 0`), `e2e/support/{admin-api,admin-helpers,admin-settings,outfit-cleanup}.ts`, `e2e/cleanup.teardown.ts`, `e2e/visual-reference-screenshots.spec.ts`.
- `docs/code-standards.md` mục "Kiểm thử" (65 e2e tính tới 2026-11-07), "Baseline visual".
- Script đo của P1: `scripts/perf/measure-first-load-js.mjs`. Số "trước" trong `perf-baseline-first-load-js.md` (plan dir này).
- Checklist UI (plan dir này) để chạy `ui-consistency:verifying`.

## Overview
- Priority: P1. Status: In Progress (2026-11-07), còn 2 mục (Lighthouse, ui-consistency verifying). Effort: 11h. Chờ P1–P6.
- e2e cho luồng mới, kiểm chứng (Lighthouse, bundle, visual, viewport, no-JS), báo cáo nhất quán UI, cập nhật docs.

## Key Insights
- Đăng nhập: `adminApi()` và `signInContext()` đăng nhập **một lần mỗi worker** rồi dùng lại cookie (`e2e/support/admin-api.ts`). Spec mới dùng hai hàm này, không đi qua form login nhiều lần (limiter 20 lần/IP/15 phút). Chạy e2e từng lượt một, không chạy song song nhiều lệnh.
- Tài khoản e2e: `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (admin local riêng, mật khẩu không nằm trong repo).
- Bố cục trang chủ và Cài đặt là dữ liệu dùng chung. Spec đổi chúng phải chạy **sau** project `public` (cần trang chủ mặc định) và tự khôi phục (`POST /api/admin/home/reset`, gửi lại settings cũ).
- `setLooksPageSize` gửi lại settings theo danh sách trường cố định (`admin-settings.ts:31-37`). Trường mới (`footer`, `collectionsNavEnabled`, `collectionsLabel`, `announcement`) sẽ bị PUT xoá → phải thêm vào.
- Viewport mobile của e2e: 390×844 (trùng spec visual). Đo vùng chạm bằng `locator.boundingBox()`.
- Spec visual chạy ở dev mode trên win32: `E2E_BASE_URL=http://localhost:3000 pnpm e2e --project visual`. Không dùng `--update-snapshots`.
- Plan trước đã đạt Lighthouse SEO 100 trên `/` khi có link "Xem tất cả" (`plan.md` của 261107-0913, mục Kết quả), nên chữ link này không làm rớt audit `link-text`.
- `revalidateTag` chạy sau khi trả response → e2e kiểm "đăng xong `/` đổi" phải poll (như e2e page-2 của plan trước, follow-up 4).

## Requirements
### e2e mới
| Spec | Project | Nội dung |
|---|---|---|
| `content-collections-flow.spec.ts` | `content` (mới) | Đi đúng luồng P3: tạo bộ sưu tập + ảnh bìa (đếm click) → gán 2 outfit → đăng → `/collections` có thẻ → `/collections/<slug>` có 2 thẻ outfit + breadcrumb → header có link → đổi thứ tự → xoá (dialog có usage) → link header mất khi hết bộ sưu tập đã đăng |
| `content-home-editor-flow.spec.ts` | `content` | Ở 1440: thêm ≥6 section, kéo đổi thứ tự, ẩn 1 section, lưu nháp → trang xem trước có nháp, `/` chưa đổi → Đăng → `/` đổi (poll) → "Hoàn tác" trong toast → `/` về bản cũ (poll), trạng thái "Có thay đổi chưa đăng" → menu "Khác" → "Hoàn tác lần đăng gần nhất" → `/` về bản vừa đăng → 2 tab lưu → 409 → Khôi phục mặc định |
| `content-home-editor-mobile.spec.ts` | `content` | Ở 390: tab "Chỉnh sửa" ⇄ "Xem trước" đổi panel, state giữ nguyên; "Lên"/"Xuống" đổi chỗ (nút đầu/cuối `disabled`); chỉ bàn phím: Space trên tay nắm + mũi tên + Space đổi chỗ, có câu `aria-live`; thêm section bằng hộp chọn; đăng + "Hoàn tác"; mọi nút trên thẻ section và toolbar ≥ 44×44 px; không cuộn ngang |
| `content-home-sections-render.spec.ts` | `content` | Đăng bố cục đủ 7 loại qua API. Kiểm: một `h1`, mỗi section `h2`; JSON-LD FAQPage; slider reduced-motion không tự chuyển; hover dừng; nút tạm dừng; tab radio đổi panel; tắt JS vẫn đọc được chữ; opacity = 1 sau animation; 320/390/768/1024/1440 không cuộn ngang |
| `content-footer-and-nav.spec.ts` | `content` | Lưu footer qua form Cài đặt (4 click như P5) → có trên `/`, `/looks`, 404 → link `javascript:` báo lỗi tại ô. Bật dải thông báo có link (2 click) → có trên `/`, `/looks`, `/look/<slug>`, 404, nằm trên header, skip link vẫn là Tab đầu tiên; 320px không cuộn ngang với 160 ký tự; tắt → không còn trong HTML; link `javascript:` báo lỗi tại ô → khôi phục settings |
| `content.teardown.ts` | `content-cleanup` | Reset bố cục, xoá bộ sưu tập test, gửi lại settings ban đầu |

- `playwright.config.ts`: project `content` (`/content-.*\.spec\.ts/`, `dependencies: ['public']`, `teardown: 'content-cleanup'`). Các file trong project chạy tuần tự (`test.describe.configure({ mode: 'serial' })` trong từng file, và chỉ một file đổi bố cục trang chủ).
- Không dùng mock. Dữ liệu dựng qua API admin thật.
- `admin-settings.ts` gửi lại đủ trường mới.

### Kiểm chứng (ghi số vào báo cáo tester)
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (shared/api/web), `pnpm e2e` đầy đủ: mọi test xanh, gồm 65 test cũ.
- Visual: 4/4 xanh so với baseline P1 của plan trước.
- Lighthouse (CLI, mobile + desktop, build production): SEO = 100 trên `/`, `/collections`, `/collections/<slug>`. Accessibility ≥ 95 (mục tiêu plan trước).
- Bundle: `/` sau so với số "trước" của P1: chênh lệch ≤ +15 KB encoded (ngân sách mặc định, chủ repo chỉnh được). Đo thêm `/admin/home` để ghi nhận (không có ngân sách).
- `GET /api/public/home` (12 section): thời gian phản hồi (lấy từ báo cáo P2, đo lại trên build).
- `ui-consistency:verifying` theo checklist → `plans/reports/ui-consistency-verifying-261107-homepage-sections.md`.

### Docs
- `docs/system-architecture.md`:
  - route mới (public, admin, xem trước);
  - bảng API mới;
  - model `Collection`, `PageLayout`, `Outfit.collectionIds`, index mới;
  - bảng revalidate có `tags`;
  - luồng nháp → đăng;
  - Settings mới.
- `docs/code-standards.md`:
  - thư mục `components/home-sections`, `components/admin/{collections,pickers,home-editor}`;
  - luật "View section client-safe";
  - cách thêm một loại section (schema shared → resolver API → View → spec field);
  - project e2e `content`;
  - số test mới.
- `docs/system-architecture.md` thêm: đăng giữ một bản trước + `restore-previous`; dải thông báo là Settings toàn site.
- `docs/deployment-guide.md`: không có env, không dependency mới. Ghi cách hoàn tác lần đăng (`POST /api/admin/home/restore-previous`) và reset bố cục (`POST /api/admin/home/reset`).
- `docs/project-changelog.md`, `docs/development-roadmap.md`: mục mới + follow-up (xoá `getFeaturedOutfit` nếu không còn dùng, blog đợt sau, giá/brand món đồ).

## Architecture
```
projects: admin-flow -> public -> content (serial, mutates home + settings + collections) -> content-cleanup
          admin-shell (độc lập), visual (độc lập, dev mode)
measure: next build + next start :3100 -> measure-first-load-js.mjs /, /collections, /collections/<slug>
```

## Related Code Files
- Create:
  - `e2e/content-collections-flow.spec.ts`, `e2e/content-home-editor-flow.spec.ts`, `e2e/content-home-editor-mobile.spec.ts`, `e2e/content-home-sections-render.spec.ts`, `e2e/content-footer-and-nav.spec.ts`, `e2e/content.teardown.ts`
  - `e2e/support/collection-fixtures.ts`, `e2e/support/home-layout.ts`
  - `plans/reports/tester-261107-homepage-sections-e2e.md`, `plans/reports/ui-consistency-verifying-261107-homepage-sections.md`
- Modify:
  - `playwright.config.ts`, `e2e/support/admin-settings.ts`
  - `e2e/public-*.spec.ts`: chỉ khi trang chủ mới đổi selector hợp lệ (ghi lý do từng chỗ)
  - `docs/system-architecture.md`, `docs/code-standards.md`, `docs/deployment-guide.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`
  - `plan.md` của plan này: cập nhật trạng thái phase + mục Kết quả (lead)
- Không sửa: `e2e/visual-reference-screenshots.spec.ts` và snapshot.

## Implementation Steps
1. Support: `collection-fixtures.ts` (tạo/xoá qua API, có ảnh bìa từ upload test như `admin-outfit-flow`), `home-layout.ts` (đăng bố cục mẫu, reset), sửa `admin-settings.ts`.
2. Project `content` + teardown trong `playwright.config.ts`. `pnpm typecheck` (gồm `e2e/`).
3. Viết 5 spec theo bảng. Lấy selector theo role/nhãn (`getByRole`, `getByLabel`), không theo class.
4. Chạy `pnpm e2e` đầy đủ một lượt. Rớt thì ghi output nguyên văn vào báo cáo, sửa, chạy lại. Không bỏ test để qua.
5. Visual (dev mode, win32).
6. Build production + Lighthouse 3 URL × 2 thiết bị. Đo bundle bằng script của P1, so với `perf-baseline-first-load-js.md`.
7. `ui-consistency:verifying` → báo cáo.
8. Docs. Lead cập nhật `plan.md`. Không commit trong phase. Khi chủ repo yêu cầu: một commit duy nhất cho cả đợt, tiếng Anh, conventional (vd `feat: add collections and configurable home sections`), sau khi lint + test + e2e xanh.

## Todo List
- [x] Support e2e + settings gửi đủ trường
- [x] Project `content` + teardown
- [x] 5 spec mới (gồm editor mobile)
- [x] `pnpm e2e` đầy đủ xanh, báo cáo tester
- [x] Visual 4/4 xanh
- [ ] Lighthouse SEO 100 ×3 URL, bundle trong ngân sách
- [ ] ui-consistency verifying
- [x] Docs + changelog + roadmap

## Success Criteria
- `pnpm e2e`: 65 test cũ + test mới đều pass. Chạy lại lần hai vẫn pass (teardown dọn đúng).
- Visual 4/4 xanh, không cập nhật snapshot.
- Lighthouse SEO 100 trên `/`, `/collections`, `/collections/<slug>` (mobile + desktop). Số đo nằm trong báo cáo.
- Chênh lệch First Load JS `/` ≤ ngân sách.
- Editor dùng được ở 390: spec mobile pass (tab, Lên/Xuống, bàn phím, 44px, đăng + hoàn tác).
- Docs mô tả đúng code (đối chiếu `file:line`).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Spec `content` làm bẩn dữ liệu cho lần chạy sau | Trung bình × Trung bình | Teardown reset + xoá theo tiền tố tên test. Spec tự kiểm trạng thái đầu |
| Chạm limiter đăng nhập | Thấp × Trung bình | Một lần đăng nhập mỗi worker, chạy từng lượt. Bị 429 thì chờ hết cửa sổ, không tăng limiter |
| e2e "đăng → `/` đổi" chập chờn | Trung bình × Thấp | Poll tới timeout có sẵn (`expect.poll`), không `waitForTimeout` cố định |
| Lighthouse < 100 do link/ảnh | Thấp × Trung bình | Sửa ở phase chủ của file (báo lead), chạy lại |

## Security Considerations
- Không ghi mật khẩu, cookie vào báo cáo hay trace commit. Trace Playwright (`retain-on-failure`) nằm trong `test-results/` (đã gitignore, kiểm lại).
- Spec XSS: lưu link `javascript:` qua UI và qua API đều bị từ chối.

## Rollback
- Chỉ test và docs. Xoá file test mới, `git restore` docs: không ảnh hưởng runtime.

## Next Steps
- Lead chốt plan `completed`. Follow-up: blog (dự án con), giá/brand món đồ, dọn loader không dùng.
