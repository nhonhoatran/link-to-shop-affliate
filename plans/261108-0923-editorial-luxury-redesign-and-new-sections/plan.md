---
title: "Re-skin editorial monochrome (public + admin) và 4 section trang chủ mới"
description: "Đổi token sang editorial monochrome + Playfair Display, re-skin shell/trang public và admin, thêm CampaignBanner, Marquee, Gallery, NewsletterSignup (kèm bản ghi đồng ý + trang admin Đăng ký nhận tin)."
status: completed
priority: P2
effort: 72h
branch: main
tags: [frontend, backend, design-system, newsletter, home-sections]
created: 2026-11-08
---

# Editorial monochrome + section mới (parallel)
## Overview
Nguồn: [research font/motion](../reports/researcher-261108-0930-editorial-fonts-and-motion.md) · [research newsletter](../reports/researcher-261108-0930-newsletter-signup.md) · mockup Stitch "Under30SS Editorial Mono". Token-first: đổi giá trị `--client-*`/`--admin-*` trước, sau đó sửa bố cục có chủ đích. "Danh mục" = Bộ sưu tập có sẵn, không đổi DB cho nó. Kế thừa quy ước của [plan section trang chủ](../261107-1341-homepage-sections-and-collections/plan.md).

## Phases
| # | Phase | Effort | Chờ | Status |
|---|-------|--------|-----|--------|
| 1 | [Nền: contract, token, font, field spec](./phase-01-foundation-contracts-tokens-fonts.md) | 10h | — | Completed |
| 2 | [API: resolver section mới, newsletter, settings](./phase-02-api-sections-newsletter-settings.md) | 12h | P1 | Completed |
| 3 | [Re-skin shell + trang public](./phase-03-public-shell-and-pages-reskin.md) | 12h | P1 | Completed |
| 4 | [Section trang chủ: restyle 7 + 4 view mới + form](./phase-04-home-sections-restyle-and-new-views.md) | 16h | P1 (đóng sau P2) | Completed |
| 5 | [Re-skin admin + trang Đăng ký nhận tin](./phase-05-admin-reskin-and-newsletter-admin.md) | 12h | P1 (đóng sau P2, P4) | Completed |
| 6 | [Test, kiểm chứng, docs](./phase-06-tests-verification-docs.md) | 10h | tất cả | Completed |

- Waves: P1 → (P2 ∥ P3 ∥ P4 ∥ P5) → P6. Critical path: P1 10h → P4 16h (đóng khi có P2) → P6 10h = 36h.
- "Đóng sau": code song song theo contract P1 + fixture, chỉ đóng khi chạy thật với API P2 (P5 cần thêm view P4 cho khung xem trước).
- Mỗi phase kết thúc xanh: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `E2E_BASE_URL=http://localhost:3000 pnpm e2e --project visual` (không `--update-snapshots`; ngoại lệ Q2).
- Không commit từng phase. Một bộ commit cuối đợt, chỉ khi chủ repo yêu cầu (tiếng Anh, conventional). Hoàn tác theo ma trận, thứ tự ngược.

## File ownership
Chi tiết + rà trùng: [file-ownership-matrix.md](./file-ownership-matrix.md). Checklist UI: [ui-consistency-checklist.md](./ui-consistency-checklist.md).
| Phase | Sở hữu chính |
|-------|--------------|
| 1 | `packages/shared/src/**`, 3 token CSS, `globals.css`, `app/layout.tsx`, `public-button.module.css`, `home-editor/{home-section-field-specs,section-summary,use-section-preview-data}.ts` + `field-specs/**`, fixture `home-editor-fixture.ts` |
| 2 | `apps/api/**`, 2 file `.env.example`, `docs/deployment-guide.md` |
| 3 | `components/public/**`, `components/lookbook/**`, `app/(public)/**` trừ `page.tsx`, `app/not-found.tsx`, test public/lookbook |
| 4 | `components/home-sections/**`, `lib/newsletter/**` (Server Action + helper IP), `app/(public)/page.tsx`, `lib/api-client-server.ts`, test home-sections + `test/lib/newsletter` |
| 5 | `app/admin/**`, `components/admin/**` (trừ file của P1), `lib/admin-paths.ts`, test admin (trừ fixture của P1) |
| 6 | `e2e/**`, `playwright.config.ts`, `docs/*` trừ deployment-guide; chạy smoke chuỗi IP trên stack compose |
Cặp tuần tự: `home-section-resolver-service.ts` (P1 → P2), `home-section-views.ts` (P1 → P4). P1 chỉ thêm nhánh rỗng để typecheck xanh.

## Quyết định đã chốt (2026-11-08)
1. Token: bg #FAF8F5, surface #FFF, ink #111, muted #5C5752, border #E7E2DA; không accent màu, không shadow, góc 2px. Tiêu đề Playfair Display (`--font-display`), thân Be Vietnam Pro. Nhãn/nav/nút: viết hoa bằng CSS + giãn chữ 0.14em.
2. Section mới qua registry: CampaignBanner (ảnh + panel chữ nền đặc), Marquee (CSS, checkbox tạm dừng, tắt khi reduced-motion), Gallery (mosaic, outfit resolve ở API, link `/look/[slug]`), NewsletterSignup.
3. Newsletter: single opt-in, checkbox đồng ý không tick sẵn, bản ghi đồng ý (không IP thô). Server Action → API kèm `X-Forwarded-For`, PRG `?newsletter=ok|invalid|rate|error`, chạy không JS. API: honeypot, limiter theo IP (env), unique email, luôn 202. Admin: list server-side, CSV (BOM + chống formula), huỷ (mặc định), xoá cứng (hỏi xác nhận). DOI để sau.
4. Bỏ khỏi mockup: giá, "tổng cộng", icon giỏ/tim/tìm kiếm, nút ngôn ngữ, số món/thương hiệu trên thẻ outfit (DTO không có).
5. Lookbook giữ layout đo sẵn, chỉ đổi font/màu. `preload` chỉ cho một ảnh LCP; ảnh art-direct `<picture>` giữ `fetchPriority`.
6. Hero: scrim gradient alpha >= 0.6 trong vùng chữ (4.95:1 trên ảnh trắng); mobile chữ nằm panel dưới ảnh.
7. Không dependency mới, file < 200 dòng, comment tiếng Anh tối thiểu. Mọi giá trị nghiệp vụ ở settings/env/props section.

## Câu hỏi đã chốt (2026-11-08)
- **Q1 → có.** P1 tạo `components/public/public-button.module.css`; P3/P4 dùng và xoá rule pill riêng (14 chỗ / 11 module).
- **Q2 → có.** Lookbook đổi font. Sau P3, spec visual được phép đỏ (chỉ lookbook); P6 chụp lại baseline một lần sau khi chủ repo duyệt ảnh mới bằng mắt.
- **Q3 → 5 section.** Bố cục mặc định: FeaturedLookbook, CollectionTiles, OutfitList (tab), Gallery (mới nhất), NewsletterSignup. HeroSlider/CampaignBanner/Marquee/Commitments chỉ thêm qua editor.
- **Q5 → `latest | collection | manual`.** Bỏ nguồn "featured" của Gallery.

## Câu hỏi còn mở
- **Q4. Câu đồng ý + link chính sách bảo mật:** chưa chốt. Tạm dùng câu mặc định trong P1 (admin sửa được trong Cài đặt), link chính sách để trống (site chưa có trang chính sách). Chủ repo duyệt chữ và nên có luật sư xem trước go-live (research dùng nguồn thứ cấp).

## Kết quả (2026-11-08)
- Unit: shared 164 / api 223 / web 664. Lint, typecheck xanh.
- E2E: full 111/111 (public 61; admin-shell; visual 4/4 sau re-baseline một lần; content chain: newsletter-signup 6, admin 8, editorial 9). Ảnh visual mới đã duyệt 2026-11-08 (chạy auto theo chỉ đạo chủ repo): 3 cặp chỉ khác font; dramatic 390 ngắn hơn 16px do Playfair hẹp hơn làm nhãn xuống dòng ít hơn (vd "Túi đeo chéo" 1 dòng), hotspot vẫn khớp món, không phải lỗi bố cục. Ảnh trong `visuals/`.
- Prod compose (:8080): smoke chuỗi IP PASS (2 nguồn, XFF giả bị bỏ, form Server Action tính đúng IP). `/`: CLS 0, LCP ~330-370 ms, 1 ảnh preload, Playfair vietnamese preload.
- Bundle `/`: 199.8 KiB (baseline 199.1, ngân sách +15).
- Code review 8/10: 0 critical; H1, M1-M4 và nhiều low đã sửa.
- UI checklist: 20/26 lúc kiểm; 4 must-fix đã sửa, cộng nhãn "Tìm".
- Đổi phạm vi (chủ repo, 2026-11-08): công tắc bật/tắt form bản tin trong Cài đặt. PUT thiếu `newsletterConsent` thì xoá câu; version vẫn tăng đơn điệu. P2 ghi "giữ nguyên", đã đổi.
- Còn mở: axe (chưa có dep, không tự thêm); pixel hero (chưa publish HeroSlider, công thức 5.10:1); Q4 chữ đồng ý + link chính sách (legal review trước go-live); Caddy `encode zstd gzip` (đo trước khi đổi); mục UI thấp (K3, G4 lookbook, G1 token, I2); deferred lows.
