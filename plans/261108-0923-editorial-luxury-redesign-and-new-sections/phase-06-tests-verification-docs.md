# Phase 6: Test e2e, kiểm chứng, docs

## Context Links
- Mọi phase trước + báo cáo của từng phase. Checklist UI (toàn bộ, tick khi kiểm).
- e2e hiện có: `e2e/*.spec.ts` (15 spec + `content.setup.ts`, `content.teardown.ts`, `cleanup.teardown.ts`), `e2e/support/*`, `playwright.config.ts`, `e2e/visual-reference-screenshots.spec.ts` + snapshot.
- Docs: `docs/{system-architecture,code-standards,project-changelog,development-roadmap}.md` (`docs/deployment-guide.md` thuộc P2).
- Plan trước: `../261107-1341-homepage-sections-and-collections/phase-07-tests-verification-docs.md` (mẫu e2e content, khôi phục settings/bố cục).

## Overview
- Priority: P1. Status: Completed (còn mở: axe, pixel hero). Effort: 10h. Chờ P1-P5 xong.
- e2e cho luồng mới, chạy lại toàn bộ e2e cũ, re-baseline visual lookbook (Q2 đã chốt), smoke chuỗi IP trên stack compose, axe/Lighthouse contrast + LCP/CLS, đo bundle, cập nhật docs.

## Key Insights
- Playwright `getByRole(..., { name })` mặc định khớp không phân biệt hoa thường; chữ hoa chỉ bằng CSS nên DOM không đổi → phần lớn spec cũ giữ được. Chưa kiểm chứng trên toàn bộ spec: chạy rồi mới kết luận.
- Bố cục mặc định đổi theo Q3 (5 section: FeaturedLookbook, CollectionTiles, OutfitList, Gallery, NewsletterSignup) → spec dựa vào bố cục cũ có thể lệch. Sửa spec phải ghi lý do trong báo cáo.
- Form đăng ký chỉ hiện khi settings đã lưu câu đồng ý (P2, red team H3). Spec newsletter phải lưu câu đồng ý qua API admin settings trước khi mở `/`; teardown khôi phục settings như cũ.
- Test newsletter tạo bản ghi thật: dùng email `e2e+<timestamp>@example.test`, teardown xoá qua API admin (xoá cứng). Không chạy trên DB không phải localhost trừ khi `E2E_ALLOW_CONTENT_RESET=1` (giữ quy ước plan trước).
- Limiter newsletter: e2e **không** test 429 (đã phủ ở unit test API P2 + action P4, red team F7). Dev không có Caddy nên mọi request chung một bucket: tổng số lần gửi của mọi spec phải < `NEWSLETTER_RATE_LIMIT_MAX_PER_IP` của API dev; trước khi chạy e2e đặt giá trị cao và khởi động lại API (bộ đếm nằm trong RAM). Tài khoản e2e admin có giới hạn 20 lần đăng nhập/15 phút: dùng lại storage state.
- Chuỗi IP (Caddy → web → API) chỉ chạy đúng khi `NODE_ENV=production` và có Caddy. `infra/docker-compose.yml` đã chạy api + web production sau Caddy (`:8080`), cùng chuỗi proxy với prod; `docker-compose.prod.yml` chỉ thêm auth Mongo, HTTPS, bỏ cổng. Smoke trên stack này, không cần domain.
- Axe báo "needs review" với chữ trên ảnh; contrast hero chứng minh bằng công thức (scrim alpha >= 0.6) + ảnh chụp ảnh trắng, không chỉ dựa vào axe.

## Requirements
### Functional
- e2e mới:
  - `content-newsletter-signup.spec.ts`: chưa lưu câu đồng ý → `/` không có form; lưu xong → JS bật (gửi → thông báo thành công lấy từ `successMessage`/copy mặc định, nút disabled khi đang gửi); JS tắt (`javaScriptEnabled: false`): gửi → URL `?newsletter=ok`, thông báo; bỏ tick → không gửi; honeypot điền → ok nhưng không có bản ghi (kiểm qua API admin). Không có case 429.
  - `content-newsletter-admin.spec.ts`: list thấy email mới, lọc, CSV tải về (event `download`, đọc file: BOM, header, escape `=`, cột Lịch sử), huỷ → badge đổi, đăng ký lại cùng email → trạng thái đã đăng ký, CSV giữ đủ 3 event; xoá → biến mất; đổi câu đồng ý → version tăng, trang chủ hiện câu mới.
  - `content-editorial-sections-render.spec.ts`: đăng bố cục 11 type, kiểm thứ tự, marquee có nút tạm dừng + reduced-motion đứng yên, gallery link `/look/<slug>` + không ô trống (mosaic theo `galleryMosaicSpans`), banner CTA, không cuộn ngang ở 320/390/768/1024/1440, tắt JS đọc được hết; bố cục mặc định: Gallery không lặp outfit của OutfitList.
  - Mở rộng responsive/no-JS cho header/footer mới (nếu spec cũ không phủ).
- Visual (Q2 đã chốt: lookbook đổi font): spec visual (chụp riêng `[data-lookbook]`) được phép đỏ sau P3 do font/màu chữ. Chủ repo duyệt bằng mắt 4 ảnh mới (2 slug × 1440/390) → `--update-snapshots` một lần cho spec visual, ghi changelog. Lệch bố cục (vị trí, kích thước, connector) là lỗi: báo P3 sửa, không update.
- Kiểm chứng:
  - axe-core trên `/`, `/looks`, `/look/<slug>`, `/collections`, `/admin/newsletter`, `/admin/settings` (sáng + tối): 0 lỗi color-contrast (trừ "needs review" chữ trên ảnh, ghi chú).
  - Hero: chụp với ảnh nền trắng, đo pixel nền sau scrim tại vùng chữ ≤ rgb(112) (ứng với 4.95:1).
  - LCP/CLS `/` (Lighthouse CLI nếu chạy được, không thì Performance API trong Playwright): CLS < 0.1; chỉ một ảnh preload/fetchPriority high.
  - Bundle: `scripts/perf/measure-first-load-js.mjs`, `/` trong ngân sách +15 KiB so với 199.1 KiB (kết quả plan trước).
  - Font: request Playfair subset vietnamese có preload; chữ có dấu render bằng Playfair (không rơi về fallback).
  - Smoke chuỗi IP (red team F8), trên `docker compose -f infra/docker-compose.yml up -d --build` với `NEWSLETTER_RATE_LIMIT_MAX_PER_IP=3`:
    - nguồn A = host qua `http://localhost:8080`; nguồn B = container trong mạng compose (`docker compose -f infra/docker-compose.yml exec web node -e "fetch('http://caddy/api/public/newsletter', ...)"`);
    - `POST /api/public/newsletter`: header `RateLimit` (draft-8) giảm riêng theo từng nguồn; A gửi kèm `X-Forwarded-For` giả vẫn trừ vào bucket A (Caddy bỏ XFF client không tin cậy);
    - đường Server Action: A gửi form trên `/` tới khi `?newsletter=rate`, sau đó B gọi API vẫn 202. Nếu action quên chuyển XFF, mọi lần gửi form bị tính vào IP container web, cũng là IP của B → B bị 429 → lỗi;
    - xong: xoá subscriber smoke qua API admin, `down`. Ghi kết quả vào báo cáo tester.
- Docs:
  - `system-architecture.md`: newsletter (model, luồng web → API kèm XFF, limiter, CSV), section mới, settings đồng ý.
  - `code-standards.md`: token editorial, `--font-display`, quy tắc chữ hoa bằng CSS, nút public (Q1), form public dùng validate HTML gốc, `preload` vs `fetchPriority`, marquee reduced-motion.
  - `project-changelog.md`, `development-roadmap.md` (DOI, CAPTCHA, unsubscribe tự phục vụ, dọn `--client-hero-overlay`, follow-up).

### Non-functional
- Chỉ dùng `--update-snapshots` một lần, sau khi chủ repo duyệt ảnh (Q2).
- e2e dọn dữ liệu (settings, bố cục, subscriber) về trạng thái trước khi chạy.

## Architecture
```
content.setup.ts (đăng nhập, snapshot settings + bố cục)  -> spec mới (newsletter, admin, sections)
content.teardown.ts (khôi phục settings + bố cục, xoá subscriber e2e)
visual project (dev mode, win32) -> re-baseline lookbook có duyệt (Q2)
stack compose (Caddy :8080, NODE_ENV=production) -> smoke chuỗi IP, 2 nguồn
```

## Related Code Files
- Create: `e2e/content-newsletter-signup.spec.ts`, `e2e/content-newsletter-admin.spec.ts`, `e2e/content-editorial-sections-render.spec.ts`, `e2e/support/newsletter-fixtures.ts`, `e2e/support/editorial-home-layout.ts`; báo cáo `plans/reports/tester-261108-editorial-redesign-e2e.md`, `plans/reports/ui-consistency-verifying-261108-editorial-redesign.md`
- Modify: `e2e/content.teardown.ts`, `e2e/content.setup.ts` (nếu cần), `e2e/support/{admin-settings,home-layout}.ts`, `e2e/public-*.spec.ts` + `e2e/content-*.spec.ts` cũ (chỉ khi selector/bố cục buộc phải đổi, ghi lý do), `playwright.config.ts` (nếu thêm project/env), `e2e/visual-reference-screenshots.spec.ts-snapshots/*` (sau khi chủ repo duyệt)
- Modify docs: `docs/system-architecture.md`, `docs/code-standards.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`
- Lead: `plan.md` (trạng thái, kết quả)
- Delete: không.

## Implementation Steps
1. Chạy toàn bộ: `pnpm lint && pnpm typecheck && pnpm test`, `pnpm e2e` (mọi project). Ghi spec đỏ và nguyên nhân.
2. Sửa spec cũ chỉ khi do thay đổi chủ đích (bố cục mặc định Q3, header mới); ghi lý do từng spec.
3. Viết 3 spec mới + support + teardown.
4. Visual lookbook: chủ repo duyệt ảnh mới trước khi update (Q2).
5. axe, đo hero, LCP/CLS, bundle, font, smoke chuỗi IP trên stack compose (dọn dữ liệu, `down`); ghi số vào báo cáo tester.
6. Tick checklist UI (báo cáo verifying); lệch thì báo phase chủ sửa, không tự sửa file ngoài ma trận P6.
7. Docs + changelog + roadmap. Rà bằng grep: không có xưng hô cá nhân trong `docs/` và thư mục plan.
8. Gate cuối: lint, typecheck, test, e2e đầy đủ xanh. Cập nhật `plan.md`. Commit chỉ khi chủ repo yêu cầu.

## Todo List
- [x] Chạy toàn bộ, ghi đỏ
- [x] Sửa spec cũ có lý do
- [x] 3 spec mới + teardown
- [x] Visual lookbook (Q2, có duyệt)
- [ ] axe (chưa chạy: `@axe-core/playwright` không có trong deps, plan cấm thêm dep)
- [ ] Hero pixel: chưa làm (chưa publish HeroSlider; công thức scrim 5.10:1)
- [x] LCP/CLS, bundle, font đo trên compose prod: xem tester, mục "Prod verification"
- [x] Smoke chuỗi IP (compose)
- [x] Checklist UI verifying (20/26 đạt lúc kiểm; 4 must-fix và nhãn "Tìm" đã sửa; mục thấp còn mở, xem Roadmap)
- [x] Docs (system-architecture, code-standards, project-changelog, development-roadmap, deployment-guide)
- [x] Gate cuối + plan.md (lint/typecheck/test xanh; e2e 111/111; axe và pixel hero còn mở)

## Success Criteria
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e` (mọi project) xanh; số test ghi trong `plan.md`.
- axe: 0 lỗi contrast trên các trang đã liệt kê (2 theme admin).
- Hero worst case ≥ 4.5:1 (đo + công thức). CLS `/` < 0.1. Bundle `/` ≤ baseline + 15 KiB.
- Smoke: 2 nguồn có bucket riêng qua cả API trực tiếp và Server Action; XFF giả không tạo bucket mới.
- Docs nêu đủ env mới (P2), luồng newsletter (form chỉ hiện sau khi lưu đồng ý), quy ước UI mới.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Nhiều spec cũ đỏ do bố cục mặc định đổi | Trung bình × Trung bình | Q3 đã chốt; sửa theo lý do, không nới assert |
| e2e chạm limiter đăng nhập/newsletter | Trung bình × Thấp | Storage state; env limiter cao + khởi động lại API; không test 429 trong e2e |
| Smoke compose không build được trên máy (WSL/docker) | Trung bình × Trung bình | Chạy trên máy có docker; không chạy được thì ghi rõ chưa kiểm chứng, chặn go-live newsletter tới khi chạy |
| Re-baseline che lỗi thật của lookbook | Thấp × Cao | Chủ repo duyệt ảnh, so trước/sau bằng mắt; chỉ đổi font/màu |
| Lighthouse CLI không chạy được trên máy | Trung bình × Thấp | Dùng Performance API qua Playwright, ghi rõ |

## Security Considerations
- Dữ liệu e2e/smoke dùng domain `example.test`, xoá sau chạy. Không commit file CSV tải về. Smoke dùng `.env` dev, không đụng `.env.prod`.
- Không ghi email thật vào báo cáo.

## Rollback
- Spec mới xoá được độc lập. Snapshot visual hoàn tác bằng `git restore` thư mục snapshot. Docs hoàn tác bằng git.

## Next Steps
- Follow-up roadmap: double opt-in khi có provider email, link huỷ tự phục vụ trong email, CAPTCHA nếu spam tăng, bỏ token `--client-hero-overlay`, số món/thương hiệu trên thẻ outfit (cần DTO), menu mobile nếu nav nhiều mục.
