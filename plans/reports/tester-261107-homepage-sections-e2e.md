# Verification gate: homepage-sections + collections (2026-11-07)

## 1. Lint / typecheck / unit
| Bước | Kết quả |
|---|---|
| `pnpm lint` (eslint .) | exit 0 |
| `pnpm typecheck` (shared, api, web) | exit 0 |
| shared | 6 files, 126/126 pass |
| api | 25 files, 177/177 pass |
| web | 84 files, 571/571 pass |
| Tổng unit | 874 pass, 0 fail, 0 skip |

- Ghi chú: plan dự kiến web ~573, thực tế 571. Không có test fail; lệch 2 test cần đối chiếu với plan (chưa kiểm).
- Cảnh báo không chặn: vitest `configLoader: 'native'`; web jsdom tạo 84 lần (54% thời gian) — gợi ý `pool: 'vmThreads'` nếu muốn nhanh hơn.

## 2. E2E (full, một lần, `E2E_BASE_URL=http://localhost:3000`)
Kết quả: **87 passed, 0 failed, 0 flaky, 0 skipped**, thời gian 1.9 phút, exit 0.

| Project | Số test |
|---|---|
| admin-flow | 1 |
| admin-shell | 18 |
| public | 41 |
| visual | 4 |
| content-collections | 4 |
| content-home-editor-flow | 2 |
| content-home-editor-mobile | 3 |
| content-home-sections-render | 7 |
| content-footer-and-nav | 5 |
| cleanup (teardown) | 1 |
| content-cleanup (teardown) | 1 |
| **Tổng** | **87** |

- Không chạy lại spec nào vì không có fail.
- Sau đó chạy riêng `--project visual` (không update snapshot): 4/4 pass.
- Log: `C:\Users\LENOVO\AppData\Local\Temp\claude\a0157126994b7d90\f69dd2a4-b8a1-4abc-9bbc-a39afcd7ddc4\scratchpad\e2e-full.log`, `...\scratchpad\e2e-visual-after.log`.
- Login: chạy trong cửa sổ sau 17:07 (Asia/Saigon), ước lượng dưới ngưỡng 20/15 phút. Không có lỗi rate limit.

## 3. Contrast `/collections/[slug]` (card title `ul > li > a > h2`)

Fixture tạm: collection `e2e-content-lh-collection` (có cover, published) + 4 outfit `e2e-content-lh-outfit-1..4`, qua admin API.
Công cụ: Chromium (Playwright) + axe-core 4.14.0 (cài ở scratchpad, không vào repo) + computed style. Chưa chạy Lighthouse CLI (không có sẵn trên PATH); rule `color-contrast` của Lighthouse dùng axe-core nên kết quả tương đương về rule này.

**Màu thật (token):** chữ `--client-ink #3b2f2a` trên nền card `#ffffff`: **12.92:1** (AAA). Không có lỗi palette.

| Trạng thái | Opacity li | Tỷ lệ tương phản | axe color-contrast |
|---|---|---|---|
| Desktop 1280x800, load, chưa scroll | 0.106 | 1.22 (axe 1.21) | **FAIL 4/4 card** (fg #e2ddd6, bg #f7f2ec) |
| Desktop, scroll grid vào view, đợi 1.5s | 1 | 12.92 | pass, 0 violation |
| Mobile 412x823, load, chưa scroll | 0.199 / 0 | 1.47 (axe 1.48) | **FAIL 2 card** (fg #d0cac3, bg #f8f4ee); 2 card opacity 0 không bị report |
| Mobile, scroll, đợi 1.5s | 1 (2 card trong view), 0.744 (2 card ngoài view) | 12.92 / 5.87 | pass, 0 violation |
| Reduced motion (desktop + mobile), mọi trạng thái | 1 | 12.92 | pass, 0 violation |
| Mid-reveal (scroll dở) | 0.37–0.52 | 2.13 / 3.11 | không chạy axe (tạm thời) |

Đọc số liệu: nguyên nhân là `motion-primitives.module.css` `.revealOnScroll` (`animation: fade-up linear backwards; animation-timeline: view()`, keyframe từ `opacity: 0`) áp lên `li` chứa card. Card chưa vào viewport có opacity thấp, nên màu hiệu dụng pha với nền thành tương phản 1.2–1.5:1. Khi card đã hiện hết (hoặc reduced motion), tương phản 12.92:1.

**Verdict:** giả thuyết đúng một phần. Đây là artefact animation, không phải lỗi màu chữ. Nhưng không phải chỉ là "mid-scroll": lúc load ban đầu (chưa scroll) audit vẫn fail. Lighthouse chạy không scroll sẽ báo lỗi này, nên điểm a11y phụ thuộc vào việc card đã vào viewport chưa.

Lưu ý quan sát: trên mobile, sau 1.5s hai card ngoài viewport vẫn ở opacity 0.744, nghĩa là animation chưa xong. Vẫn đạt AA (5.87), không gây fail.

Dữ liệu thô: `C:\Users\LENOVO\AppData\Local\Temp\claude\a0157126994b7d90\f69dd2a4-b8a1-4abc-9bbc-a39afcd7ddc4\scratchpad\contrast-raw.json` (script: `...\scratchpad\contrast-check.cjs`, phân tích: `...\scratchpad\analyze-contrast.cjs`).

## 4. Cleanup
- Fixture contrast: xóa trong `finally` của script. Sau lần chạy cuối: collection còn 0, outfit `e2e-content-lh-*` còn 0 (kiểm tra page 1 của list admin). Lần chạy đầu tiên lỗi ở selector (đã sửa), fixture cũng được xóa sạch.
- `GET /` (localhost:3000): HTTP 200, HTML không chứa `E2E LH` / `e2e-content-lh`. Chưa so sánh pixel layout home; visual project không bao gồm `/` (chỉ `/look/*`).
- `git status --short apps/web/next-env.d.ts`: sạch (không có output).
- Không sửa code app, không sửa test/e2e file, không update snapshot.

## Vấn đề và khuyến nghị
1. **[Trung bình] Card faded khi chưa vào viewport gây fail color-contrast (axe/Lighthouse)** tại `apps/web/src/styles/motion-primitives.module.css` (`.revealOnScroll`) áp lên `li` trong `outfit-card-grid.tsx:29` và `collection-card-grid.tsx:32`. Hướng xử lý (chưa làm, cần chủ repo chọn):
   - A. Chỉ animate `transform` (translate), bỏ `opacity` từ 0: giữ hiệu ứng, text luôn đủ tương phản. Đổi nhỏ, giảm rủi ro a11y. Mất một phần hiệu ứng "hiện dần".
   - B. Giữ opacity nhưng bắt đầu từ mức đủ tương phản (ví dụ không dưới 1 hoặc bỏ opacity ở `li`, chuyển sang card). Vẫn có hiệu ứng, nhưng vẫn cần kiểm tra.
   - C. Giữ nguyên, chấp nhận: lỗi chỉ xuất hiện lúc load chưa scroll. Rủi ro: điểm Lighthouse dao động theo hành vi scroll.
   Em nghiêng về A hoặc B vì rẻ và không ảnh hưởng nội dung.
2. **[Thấp] Số test web 571 khác kỳ vọng ~573.** Cần đối chiếu plan để biết có phải test bị bỏ/gộp không.
3. **[Thấp] Lighthouse CLI chưa chạy full.** Nếu cần điểm Lighthouse chính thức, cài Lighthouse và chạy `--only-categories=accessibility,seo` trên một trang collection có fixture (ví dụ tạo lại bằng script trên).

## Chưa giải quyết
- Chọn phương án 1A/1B/1C cho `.revealOnScroll` (quyết định sản phẩm/UX, không thuộc phạm vi QA).
- Có cần chạy Lighthouse chính thức hay axe là đủ cho gate này.
- Nguyên nhân lệch 2 test web (571 vs ~573) chưa kiểm.

**Status:** DONE_WITH_CONCERNS
**Summary:** Lint, typecheck, unit (874) và e2e (87/87) đều pass. Giả thuyết contrast đúng một phần: lỗi màu là artefact của animation reveal (opacity thấp khi card chưa vào viewport), palette thật đạt 12.92:1. Fixture tạm đã xóa sạch.
**Concerns/Blockers:** card fade lúc load chưa scroll vẫn fail axe/Lighthouse color-contrast (1.2–1.5:1); cần quyết định sửa `.revealOnScroll`. Lighthouse CLI chưa chạy, dùng axe-core. Web unit 571 khác kỳ vọng ~573.
