# Lịch sử thay đổi

Ghi lại các thay đổi đáng kể theo phiên bản. Mỗi mục ghi ngày, phạm vi và tác động. Số phiên bản trong `package.json` vẫn là `0.1.0`. Nhãn "v1" là tên của bản phát hành này trong tài liệu.

Liên quan: [Roadmap](./development-roadmap.md) · [Kiến trúc](./system-architecture.md) · [Triển khai](./deployment-guide.md)

## Bộ dữ liệu demo (2026-11-08)

Phạm vi: `packages/shared`, `apps/api`, `seed/demo`, `scripts/demo-images`, `assets-source/demo`, `docs`.

- Thêm `pnpm seed:demo` (`apps/api/src/scripts/seed-demo.ts`, service `seed-demo-service.ts` và `seed-demo-home-layout.ts`): seed settings, 5 bộ sưu tập, 16 outfit đã publish, bố cục trang chủ đủ 11 loại section và 8 người đăng ký bản tin từ một file `seed/demo/demo-seed.json`. Cờ `--reset` xoá nội dung cũ trước khi seed. Script chạy được cả trên production (mount `seed/` và `assets-source/` vào container, xem hướng dẫn triển khai).
- Schema `demoSeedFileSchema` (`packages/shared/src/seed-demo-schema.ts`); section trang chủ tham chiếu bằng slug.
- `uploadSeedImage` trong `seed-service.ts` được export để seed demo dùng chung cách đặt key theo nội dung ảnh.
- Ảnh demo lấy từ Unsplash, xử lý bằng `scripts/demo-images/prepare-demo-images.py`; anchor món đồ dò bằng `scripts/demo-images/detect-item-anchors.py`.
- Ghi nhận khi seed: Gallery nguồn `latest` bị loại khỏi trang khi mọi outfit đã hiện ở OutfitList hoặc FeaturedLookbook cùng trang (đúng thiết kế), nên bố cục demo dùng Gallery nguồn `collection`.
- Chi tiết: [Triển khai, mục Dữ liệu demo](./deployment-guide.md#dữ-liệu-demo).
- Trang `/admin/login`: panel trái có ảnh bìa đen trắng (`apps/web/public/admin/login-cover.jpg`, từ Unsplash) dưới lớp phủ tối; chữ và wordmark giữ nguyên vị trí.
- Trang chủ: bỏ nút tạm dừng của banner trượt và của dải chữ chạy (chủ repo chốt 2026-11-08, "mặc định luôn play"). Banner vẫn dừng khi rê chuột hoặc focus bên trong, dải chữ dừng khi rê chuột, cả hai tắt dưới reduced motion. Chỉ báo slide đổi từ chấm sang vạch ngang trắng đặt thẳng trên ảnh (token `--client-slider-mark-*`), bỏ bộ đếm và nền đen; mũi tên trước/sau thành nút tròn kính mờ (`--client-slider-arrow-size`). Test đơn vị và e2e cập nhật theo.

## Editorial monochrome, section trang chủ mới và bản tin (2026-11-08)

Phạm vi: `packages/shared`, `apps/api`, `apps/web`, `e2e`, `docs`. Kế hoạch: `plans/261108-0923-editorial-luxury-redesign-and-new-sections/` (6 phase). Thay đổi chưa commit tại thời điểm viết mục này.

### Tính năng

| Phase | Nội dung |
|-------|----------|
| P1 | Token editorial monochrome: nền `#FAF8F5`, chữ `#111111`, bo góc 2px, không shadow. Font Playfair Display cho tiêu đề (`--font-display`, subset vietnamese). Nút public dùng chung `public-button.module.css` |
| P2 | API: section `CampaignBanner`, `Marquee`, `Gallery` (nguồn `latest`, `collection`, `manual`), `NewsletterSignup`. Settings `newsletterConsent` và `newsletterConsentVersion`. Route `POST /api/public/newsletter`, `GET /api/admin/newsletter`, xuất CSV, huỷ đăng ký, xoá cứng |
| P3 | Re-skin shell và trang public: header, footer, `/`, `/looks`, `/look/[slug]`, `/collections`, 404. Lookbook đổi font, giữ layout đo sẵn |
| P4 | Renderer cho 4 section mới, restyle 7 section cũ. Hero có lớp phủ đủ tương phản trên ảnh sáng. Form bản tin: Server Action, PRG, gửi được khi tắt JS |
| P5 | Re-skin admin. Trang `/admin/newsletter`. Mục đồng ý bản tin trong Cài đặt |
| P6 | E2E cho luồng mới, sửa spec cũ theo bố cục mới, tài liệu |

- Bố cục trang chủ mặc định đổi thành năm section: `FeaturedLookbook`, `CollectionTiles`, `OutfitList`, `Gallery`, `NewsletterSignup`. Bố cục đã đăng không đổi.
- Form bản tin chỉ hiện khi admin đã lưu câu đồng ý. Đăng ký single opt-in, ô đồng ý không tick sẵn, bản ghi lưu câu đồng ý đã tick (không lưu IP).
- Admin xuất CSV (có BOM, chặn công thức), huỷ đăng ký là thao tác mặc định, xoá cứng cần xác nhận.
- Chi tiết kỹ thuật: [Kiến trúc, mục Bản tin](./system-architecture.md#bản-tin-newsletter) và [Quy chuẩn, mục Editorial](./code-standards.md#editorial-chữ-nhãn-nút).

### Sửa lỗi và điều chỉnh sau review

- Trang `/` phát ra năm `<link rel="preload" as="image">`, plan chỉ cho một. Card chỉ eager khi là ô đầu của grid LCP. Lookbook dùng prop `preload` của `next/image`. Kiểm bằng curl ngày 2026-11-08: còn một preload.
- Gallery nguồn `latest` không còn lặp outfit đang hiện ở `FeaturedLookbook` (cùng trang).
- Thông báo kết quả form nhận focus để trình đọc màn hình đọc được. Ô email có `aria-describedby` khi sai.
- Khách gửi form khi câu đồng ý vừa đổi (409) thấy thông báo riêng (`stale`) và cache trang chủ được làm mới.
- Section có tiêu đề trong panel (`CampaignBanner`, `NewsletterSignup`) đặt tên vùng qua `labelledBy`.
- Hằng trùng (giới hạn email, độ dài mã section) gom về `packages/shared`.
- Menu public: `.nav` của header không còn `overflow-x: auto` nên link không bị cắt ở 320px. Lỗi này được tester ghi nhận trước khi sửa. Sau sửa, e2e public 61/61 xanh.
- Admin: tiêu đề và logo đăng nhập dùng `--font-weight-display`. Nút xoá người đăng ký dùng `btnDanger`, đổi chữ khi đang xử lý, ô lọc là "Tìm".

### Kiểm chứng

| Hạng mục | Kết quả | Nguồn |
|----------|---------|-------|
| Unit: `packages/shared` / `apps/api` / `apps/web` | 164 / 223 / 664, xanh | `fullstack-developer-261108-review-fixes.md`. Không chạy lại trong lượt viết tài liệu |
| E2E spec mới: newsletter-signup, newsletter-admin, editorial-sections-render | 6 + 8 + 9 = 23 test, xanh | `tester-261108-editorial-redesign-e2e.md` |
| E2E spec cũ | Sửa theo Q3 (bố cục mặc định) và dữ liệu. Chi tiết trong báo cáo tester | Như trên |
| E2E toàn bộ (`pnpm e2e`, không `--no-deps`) | 111/111 xanh: public 61, admin-shell, visual 4/4, chuỗi content gồm 3 spec mới | `tester-261108-editorial-redesign-e2e.md`, `fullstack-developer-261108-e2e-closeout.md` |
| Visual lookbook | 4/4 xanh sau khi chụp lại baseline một lần, sau khi chủ repo duyệt ảnh. Báo cáo tester ghi cặp dramatic 390 lệch layout (cột ngắn hơn 16 px); chưa có báo cáo xác nhận đã sửa, cần rà lại | `visuals/` trong thư mục plan |
| Đo trên stack compose prod (2026-11-08) | LCP `/` 328-368 ms, CLS 0, 1 ảnh preload, bundle `/` 199,8 KiB (baseline 199,1), Playfair vietnamese preload, smoke chuỗi IP PASS | `tester-261108-editorial-redesign-e2e.md`, mục Prod verification |
| Chưa chạy | axe trên 6 trang × 2 theme (chưa có `@axe-core/playwright`, plan không thêm dependency); đo pixel nền hero (chưa publish HeroSlider, tính theo công thức 5,10:1) | Ghi trong Roadmap |

Báo cáo kiểm tra UI ghi 20/26 mục đạt lúc chạy. Một số mục đã sửa sau đó (CTA `btnDanger`, nhãn "Tìm", tiêu đề admin, `labelledBy` của banner). Mục còn mở ghi ở [Roadmap](./development-roadmap.md#đợt-editorial-và-bản-tin).

### Lưu ý khi nâng cấp

- Không có migration DB. Trường mới trong Settings đều optional. Collection `newsletter_subscribers` được tạo khi có đăng ký đầu tiên.
- Trang chủ không hiện form bản tin cho đến khi admin lưu câu đồng ý trong Cài đặt. Câu mặc định trong code chỉ là gợi ý, chưa lưu thì không hiện.
- Biến môi trường mới: `NEWSLETTER_RATE_LIMIT_WINDOW_MINUTES` (mặc định 15) và `NEWSLETTER_RATE_LIMIT_MAX_PER_IP` (mặc định 10). Có trong `.env.example`, `apps/api/.env.example` và compose. Hướng dẫn proxy và staging: [Triển khai](./deployment-guide.md).
- Bộ đếm limiter nằm trong RAM của API. Khởi động lại API thì bộ đếm reset.
- Form bản tin bật/tắt bằng công tắc trong Cài đặt. Lưu khi công tắc tắt thì xoá câu đồng ý. `newsletterConsentVersion` vẫn giữ và tăng đơn điệu khi bật lại.

### Đã biết (chưa xử lý)

- Q4: câu đồng ý và link chính sách bảo mật chưa chốt. Site chưa có trang chính sách. Cần chủ repo duyệt chữ và nên có luật sư xem trước khi go-live.
- Chưa có double opt-in và link huỷ tự phục vụ. Hệ thống hiện chỉ lưu danh sách, chưa gửi email.
- Smoke chuỗi IP (Caddy, hai nguồn, XFF) chưa chạy. Chưa nên mở form bản tin ra production trước khi chạy.

## Trang chủ section, bộ sưu tập và editor (2026-11-07)

Phạm vi: `apps/api`, `apps/web`, `packages/shared`, `e2e`, `docs`. Kế hoạch: `plans/261107-1341-homepage-sections-and-collections/` (7 phase). Thay đổi chưa commit tại thời điểm viết mục này.

### Tính năng

| Phase | Nội dung |
|-------|----------|
| P1 | Hợp đồng dùng chung: bộ sưu tập, bố cục trang chủ (7 loại section), revalidate có `tags`, settings mới. Checklist UI và số đo bundle "trước" |
| P2 | API bộ sưu tập (`/api/admin/collections`, `/api/public/collections`), bố cục (`/api/admin/home/*`, `/api/public/home`), đăng giữ một bản trước, hoàn tác (`restore-previous`), reset |
| P3 | Admin bộ sưu tập (danh sách, form, ảnh bìa, gán outfit, Lên/Xuống, xoá có usage). Trang `/collections` và `/collections/[slug]` |
| P4 | Renderer section và trang chủ public: slider có nút tạm dừng, tab băng chuyền bằng radio (không cần JS), FAQ `<details>` với JSON-LD `FAQPage`, lookbook dùng `h2` và trang chủ có một `h1` |
| P5 | Dải thông báo toàn site (mặc định tắt), link Bộ sưu tập trên header và footer tự ẩn khi chưa có bộ sưu tập đã đăng, footer cấu hình được trong Cài đặt |
| P6 | Trình soạn trang chủ `/admin/home` và xem trước `/admin/home-preview`. Kéo thả (bàn phím và chuột), nút Lên/Xuống, tab Chỉnh sửa ⇄ Xem trước dưới 1024px, toast "Hoàn tác" khi đăng |
| P7 | E2E: project `content` (setup, 5 spec, teardown; chạy nối tiếp). Số đo lại bundle, tài liệu |

### Kiểm chứng

- Unit: `packages/shared` 126, `apps/api` 183, `apps/web` 572 test; e2e 88/88. Chi tiết ở [Roadmap, số liệu và ngân sách](./development-roadmap.md#số-liệu-và-ngân-sách).
- E2E: 88 test (65 project cũ, 23 project `content` gồm `content-setup` và `content-cleanup`).
- Visual: 4/4 xanh, không cập nhật snapshot.
- First Load JS (encoded, KiB): `/` 196,0 → 199,1 (ngân sách +15 KB, đạt); `/looks` 194,0 → 194,0.
- Lighthouse CLI chưa chạy; accessibility kiểm bằng axe-core (xem roadmap).

### Sửa lỗi và điều chỉnh

- Trang sửa bộ sưu tập crash do truyền hàm từ Server Component sang Client Component. Đã sửa: panel tự dựng link phân trang từ `collectionOutfitsPageHref`.
- Client bundle: module `'use client'` import giá trị từ barrel `@under30ss/shared` kéo theo zod và toàn bộ schema, làm tăng bundle public. Đã chuyển sang import kiểu type hoặc module client-safe (`apps/web/src/components/public/home-path.ts`). Quy tắc: [Code standards](./code-standards.md#client-component-và-barrel-shared).
- Publish bản nháp trùng bản đang đăng là no-op (200, giữ `previous`, không revalidate). Trước đây có thể ghi đè `previous` bằng bản giống hệt.
- Thêm outfit vào bộ sưu tập: giới hạn 24 bộ sưu tập mỗi outfit (400 `VALIDATION_ERROR`). Bộ sưu tập bị xoá giữa chừng thì gỡ các id vừa thêm (race cleanup).
- Link mạng xã hội mở cùng tab (`PublicSmartLink` `newTab`, chỉ cho URL ngoài).

## Refactor giao diện client và admin (2026-11-07)

Phạm vi: `apps/web`, `apps/api`, `packages/shared`, `e2e`. Kế hoạch: `plans/261107-0913-professional-ui-refactor-client-admin/` (7 phase). Thay đổi chưa commit tại thời điểm viết mục này.

### Tính năng

| Phase | Nội dung |
|-------|----------|
| P1 | Token chia 3 file (`design-tokens.css`, `client-theme-tokens.css`, `admin-theme-tokens.css`). Primitive chuyển động CSS. Baseline visual lookbook (`[data-lookbook]`) |
| P2 | API `GET /api/public/outfits?page&size` và `GET /api/admin/stats`. Settings thêm `looksPageSize`, `relatedOutfitsCount`. Index `{ status, updatedAt, _id }`. Revalidate thêm `/looks` và tag `public-settings`. Bốn biến env mới |
| P3 | Shell public: header ẩn khi cuộn xuống, hiện khi cuộn lên, footer có link. Trang `/looks` phân trang phía server. Breadcrumb, mục "Outfit khác", 404 public |
| P4 | Lookbook: connector vẽ một lần khi có `data-ready`, không vẽ lại khi đổi kích thước. Route fade. Hover giữ hiệu ứng phóng ảnh và làm mờ món khác |
| P5 | Shell admin: sidebar, rail thu gọn, drawer trên mobile. Dark mode ba trạng thái (`admin-theme`). Trang Tổng quan `/admin`. URL cũ `/admin?q|status|page` chuyển 307 sang `/admin/outfits`. Toast, trang đăng nhập làm lại, skeleton |
| P6 | Danh sách outfit tại `/admin/outfits` (dạng card dưới 768px). Editor, settings (hai trường số trang mới), users theo breakpoint |
| P7 | Playwright: thêm project `admin-shell`, spec responsive và spec theme/drawer. Cập nhật các spec cũ theo route mới |

Dependency mới trong `apps/web`: `lucide-react@1.70.0`, `motion@14.10.1`.

### Sửa lỗi và điều chỉnh

| Mục | Thay đổi |
|-----|----------|
| Tương phản admin | `--admin-border-strong` (sáng) từ `#a8a29e` (2.52:1 trên nền trắng, không đạt) lên `#8a827c` (3.77:1, đạt ngưỡng 3:1 cho thành phần UI). Xem `design-palette-and-contrast.md` |
| Chiều cao điều khiển admin | `--admin-control-height` từ 40px lên 44px, đạt vùng chạm tối thiểu |
| Toast | Chỉ báo thành công. Lỗi hiện inline, không lặp trên hai kênh `role="alert"` (review 2026-11-07) |
| Drawer | Dùng `<dialog>` với `showModal()` qua `useModalDialog`, trả focus khi đóng, đóng khi đổi route |
| Lookbook | Ảnh lỗi được coi là sẵn sàng, connector không bị ẩn vĩnh viễn. `ready` không quay lại `false` |
| Backdrop admin | `::backdrop` dùng token `--admin-backdrop` thay màu thô |
| SEO `/looks` | Có mô tả dự phòng khi `seoDescription` trống (`build-looks-metadata.ts`) |
| Cache settings | Lưu settings gọi `revalidateTag('public-settings')` ngoài `revalidatePath` |
| API list | `page` có trần `MAX_LIST_PAGE` (100000) để `skip` không tràn. Thêm index compound cho truy vấn public |
| Breadcrumb | `aria-label` tiếng Việt ("Đường dẫn trang") |
| E2E teardown | File trạng thái outfit test chỉ bị xoá sau khi xoá outfit thành công. Lần chạy sau thử lại thay vì mất dấu |

### Khác với kế hoạch ban đầu

- Không có `loading.tsx` ở `(protected)/`. Tổng quan dùng `Suspense` trong `page.tsx`, vì loading boundary làm redirect thành 200 kèm meta refresh.
- Dark mode admin dùng khối `[data-theme]`, không dùng `light-dark()`. Next (lightningcss) hạ cấp hàm này.
- Connector dùng thuộc tính `data-ready` (không phải `data-drawn`).
- Bỏ hiệu ứng nhích lên khi hover món trong lookbook, vì làm lệch đường chỉ khỏi ảnh.
- Header public không có nút menu. Hai link hiện thẳng ở mọi màn hình.
- Thẻ "Thiếu link affiliate" chỉ hiện số, chưa có bộ lọc riêng.

### Kiểm thử

| Hạng mục | Kết quả |
|----------|---------|
| Unit shared | 37 pass (trước: 32) |
| Unit api | 102 pass (trước: 83). Lần chạy đầu có một lần worker crash ở `auth-cookie-flags.test.ts`, lần chạy lại 102/102 |
| Unit web | 265 pass (trước: 166) |
| E2E | 65 passed (trước: 17), gồm visual 4 với baseline P1 |
| Lighthouse SEO (dev mode) | `/`, `/looks`, `/look/dramatic`: 100 mobile và desktop |

### Lưu ý khi nâng cấp

- API tự tạo index `{ status, updatedAt, _id }` khi khởi động. Không cần thao tác tay.
- Bốn env mới đã có trong `.env.example`, `apps/api/.env.example` và `infra/docker-compose.yml`: `PUBLIC_LOOKS_PAGE_SIZE`, `PUBLIC_RELATED_OUTFITS_COUNT`, `PUBLIC_PAGE_SIZE_MAX`, `ADMIN_STATS_RECENT_COUNT`.
- Cookie mới `admin-theme` và `admin-sidebar` không yêu cầu đăng nhập lại.
- URL `/admin?q|status|page` cũ được chuyển sang `/admin/outfits`. Bookmark cũ vẫn dùng được.

## v1 (2026-11-07)

Bản đầu tiên của Under30ss Shop the look: lookbook dựng từ dữ liệu, admin quản lý outfit và ảnh, triển khai bằng Docker Compose với Caddy. Hoàn thành qua 7 phase (P1 đến P7), kế hoạch tại `plans/261106-1201-under30ss-shop-the-look/`.

### Tính năng

| Phase | Nội dung | Ngày hoàn thành |
|-------|----------|-----------------|
| P1 | Nền tảng monorepo (pnpm workspace), `packages/shared` (schema Zod, DTO, hằng API), Dockerfile api và web, Compose dev, Caddy, RustFS | 2026-11-06 |
| P2 | Backend Express 5: API public và admin, session, rate limit đăng nhập, upload ảnh (sharp → WebP), revalidate, seed | 2026-11-06 |
| P3 | Ảnh mẫu và seed: script xử lý ảnh trong `scripts/assets/`, `seed/sample-outfits.json`, `--image-root` | 2026-11-06 |
| P4 | Lookbook UI: người mẫu ở giữa, món hai bên, connector bằng SVG, hotspot, hover hai chiều | 2026-11-06 |
| P5 | Trang public và SEO: `/`, `/look/[slug]`, sitemap, robots, metadata, JSON-LD, revalidate theo sự kiện | 2026-11-06 |
| P6 | Admin UI `/admin`: đăng nhập, danh sách outfit phân trang phía server, editor (upload, đặt điểm neo, xem trước, lưu), settings, quản lý admin | 2026-11-06 |
| P7 | Tích hợp: compose prod, sao lưu, Playwright e2e, ảnh so sánh, Lighthouse, tài liệu | 2026-11-06 đến 2026-11-07 |

### Bảo mật

- Ba limiter đăng nhập (theo IP, theo IP + email, theo email từ mọi IP) và cookie thiết bị `u30.dev` ký HMAC. Chi tiết trong [Kiến trúc, mục xác thực](./system-architecture.md#xác-thực-và-giới-hạn-đăng-nhập).
- Hàng đợi argon2 có giới hạn đồng thời và độ dài hàng đợi. Quá tải trả 503.
- Kiểm `Origin` cho method ghi, chỉ nhận JSON (trừ multipart upload), `helmet`.
- Caddy chặn method ghi tới `/media`, trả 413 dạng JSON khi body quá giới hạn, không chuyển `/api/health` ra ngoài.
- Production: Mongo bật auth, không publish cổng Mongo và RustFS, cookie `secure`, HTTPS qua Caddy.
- Mật khẩu admin không nhận qua tham số dòng lệnh.

### Sửa lỗi và điều chỉnh sau review (P7, 2026-11-06)

Nguồn: báo cáo `code-reviewer-261106-1741-p7-rereview.md` và `fullstack-developer-261106-1743-p7-rereview-fixes.md`.

| Mã | Thay đổi |
|----|----------|
| M1 | Thêm cookie thiết bị `u30.dev`. Thiết bị đã đăng nhập thành công bỏ qua limiter theo email. Cảnh báo log khi limiter này chạm trần. Giảm nguy cơ một kẻ tấn công từ vài IP khoá admin |
| M2 | Build index partial unique của `featured` khi khởi động. Lỗi thì API không khởi động. Truy vấn featured có sắp xếp theo `updatedAt` |
| L1 | `/media` bỏ query string (rewrite `{path}` kèm `?`). Thêm `X-Content-Type-Options: nosniff` |
| L2 | Email rỗng hoặc sai kiểu không còn dùng chung một bucket toàn cục ở limiter theo email |
| L3 | Phản hồi 429 và 5xx không tính là lần đăng nhập sai |
| L4 | Cùng một thông điệp "vượt dung lượng" ở Caddy và API (`FILE_TOO_LARGE_MESSAGE`) |
| L5 | Warm-up hash giả khi khởi động, để lần đầu đăng nhập email lạ không chậm hơn |
| L6 | Guard đường dẫn ảnh seed dùng `realpath`. Tên file bắt đầu bằng `..` không còn bị chặn nhầm |
| L7 | Phản hồi 405 ở `/media` có header `Allow: GET, HEAD` |
| L9 | Thêm test chuẩn hoá email (hoa, thường, khoảng trắng dùng chung bucket) |
| Caddy | Ghim image `caddy:2.11.9` (trước là `caddy:2`) |
| Test | Tách ba file test vượt 200 dòng. Không mất test nào |
| Lint | Xoá import và biến thừa trong test. `pnpm lint` 0 cảnh báo |

Đã sửa thêm trong P7:
- `infra/docker-compose.prod.yml`, `infra/.env.prod.example`: override production, Mongo auth, không publish cổng Mongo và RustFS, Caddy trên 80 và 443.
- `infra/backup/backup-mongo-and-bucket.sh`: sao lưu Mongo và bucket, có khôi phục bằng lệnh trong header script.
- `e2e/`, `playwright.config.ts`: Playwright cho luồng admin, public, viewport, chế độ không JS, ảnh so sánh.

### Lookbook khớp ảnh mẫu (P7, 2026-11-06)

Nguồn: `fullstack-developer-261106-1800-lookbook-match-reference.md`.

- Connector chuyển từ quadratic sang cubic Bézier. Đường rời thẻ theo phương ngang, cong xuống hoặc lên theo vị trí điểm neo. Đầu mũi tên nằm đúng điểm neo.
- Hotspot trong suốt khi nghỉ. Khi món được chọn hiện vòng tròn nhỏ. Thêm halo sáng quanh SVG.
- Subtitle chữ nghiêng (italic).
- Tỉ lệ cột 31/44/25 (trước 29/42/29). Cỡ tiêu đề `clamp(11px, 1.9vw, 18px)`. `--lookbook-curve-ratio` 0.45 (trước 0.35). Các giá trị này nằm trong `apps/web/src/styles/design-tokens.css`.
- Dưới 640 px: ẩn thread, hiện pin cố định trên hotspot. Mô tả ẩn (có chủ đích).

### Kiểm chứng ở thời điểm phát hành

| Hạng mục | Kết quả |
|----------|---------|
| Unit test shared | 32 pass |
| Unit test api | 83 pass |
| Unit test web | 166 pass |
| E2E Playwright | 17/17 pass (chạy 2026-11-07) |
| Lighthouse SEO và accessibility | 100 (đo 2026-11-06), desktop và mobile, `/` và `/look/dramatic` |
| Caddy | `/api/health` từ ngoài trả 404. 413 trả JSON `PAYLOAD_TOO_LARGE`. `/media` chỉ GET và HEAD |

### Lưu ý khi nâng cấp lên v1

- Sau khi lên bản có cookie thiết bị, mỗi admin đăng nhập lại một lần để nhận cookie `u30.dev`.
- Biến mới `LOGIN_DEVICE_COOKIE_MAX_AGE_DAYS` (mặc định 90). Đã có trong `.env.example`, `apps/api/.env.example`, service `api` của compose.
- Compose prod yêu cầu biến `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `SITE_ADDRESS` (xem [Triển khai](./deployment-guide.md#2-tạo-envprod)).
- Volume Mongo đã có từ stack dev (không auth) không tự chuyển sang auth. Xem xử lý trong [Triển khai, xử lý sự cố](./deployment-guide.md#xử-lý-sự-cố).
- Dữ liệu seed mẫu ở trạng thái `draft` (link affiliate để trống). Cần điền link và anchor rồi publish.

### Đã biết (chưa xử lý trong v1)

Chi tiết và điều kiện mở nằm trong [Roadmap, mục việc hoãn](./development-roadmap.md#việc-hoãn-sang-sau-v1).

- Object S3 không được xoá khi xoá outfit hoặc thay ảnh (L8).
- Thông báo lỗi theo trường từ server còn một phần bằng tiếng Anh (L9, một phần).
- Hai admin đặt nổi bật đồng thời: editor bên thua hiển thị trạng thái cũ tới khi tải lại.
- Chưa test HTTPS thật và domain thật (chưa có VPS).
- Ảnh người mẫu hiện là ảnh cắt tạm. Ảnh sạch và link affiliate thật do bên nội dung (Kim) cung cấp.
