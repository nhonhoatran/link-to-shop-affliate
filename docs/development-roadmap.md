# Roadmap Under30ss

Trạng thái tính đến 2026-11-12. Chi tiết từng phase nằm trong `plans/261106-1201-under30ss-shop-the-look/` (v1) và `plans/261107-0913-professional-ui-refactor-client-admin/` (refactor giao diện).

Liên quan: [Lịch sử thay đổi](./project-changelog.md) · [Kiến trúc](./system-architecture.md) · [Triển khai](./deployment-guide.md)

## Contents
- [Trạng thái phase](#trạng-thái-phase)
- [Refactor giao diện client và admin](#refactor-giao-diện-client-và-admin)
- [Đợt editorial và bản tin](#đợt-editorial-và-bản-tin)
- [Feed outfit kiểu TikTok](#feed-outfit-kiểu-tiktok)
- [Photo post kiểu TikTok trong feed](#photo-post-kiểu-tiktok-trong-feed)
- [Cột mốc](#cột-mốc)
- [Việc chưa kiểm chứng](#việc-chưa-kiểm-chứng)
- [Việc hoãn sang sau v1](#việc-hoãn-sang-sau-v1)
- [Bước tiếp theo](#bước-tiếp-theo)
- [Ngoài phạm vi v1](#ngoài-phạm-vi-v1)

## Trạng thái phase

### v1

| Phase | Nội dung | Trạng thái | Kết quả kiểm chứng |
|-------|----------|------------|--------------------|
| P1 | Nền tảng và hợp đồng (monorepo, shared, compose dev, Caddy, RustFS) | Hoàn thành | Compose dev chạy đủ 5 service |
| P2 | Backend API | Hoàn thành | Unit test api pass (xem [số liệu](#số-liệu-kiểm-thử)) |
| P3 | Ảnh mẫu và seed | Hoàn thành | `pnpm seed:samples` chạy thật. Ảnh người mẫu là ảnh cắt tạm |
| P4 | Lookbook UI | Hoàn thành | Khớp ảnh mẫu ở các điểm chính. Còn khác biệt, xem [việc hoãn](#việc-hoãn-sang-sau-v1) |
| P5 | Trang public và SEO | Hoàn thành | Lighthouse SEO 100 (`/` và `/look/dramatic`, desktop và mobile, đo 2026-11-06) |
| P6 | Admin UI | Hoàn thành | E2E luồng admin tạo, upload, đặt điểm, publish, thấy trên public |
| P7 | Tích hợp, test, deploy | Hoàn thành phần local. Deploy thật chưa làm | Compose prod đã kiểm bằng stack thử nghiệm. Sao lưu đã chạy thử |

### Refactor giao diện client và admin

Kế hoạch 7 phase, phụ thuộc theo `plan.md` trong thư mục plan. Tất cả phase đã có code. Chưa commit (chủ repo chưa cho commit).

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| P1 | Token 3 file, primitive chuyển động, baseline visual lookbook | Hoàn thành. Checklist `ui-consistency` ghi ở `plans/reports/ui-consistency-verifying-261107-1205-ui-refactor.md` |
| P2 | API list public, stats admin, settings mới, index, revalidate `/looks` | Hoàn thành |
| P3 | Shell public, trang `/looks`, breadcrumb, mục "Outfit khác" | Hoàn thành |
| P4 | Connector vẽ một lần, route fade | Hoàn thành |
| P5 | Shell admin, dark mode ba trạng thái, Tổng quan | Hoàn thành |
| P6 | Màn hình admin responsive (danh sách, editor, settings, users) | Hoàn thành |
| P7 | Test, verification, docs | Hoàn thành phần code và docs. Còn việc chạy lại đầy đủ (xem [việc chưa kiểm chứng](#việc-chưa-kiểm-chứng)) |

#### Số liệu kiểm thử

| Hạng mục | Số liệu (2026-11-07) | Ghi chú |
|----------|----------------------|---------|
| Unit shared | 37 pass | Trước refactor: 32 |
| Unit api | 102 pass | Trước refactor: 83. Một lần crash worker ở lần chạy đầu, xem [việc chưa kiểm chứng](#việc-chưa-kiểm-chứng) |
| Unit web | 265 pass | Trước refactor: 166 |
| E2E | 65 passed (`pnpm e2e`, 2026-11-07): admin-flow 1, public 41, admin-shell 18, visual 4, cleanup 1 | Trước refactor: 17 |
| Lighthouse SEO | `/`, `/looks`, `/look/dramatic`: 100 mobile và desktop (dev mode, Lighthouse 12.8.2, đo 2026-11-07) | `/looks` từng là 92 trước khi thêm mô tả dự phòng |

Số liệu unit đo lại bằng `pnpm exec vitest run` trong từng workspace. E2E chỉ đếm bằng `--list`, chưa chạy lại vì cần stack.

## Trang chủ section, bộ sưu tập và editor

Plan: `plans/261107-1341-homepage-sections-and-collections/`. Trạng thái: P1–P7 đã code, chưa commit.

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| P1–P6 | Xem [mục changelog](./project-changelog.md#trang-chủ-section-bộ-sưu-tập-và-editor-2026-11-07) | Hoàn thành |
| P7 | E2E, số đo, tài liệu | Xem bảng kiểm chứng bên dưới |

### Số liệu và ngân sách

- Unit (2026-11-07, `pnpm test`): `packages/shared` 126/126; `apps/api` 183/183; `apps/web` 572/572. Một lần chạy trước đó trên Windows có worker crash ở `test/auth-device-cookie.test.ts` (exit `3221226505`); chạy lại đầy đủ không tái hiện.
- E2E: 88 test (`playwright test --list`) = 65 project cũ + 23 project `content` (setup 1, collections 4, editor 2, editor mobile 3, render 7, footer và nav 5, cleanup 1). Báo cáo tester ghi lần chạy đủ trước đó: 87/87 xanh (chưa tính `content-setup`). Lần chạy 88/88 chưa có báo cáo.
- Visual: 4/4 xanh, không cập nhật snapshot.
- Accessibility: chưa chạy Lighthouse CLI. Kiểm tra bằng axe-core 4.14.0 (rule `color-contrast`, cùng rule với Lighthouse). Card đang fade do `.revealOnScroll` (`apps/web/src/styles/motion-primitives.module.css`) fail ở 1.2–1.5:1 khi tải lúc chưa cuộn.
- First Load JS (encoded KiB, `scripts/perf/measure-first-load-js.mjs`, median): `/` 199,1 (baseline 196,0, tăng 3,1 KiB, trong ngân sách +15 KB); `/looks` 194,0. Số baseline và cách đo: [perf-baseline-first-load-js.md](../plans/261107-1341-homepage-sections-and-collections/perf-baseline-first-load-js.md).
- `GET /api/public/home` (layout mặc định, 3 section): median khoảng 6 ms ở `localhost`. Chưa đo với bố cục đầy đủ section.

### Việc còn mở

| Việc | Lý do và bằng chứng | Hướng xử lý |
|------|---------------------|-------------|
| Reveal animation làm card fail contrast | axe `color-contrast` 1.2–1.5:1 lúc load chưa cuộn (xem trên) | Chủ repo chọn: đổi `.revealOnScroll` hoặc chấp nhận |
| Lighthouse chính thức | Chưa chạy CLI, mobile + desktop, build production, cho `/`, `/collections`, `/collections/[slug]` | Chạy và ghi số vào báo cáo |
| Meta description rỗng | Khi `seoDescription` của site rỗng, `/` và `/collections/[slug]` không có description (`apps/web/src/app/(public)/page.tsx`, `apps/web/src/lib/seo/build-collection-metadata.ts`) | Thêm chữ mặc định cho trang chủ, đồng bộ với trang danh sách |
| N+1 khi lấy tên nhãn trong editor và picker | Mỗi nhãn gọi một lần | Thêm filter `ids` cho list API |
| Thiếu lock trên reset và revert-draft | Hai thao tác này không nhận `baseUpdatedAt` | Thêm lock như publish và restore |
| Gộp JSON-LD FAQPage | Trang có nhiều section FAQ cần một khối gộp | Thống nhất khi có nhiều FAQ |
| Field bắt buộc của chrome public | Header, footer, announcement chưa đánh dấu rõ field bắt buộc | Bổ sung vào schema và form |
| Gộp helper API trùng | Một số helper lặp giữa các service | Dedupe theo DRY |
| File vượt 200 dòng | Quy tắc `development-rules.md` | Rà và tách module |

- Đã xong, không còn là follow-up: link mạng xã hội mở cùng tab (`PublicSmartLink` có prop `newTab`, chỉ bật `target="_blank"` cho URL ngoài; `site-social-links.tsx`).
- Follow-up trong plan: xoá `getFeaturedOutfit` nếu không còn dùng, blog (dự án con), giá và brand món đồ, dọn loader không dùng, dọn heading/pill trùng ở module cũ (checklist UI, C2 và Q1).

## Đợt editorial và bản tin

Plan: `plans/261108-0923-editorial-luxury-redesign-and-new-sections/`. Trạng thái: đã code và kiểm chứng, chưa commit. P6 còn mở: axe và pixel nền hero (xem mục "Việc chưa kiểm chứng" trong đợt này).

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| P1–P5 | Xem [mục changelog](./project-changelog.md#editorial-monochrome-section-trang-chủ-mới-và-bản-tin-2026-11-08) | Xong. Unit, e2e, smoke compose xanh (2026-11-08) |
| P6 | E2E, kiểm chứng, tài liệu | Xong trừ axe và pixel hero. Xem bảng bên dưới |

### Số liệu

- Unit: `packages/shared` 164, `apps/api` 223, `apps/web` 664 (báo cáo `fullstack-developer-261108-review-fixes.md`; `pnpm test` gốc chạy lại 2026-11-08 sau sửa header, xanh).
- E2E: `pnpm e2e` đầy đủ 111/111 xanh (public 61, admin-shell, visual 4/4, chuỗi content gồm newsletter-signup 6, newsletter-admin 8, editorial-sections-render 9).
- Visual: 4/4 xanh sau khi cập nhật baseline một lần (Q2).
- Trang `/` trên compose prod: LCP 328-368 ms, CLS 0, một `<link rel="preload" as="image">`, Playfair vietnamese preload.
- First Load JS `/`: 199,8 KiB, baseline 199,1, ngân sách +15 KiB. Đo bằng `scripts/perf/measure-first-load-js.mjs` trên `localhost:8080`.

### Việc còn mở

| Việc | Lý do và bằng chứng | Hướng xử lý |
|------|---------------------|-------------|
| Lookbook dramatic 390 | Báo cáo tester ghi cột ngắn hơn 16 px, nhãn "TÚI ĐEO CHÉO" xuống dòng khác (`visuals/`). Baseline đã cập nhật 4/4, nhưng chưa có báo cáo xác nhận lỗi layout đã sửa | Rà `visuals/lookbook-dramatic-390-*` bằng mắt. Nếu còn lệch layout thì sửa P3 rồi chụp lại baseline |
| Dữ liệu dev có bộ sưu tập `test` đã đăng | Spec xoá bộ sưu tập đã sửa: chỉ kiểm bộ sưu tập e2e biến mất (`content-collections-flow.spec.ts`). Link "Bộ sưu tập" vẫn hiện vì dữ liệu dev | Chủ repo quyết: dọn dữ liệu dev, hoặc giữ như hiện tại |
| Q4: câu đồng ý và link chính sách | Chưa chốt. Site chưa có trang chính sách | Chủ repo duyệt chữ. Nên có luật sư xem trước go-live |
| Mục UI còn mở (báo cáo verifying) | K3: nhóm Bản tin còn `fieldset disabled` (`settings-newsletter-consent-fields.tsx:29`, kiểm 2026-11-08). G4: tên món lookbook vẫn đậm (`lookbook.module.css:65`, theo báo cáo). G1: token `--client-hero-overlay` còn định nghĩa, không dùng (`client-theme-tokens.css:35`, kiểm 2026-11-08). I2: hover ô Gallery chưa bọc `(hover: hover)` (theo báo cáo, chưa kiểm lại) | Sửa theo mẫu announcement; chọn đậm hoặc 400 khi duyệt lookbook; xoá token; kiểm lại I2 |

### Việc chưa kiểm chứng

Các mục sau chưa chạy. Không coi là đã xong.

| Mục | Lý do | Cần để kiểm chứng |
|-----|-------|-------------------|
| axe trên `/`, `/looks`, `/look/[slug]`, `/collections`, `/admin/newsletter`, `/admin/settings`, sáng và tối | Chưa có `@axe-core/playwright` trong deps. Plan không thêm dependency | Quyết định: thêm dev dependency, hay chạy axe-core thủ công và ghi kết quả |
| Pixel nền hero dưới ảnh trắng | Chưa có HeroSlider publish trên DB dùng chung. Mới tính theo công thức scrim: 5,10:1 (tester, mục Prod verification) | Publish một HeroSlider ảnh trắng trên DB dev, chụp và đo pixel vùng chữ |

### Follow-up

- Double opt-in khi có nhà cung cấp email.
- Link huỷ đăng ký tự phục vụ trong email (cần có email gửi đi trước).
- CAPTCHA nếu spam tăng.
- Xoá token `--client-hero-overlay`.
- Số món và thương hiệu trên thẻ outfit. Cần thêm trường vào DTO. Giá và icon giỏ đã bỏ theo mockup.
- Menu mobile nếu thanh nav có thêm mục. Hiện nav tự xuống dòng.
- Tự động hoá axe-core trong e2e (chưa có dependency).
- Gallery nguồn `collection` và `manual` có nên bỏ trùng như `latest` không. Hiện chỉ `latest` bỏ trùng.
- `CampaignBanner`, `Marquee`, `Gallery` chỉ nằm trong container, chưa có tuỳ chọn tràn viền (full-bleed).
- Staging: nếu đặt sau Caddy mà chạy `NODE_ENV=development` thì limiter bản tin gộp mọi khách vào một bộ đếm. CDN đặt trước Caddy cần `trusted_proxies`. Xem [Triển khai](./deployment-guide.md).
- Caddy `encode zstd gzip` (`infra/caddy/Caddyfile:3`): với JS của `/`, zstd lớn hơn gzip (208,8 KiB so với 199,5 KiB, đo bằng curl 2026-11-08). Đo lại trước khi đổi thứ tự (gzip trước) để chọn theo số liệu.
- `e2e/support/outfit-state.ts:21` vẫn ghi state vào `test-results/e2e-outfit-state.json`. Playwright xoá `test-results/` khi bắt đầu chạy, nên chuyển state sang `e2e/.state/` như snapshot.

## Feed outfit kiểu TikTok

Plan: `plans/261110-2143-tiktok-outfit-feed/`. Trạng thái: xong 2026-11-11. Unit web 694/694, e2e 126/126, snapshot visual chụp lại.

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| P00 | Hợp đồng dùng chung (`packages/shared`) | Xong (theo plan) |
| P01 | API `GET /api/public/outfits/feed`, setting `homeMode` | Xong (theo plan) |
| P02 | Feed trên `/`, `/looks`, `/collections/[slug]`; lookbook `fill` | Xong. Ảnh kiểm trong `plans/261110-2143-tiktok-outfit-feed/visuals/`; đã sửa các lỗi từ code review |
| P03 | Ô "Trang chủ hiển thị" trong Cài đặt; nhắc trong trình dựng trang chủ | Xong. Unit test có; chưa chụp ảnh màn admin |
| P04 | E2E, snapshot, tài liệu | Xong. E2E 126/126 (2026-11-11), snapshot visual chụp lại |

Chi tiết kỹ thuật: [Kiến trúc, mục Feed outfit](./system-architecture.md#feed-outfit). Thay đổi: [Lịch sử, mục 2026-11-10](./project-changelog.md#feed-outfit-kiểu-tiktok-2026-11-10).

### Việc còn mở

| Việc | Lý do và bằng chứng | Hướng xử lý |
|------|---------------------|-------------|
| Ảnh màn admin "Trang chủ hiển thị" | Chưa chụp; đăng nhập admin bằng trình duyệt tự động bị chặn trong phiên làm việc | Chủ repo xem trực tiếp trong admin |
| Menu header ở 360px | Mục "Bộ sưu tập" phải vuốt ngang mới thấy hết. Đã chốt 2026-11-11 giữ vuốt ngang | Không làm gì |
| iOS Safari và `100dvh` | Plan P02 ghi rủi ro vùng cuộn lồng nhau | Kiểm trên thiết bị thật |
| Lô feed có thể lặp hoặc sót khi outfit bị sửa lúc khách đang lướt | Phân trang `skip`/`limit` theo `featured`, `updatedAt` (`public-outfit-feed-service.ts`) | Đổi sang phân trang theo con trỏ nếu gặp thực tế |
| Slug `featured`, `slugs`, `feed` trong dữ liệu thật | Schema đã từ chối slug này, chưa kiểm dữ liệu có sẵn | Truy vấn DB trước khi triển khai |
| Demo seed không đặt `homeMode` | `pnpm seed:demo` không đổi `homeMode`, nên `/` hiện feed, không hiện bố cục 11 section | Đặt `homeMode` trong seed nếu muốn demo bố cục |

## Photo post kiểu TikTok trong feed

Plan: `plans/261112-0854-tiktok-photo-post-feed/`. Trạng thái: phase 01 code xong, chưa commit. Phase 02 (unit, e2e, snapshot, docs) đang làm; docs đã cập nhật 2026-11-12.

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| 01 | Khung bài Photo: dải ảnh vuốt ngang, chấm và mũi tên, chữ đè, cột nút, sheet "Mua đồ", "Chia sẻ", phím ← → | Code xong, chưa commit. Đã sửa theo [báo cáo review](../plans/reports/code-reviewer-261112-0913-tiktok-photo-post-feed.md) |
| 02 | Unit test, e2e, chụp lại snapshot, docs | Docs xong. Test, e2e, snapshot: test: xem phase 02 |

Chi tiết kỹ thuật: [Kiến trúc, mục Feed outfit](./system-architecture.md#feed-outfit). Thay đổi: [Lịch sử, mục 2026-11-12](./project-changelog.md#bài-photo-kiểu-tiktok-trong-feed-2026-11-12).

### Việc còn mở

| Việc | Lý do và bằng chứng | Hướng xử lý |
|------|---------------------|-------------|
| Unit, e2e, snapshot cho bài Photo | `apps/web/test/feed/` hiện chỉ có 3 file (`feed-load-more`, `feed-step-buttons`, `load-feed-page-action`). Phase 02 chưa xong | Làm phase 02 |
| Lỗi Low còn lại từ review | Đơn vị token thời gian; bấm nhanh có thể nuốt một lần; focus rơi khi mũi tên bị disable; ngữ nghĩa carousel; kéo chọn chữ ra nền làm đóng sheet | Để sau, xem báo cáo review |
| Header và thanh thông báo chiếm ~257px trên mobile | Câu hỏi mở trong `plan.md`. Chưa chốt | Chờ khách phản hồi |

## Cột mốc

| Ngày | Cột mốc |
|------|---------|
| 2026-11-06 | P1 đến P6 hoàn thành. P7: compose prod, sao lưu, Playwright, Lighthouse, review và sửa vòng hai |
| 2026-11-06 | Lookbook khớp ảnh mẫu hơn (connector cong, mũi tên, hotspot, pin trên mobile) |
| 2026-11-07 | Xác nhận lại test và E2E. Viết tài liệu `docs/` (v1) |
| 2026-11-07 | Refactor giao diện client và admin hoàn thành về code (7 phase). Cập nhật tài liệu `docs/` |
| 2026-11-08 | Đợt editorial: token monochrome, Playfair, 4 section mới, bản tin (form, admin, CSV). Review, sửa vòng hai, e2e 111/111 xanh, smoke compose và số đo prod. Còn mở: axe, pixel hero, Q4 |
| 2026-11-10 | Feed outfit kiểu TikTok: API `GET /api/public/outfits/feed`, setting `homeMode`, feed trên `/`, `/looks`, `/collections/[slug]`, ô cài đặt admin. Code xong, chưa commit. E2E và snapshot còn mở |
| 2026-11-12 | Bài Photo kiểu TikTok trong feed: dải ảnh vuốt ngang, chấm, chữ đè, cột nút, sheet "Mua đồ", "Chia sẻ". Code xong, chưa commit. Test, e2e và snapshot theo phase 02 |

## Việc chưa kiểm chứng

Các mục sau chưa được chạy trong môi trường thật. Không coi là đã xong.

| Mục | Lý do | Cần để kiểm chứng |
|-----|-------|-------------------|
| HTTPS thật với Let's Encrypt qua Caddy | Chưa có VPS và domain | VPS, DNS trỏ về, mở 80 và 443 |
| Đăng nhập admin qua HTTPS (cookie `secure`) | Cần HTTPS | Như trên |
| Cookie `admin-theme` và `admin-sidebar` có `secure` đúng sau Caddy | `secure` suy từ header `x-forwarded-proto: https`. Caddyfile không đặt header này tường minh (`infra/caddy/Caddyfile` chỉ có `header_up Host`). Chưa xác nhận Caddy có tự gửi hay không | Log tạm header trong web, đi qua `:8080`. Kiểm lại trên HTTPS thật |
| Bản build production của refactor | Số Lighthouse và visual đo ở dev mode (`pnpm dev`) | Build production, chạy `next start` hoặc compose prod, đo lại Lighthouse và visual |
| Crash worker ở `auth-cookie-flags.test.ts` | Lần `pnpm test` đầu tiên (2026-11-07): worker thoát với mã `3221226505` (0xC0000409). Lần chạy lại 102/102 pass. Chưa tìm nguyên nhân | Chạy lặp `apps/api` vài lần để xem có tái diễn không. Nếu có, điều tra trước khi tin số test |
| Đổi `looksPageSize` và trang `/looks` | Đã gắn tag `public-settings` + `revalidateTag(tag, { expire: 0 })`. Đo 2026-11-07: `/looks` đổi sau khoảng 100ms; e2e giữ poll tối đa 10s vì Next áp dụng sau khi trả response | Bỏ poll nếu API/web xác nhận được lúc revalidate xong |
| Xoá bản sao lưu cũ theo `BACKUP_RETENTION_DAYS` | Chưa có bản cũ để xoá | Chạy đủ số ngày hoặc giả lập thư mục cũ |
| Cron sao lưu thật trên VPS | Chưa có VPS | VPS và cron. Xem [sao lưu](./deployment-guide.md#sao-lưu) |
| Khôi phục bucket khi stack production đang chạy | Mới thử trên stack thử nghiệm | Lần diễn tập khôi phục định kỳ |

## Việc hoãn sang sau v1

Mã `L` là mục từ v1. Mã `UR` là mục từ review refactor giao diện (`plans/reports/code-reviewer-261107-1205-ui-refactor-review.md`).

| Mã | Mô tả | Tác động | Điều kiện mở |
|----|-------|----------|--------------|
| L8 | Object S3 mồ côi: xoá outfit hoặc thay ảnh không xoá object cũ trong bucket | Tốn dung lượng bucket theo thời gian. Không ảnh hưởng hiển thị | Chọn cách: xoá ngay khi thay hoặc xoá, hoặc job dọn định kỳ (cần đối chiếu với bản sao lưu) |
| L9 (một phần) | Thông báo lỗi theo trường từ server còn tiếng Anh, ví dụ `Email already exists` | Người dùng admin thấy lỗi một phần bằng tiếng Anh | Viết lại thông báo tiếng Việt cho các mã trả về trong `fields` |
| Đồng thời đặt nổi bật | Hai admin cùng đặt nổi bật: editor bên thua hiển thị trạng thái cũ tới khi tải lại. Dữ liệu vẫn đúng (một outfit nổi bật) | Hiển thị sai trên màn hình admin tạm thời | Làm mới trạng thái sau khi nhận 409 hoặc sau mỗi thao tác |
| Ảnh người mẫu và link thật | Ảnh hiện là ảnh cắt tạm (`scripts/assets/clean-model-lines.py`). Link affiliate còn trống, nên seed để outfit ở `draft` | Trang chưa dùng được cho khách thật. Visual chưa đạt 100% so với ảnh mẫu | Bên nội dung (Kim) gửi ảnh sạch và link. Thay ảnh, điền link, publish |
| Mobile dưới 640 px | Hiện pin thay thread. Mô tả ẩn | Khác ảnh mẫu trên mobile (có chủ đích, chờ quyết định thiết kế) | Quyết định thiết kế cho mobile |
| `next/image` không tối ưu | `unoptimized: true`, ảnh người mẫu 1600 px tải nguyên bản trên mobile | Tốn băng thông trên mobile | Resize theo viewport, hoặc bật optimizer. Cần đường tới media host từ container web (xem comment trong `apps/web/next.config.ts`) |
| Độ khớp lookbook với ảnh mẫu | Người mẫu trông nhỏ hơn do ảnh cắt tạm còn lề trắng. Cột phải xuống dòng nhiều hơn. Thread mảnh hơn ảnh mẫu. Vị trí hotspot đã khớp ảnh (có e2e `public-hotspot-alignment`) | Khác biệt nhỏ về thị giác | Thay ảnh sạch, chỉnh token cột và độ dày thread |
| Visual baseline chỉ có `win32` và dev mode | Snapshot `-visual-win32.png` chỉ khớp Windows, chạy dev. CI Linux hoặc build production sẽ lệch | Visual không chạy được ngoài máy gốc | Chốt môi trường chạy visual. Chụp baseline riêng cho môi trường đó |
| `motion` làm tăng First Load JS | Chưa đo chênh lệch dung lượng bundle trước và sau khi thêm `motion@14.10.1` | Chưa biết tác động lên thời gian tải trang | Build production, đo First Load JS của `/`, `/looks`, `/look/[slug]`, ghi vào `plans/261107-0913-professional-ui-refactor-client-admin/design-palette-and-contrast.md` |
| UR3 | "Outfit khác" có thể thiếu một thẻ khi `relatedOutfitsCount` bằng `PUBLIC_PAGE_SIZE_MAX`. `getRelatedOutfits` xin `count + 1` nhưng API kẹp về trần. Chưa thấy sửa | Mục gợi ý ít hơn một thẻ ở cấu hình biên | Sửa khi chạm `getRelatedOutfits`, hoặc chặn `relatedOutfitsCount` ở trần - 1 |
| UR5 | `ADMIN_STATS_RECENT_COUNT` đọc qua `process.env` trong `runtime-defaults.ts`, không qua schema env | Giá trị sai không bị báo lúc khởi động | Đưa vào `env-config.ts` |
| UR8 | Drawer admin không đóng khi bấm link trỏ về trang đang mở. `admin-nav-drawer.tsx` chỉ đóng khi `pathname` đổi | Drawer vẫn mở sau khi bấm link trang hiện tại | Đóng drawer trong `onClick` của link |
| UR9 | Tên site fallback là "Trang chủ" khi settings lỗi (`public-shell.tsx`, `NAV_LABELS.home`) | Brand hiện "Trang chủ" khi API lỗi | Dùng `DEFAULT_SITE_NAME` từ env làm fallback |
| UR-media | Thiếu chú thích `--bp-*` ở `outfit-card.module.css` và `site-header.module.css` | Khó đối chiếu breakpoint với token | Thêm chú thích theo quy ước trong [Quy chuẩn code](./code-standards.md#giao-diện-web) |
| UR-theme | `THEME_COLOR` hard-code trong `app/layout.tsx`. Admin dark mode không đổi `theme-color` | Thanh địa chỉ mobile không khớp theme admin | Cân nhắc khi có thiết kế cho theme-color |
| UR-filter | Thẻ "Thiếu link affiliate" chỉ hiện số, không có bộ lọc riêng trong danh sách | Admin phải tự tìm outfit thiếu link | Quyết định có mở rộng phạm vi bộ lọc |
| Đổi mật khẩu admin | Không có API hay giao diện đổi mật khẩu (quyết định D3, ngoài v1) | Phải xoay vòng tài khoản (xem [triển khai, mục 5](./deployment-guide.md#5-đổi-mật-khẩu-admin)) | Quyết định có làm không. Nếu làm: endpoint đổi mật khẩu và UI |
| Quyền Mongo của API | API dùng tài khoản root của Mongo trong production | Rủi ro bảo mật nếu API bị khai thác | Tạo user có quyền tối thiểu cho database, đổi `MONGODB_URI` |
| Số phiên bản | `package.json` vẫn ghi `0.1.0`, dù tài liệu gọi bản này là v1 | Không ảnh hưởng chạy. Dễ gây nhầm lẫn khi đối chiếu | Quyết định có đổi `version` không |

## Bước tiếp theo

Theo thứ tự ưu tiên đề xuất:

1. **Triển khai thật trên VPS.** Cài Docker, trỏ DNS, chạy `docker compose ... up -d --build`, tạo admin, chạy kiểm tra trong [mục kiểm tra sau triển khai](./deployment-guide.md#kiểm-tra-sau-triển-khai). Đây là bước mở khoá toàn bộ mục "chưa kiểm chứng" ở trên. Trên VPS, kiểm luôn cookie `secure` của `admin-theme` (xem bảng trên).
2. **Chốt commit refactor giao diện.** Chủ repo quyết định commit theo phase (`feat:`, `test:`, `docs:`). Trước khi commit, chạy lại `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm e2e`.
3. **Đo lại trên bản production build.** Lighthouse cho `/`, `/looks`, `/look/[slug]`. Visual và First Load JS. Ghi số vào mục tương ứng.
4. **Lên lịch sao lưu và diễn tập khôi phục.** Cron chạy `bash infra/backup/backup-mongo-and-bucket.sh`. Khôi phục thử trên stack riêng ít nhất một lần.
5. **Nhận nội dung thật.** Ảnh người mẫu sạch và link affiliate từ bên nội dung (Kim). Điền link, publish các outfit, đặt một outfit nổi bật.
6. **Chốt quyết định sản phẩm** cần cho các mục hoãn: đổi mật khẩu trong UI (có làm không), thiết kế mobile dưới 640 px, cách dọn object S3 (L8), môi trường chạy visual (mục visual baseline ở trên).
7. **Bảo mật Mongo.** Tạo user quyền tối thiểu cho API.
8. **Hoàn thiện thông báo lỗi tiếng Việt** (L9), làm mới trạng thái editor khi đặt nổi bật đồng thời, và xử lý nhóm UR (UR3, UR5, UR8, UR9).
9. **Tối ưu ảnh trên mobile** (`next/image`).

## Ngoài phạm vi v1

Đã nêu trong kế hoạch P7 của v1 là "để sau": giá, tìm kiếm, trang danh sách outfit, thống kê lượt bấm (ví dụ endpoint chuyển hướng `/go/:itemId`). Chưa có thiết kế hay plan chi tiết cho các mục này.

Phần giao diện đã làm trong refactor (trang `/looks`, trang Tổng quan admin) không thuộc nhóm này. Riêng bộ lọc "Thiếu link affiliate" và thống kê chi tiết hơn trên Tổng quan vẫn để sau.
