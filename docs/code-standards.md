# Quy chuẩn code Under30ss

Tài liệu này mô tả cấu trúc monorepo và quy ước đang áp dụng trong code. Mọi mục đều đối chiếu với file thật trong repo. Khi quy ước đổi, cập nhật cùng commit.

Liên quan: [Kiến trúc hệ thống](./system-architecture.md) · [Triển khai](./deployment-guide.md)

## Contents
- [Cấu trúc monorepo](#cấu-trúc-monorepo)
- [Đặt tên file](#đặt-tên-file)
- [Kích thước file](#kích-thước-file)
- [Phân lớp và cách tổ chức code](#phân-lớp-và-cách-tổ-chức-code)
- [Giao diện (web)](#giao-diện-web)
- [Hợp đồng dùng chung](#hợp-đồng-dùng-chung-packagesshared)
- [Cấu hình, không fix cứng giá trị nghiệp vụ](#cấu-hình-không-fix-cứng-giá-trị-nghiệp-vụ)
- [Danh sách lọc, tìm kiếm, phân trang](#danh-sách-lọc-tìm-kiếm-phân-trang)
- [Comment](#comment)
- [Commit và nhánh](#commit-và-nhánh)
- [Line ending và file nhị phân](#line-ending-và-file-nhị-phân)
- [Kiểm tra trước khi commit](#kiểm-tra-trước-khi-commit)
- [Kiểm thử](#kiểm-thử)
- [Bảo mật trong code](#bảo-mật-trong-code)

## Cấu trúc monorepo

pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). Các lệnh ở gốc chạy trên mọi workspace.

```
.
├── apps/
│   ├── api/                  # @under30ss/api: Express 5, Mongoose, sharp, S3
│   │   ├── src/
│   │   │   ├── config/       # env-config.ts: schema env (Zod)
│   │   │   ├── db/           # kết nối Mongo, build index
│   │   │   ├── lib/          # tiện ích dùng chung của API (semaphore, device cookie, runtime-defaults, ...)
│   │   │   ├── middleware/   # session, origin, JSON-only, rate limit, lỗi
│   │   │   ├── models/       # schema Mongoose: outfit, admin-user, settings
│   │   │   ├── routes/       # khai báo route, gọi service (public, admin stats, ...)
│   │   │   ├── scripts/      # create-admin, seed-samples, seed-demo (chạy bằng tsx hoặc node dist/)
│   │   │   ├── services/     # nghiệp vụ: outfit, public list, admin stats, media, settings, revalidate, ...
│   │   │   ├── storage/      # client S3
│   │   │   ├── create-app.ts # ghép middleware và route (createApp)
│   │   │   └── server.ts     # điểm vào: nạp env, kết nối Mongo, listen
│   │   ├── test/             # test tích hợp (supertest + mongodb-memory-server)
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── web/                  # @under30ss/web: Next.js 16 (App Router)
│       ├── src/
│       │   ├── app/          # route group (public)/ (/, /looks, /look/[slug]); admin/ (admin/(protected)/ là khu quản trị); api/revalidate; robots, sitemap
│       │   ├── components/   # admin/ (shell/, overview/, ...), feed/ (feed outfit), lookbook/, public/, motion/, ui/
│       │   ├── hooks/        # use-modal-dialog.ts, hook của editor admin (hooks/admin/)
│       │   ├── lib/          # client API (browser/server), SEO, feed/ (Server Action tải thêm), web-env, media-url, admin-paths.ts
│       │   └── styles/       # design-tokens.css, client-theme-tokens.css, admin-theme-tokens.css, motion-primitives.module.css
│       ├── test/             # vitest + jsdom + Testing Library
│       ├── Dockerfile
│       └── .env.example
├── packages/
│   └── shared/              # @under30ss/shared: schema Zod, kiểu, hằng API, fixtures
├── infra/
│   ├── caddy/Caddyfile
│   ├── rustfs-init/          # script tạo bucket và policy
│   ├── backup/               # sao lưu Mongo + bucket
│   ├── docker-compose.yml    # stack dev
│   ├── docker-compose.prod.yml
│   └── .env.prod.example
├── e2e/                      # Playwright (spec, teardown, support/)
├── seed/sample-outfits.json  # dữ liệu mẫu
├── seed/demo/demo-seed.json  # bộ dữ liệu demo đầy đủ (settings, bộ sưu tập, outfit, trang chủ, bản tin)
├── scripts/assets/           # script Python/TS xử lý ảnh mẫu và validate seed
├── scripts/demo-images/      # tải và xử lý ảnh demo, dò anchor bằng Gemini
├── assets-source/            # ảnh nguồn đã cắt; demo/ là ảnh demo (raw/ bị gitignore)
├── plans/                    # kế hoạch và báo cáo phase
├── docs/                     # tài liệu này
├── .env.example              # env cho docker compose (copy thành .env)
├── playwright.config.ts
├── eslint.config.mjs
└── tsconfig.base.json
```

Thư mục `.claude/`, `.agent/`, `.agents/`, `.cursor/`, `.opencode/` là công cụ AI cục bộ, không thuộc ứng dụng (gitignore).

## Đặt tên file

- Tên file dùng **kebab-case** và mô tả đúng nội dung. Ví dụ `login-rate-limit-middleware.ts`, `device-cookie.ts`, `outfit-editor-toolbar.tsx`, `compute-connector-paths.ts`.
- Test: `*.test.ts` hoặc `*.test.tsx`, đặt trong `src/` (cạnh code) hoặc trong `test/` của workspace.
- Playwright: `*.spec.ts` cho test, `*.teardown.ts` cho dọn dẹp (`e2e/`). Tiền tố tên spec quyết định project: `admin-outfit-flow*` (project `admin-flow`), `public-*` (project `public`), `admin-shell-*` (project `admin-shell`), `visual-*` (project `visual`). Xem `playwright.config.ts`.
- Ngoại lệ bắt buộc của Next.js: tên file/thư mục quy ước của App Router (`page.tsx`, `layout.tsx`, `template.tsx`, `route.ts`, `robots.ts`, `sitemap.ts`, `not-found.tsx`, `loading.tsx`), thư mục động `[slug]`, nhóm `(public)` và `(protected)`.
- Module CSS: `*.module.css`. Token CSS dùng chung: `design-tokens.css` (kích thước, motion, breakpoint), `client-theme-tokens.css` (màu public), `admin-theme-tokens.css` (màu admin).
- Script: kebab-case (`clean-model-lines.py`, `backup-mongo-and-bucket.sh`).
- Tên hàm và biến: camelCase. Kiểu và schema: PascalCase. Hằng: UPPER_SNAKE_CASE (`PUBLIC_KEY_PREFIX`, `ERROR_CODES`).
- Mã lỗi API và giá trị enum: UPPER_SNAKE_CASE (`PAYLOAD_TOO_LARGE`) hoặc chữ thường theo schema (`draft`, `published`, `light`, `dark`, `system`).
- Tên biến môi trường: UPPER_SNAKE_CASE. Tiền tố theo nhóm: `LOGIN_RATE_LIMIT_*`, `S3_*`, `ADMIN_*`, `PUBLIC_*`, `ARGON2_*`.

## Kích thước file

- Mỗi file code dưới **200 dòng**. Vượt ngưỡng thì tách module (hàm tiện ích sang file riêng, nghiệp vụ sang service, component con).
- Ưu tiên composition hơn kế thừa cho component.
- Hiện trạng đo ngày 2026-11-07 bằng `wc -l`:
  - Lớn nhất trong `apps/web/src`, `apps/api/src`, `packages/shared/src`, `e2e`: `apps/web/src/components/lookbook/lookbook.module.css` (199 dòng), `apps/web/src/components/admin/shell/admin-sidebar.module.css` (190 dòng), `apps/web/src/components/lookbook/lookbook-interactions.tsx` (173 dòng).
  - File test lớn nhất: `apps/web/test/admin/outfit-editor-actions.test.tsx` (199 dòng), `apps/api/test/outfits-admin-crud.test.ts` (184 dòng).
- Lịch sử: các file test vượt 200 dòng đã được tách trong P7 của v1 (xem [Lịch sử thay đổi](./project-changelog.md)).

## Phân lớp và cách tổ chức code

### API (`apps/api`)

Luồng xử lý một request: `middleware` → `routes` → `services` → `models`.

- **Route** chỉ parse input (qua `validateBody` hoặc schema query), gọi service, rồi trả JSON. Route không gọi Mongoose trực tiếp.
- **Service** chứa nghiệp vụ và là nơi duy nhất truy cập model. Ví dụ `outfit-service.ts`, `public-outfit-service.ts`, `admin-stats-service.ts`, `settings-service.ts`, `admin-user-service.ts`.
- **Phụ thuộc bên ngoài được tiêm qua `AppContext`** (`lib/app-context.ts`): `env`, `storage` (interface `ObjectStorage`), `revalidate`. Test thay thế các phụ thuộc này thay vì mock module.
- **Lỗi nghiệp vụ** ném `AppError` (kèm mã và HTTP status) hoặc các helper `badRequest`, `notFound`, `conflict`, `unauthorized`. `error-handler-middleware.ts` đổi thành JSON chuẩn.
- Điểm vào `server.ts` làm các việc khởi động (nạp env, kết nối Mongo, build index, warm-up hash). Lỗi ở bước nào thì thoát tiến trình với mã khác 0.

### Web (`apps/web`)

- Trang public là Server Component. Dữ liệu lấy qua `lib/seo/public-data-loaders.ts` (đã bọc `cache`, gắn tag khi cần) và `lib/api-client-server.ts`.
- Admin gọi API qua `lib/api-client-browser.ts` (đường dẫn tương đối, cùng origin). Lỗi API đi qua `api-client-error.ts`. Trang admin đọc dữ liệu phía server qua `app/admin/_lib/admin-api.ts`.
- Biến môi trường web đọc qua `lib/web-env.ts`, parse lười. Không đọc `process.env` rải rác.
- Không dùng `next/image` tối ưu hoá (`unoptimized: true`, xem `apps/web/next.config.ts`). Lý do ghi trong file config.
- URL admin lấy từ `ADMIN_PATHS` (`apps/web/src/lib/admin-paths.ts`). Không gõ chuỗi `/admin/...` trong component.
- Cookie chỉ ghi qua Server Action (`app/admin/_lib/admin-preference-actions.ts`). Action nhận `FormData`, kiểm bằng zod enum, giá trị lạ bị bỏ qua.

### Lookbook

Component lookbook nằm trong `components/lookbook/`. Đường cong connector tính trong `compute-connector-paths.ts` (cubic Bézier). Prop `fill` của `LookbookLayout` đưa lookbook vào khung cao cố định của feed; phần đó chỉ dùng CSS (`lookbook-fill.module.css`), không đo bằng JS. Khung phải là size container (`container-type: size`), vì `cqh` và `cqw` tính theo khung đó. Các giá trị hiển thị (kích thước, tỉ lệ cột, độ cong, thời lượng animation) nằm trong token ở `styles/design-tokens.css`, không hard-code trong component.

## Giao diện (web)

Phần này áp dụng cho mọi thay đổi CSS và component giao diện. Nguồn: refactor giao diện 2026-11-07.

### Token màu và kích thước

| File | Phạm vi | Ghi chú |
|------|---------|---------|
| `styles/design-tokens.css` | Dùng chung | Thang chữ, khoảng cách, bán kính, motion (`--duration-*`, `--easing-*`, `--stagger-step`, `--motion-distance`, `--toast-duration`), breakpoint `--bp-md` (768), `--bp-lg` (1024), `--bp-xl` (1440), chiều cao điều khiển admin `--admin-control-height` (44px). Font: `--font-sans` (Be Vietnam Pro), `--font-display` (Playfair Display), `--font-weight-display` (400), `--letter-spacing-label` (0.14em) |
| `styles/client-theme-tokens.css` | Public | `--client-*`, khai báo trên `:root`. Không có khối dark. Phong cách editorial monochrome: nền `--client-bg` #FAF8F5, chữ `--client-ink` #111111, chữ phụ `--client-ink-muted` #5C5752, bo góc 2px, `--client-shadow-soft: none` |
| `styles/admin-theme-tokens.css` | Admin | `--admin-*`. Sáng ở `:root`, tối ở khối `[data-theme='dark']` và `[data-theme='system']` (kèm `@media (prefers-color-scheme: dark)`) |

Quy tắc:

- **Dark mode admin dùng khối `[data-theme]`, không dùng `light-dark()`.** Next (lightningcss) hạ cấp `light-dark()` thành biến toggle resolve ở `:root`, nên descendant `[data-theme='dark']` không đổi màu. Lý do ghi trong đầu `admin-theme-tokens.css`.
- **Hai khối dark phải giống hệt nhau.** Khối `[data-theme='dark']` và khối `[data-theme='system']` trong media query phải có cùng giá trị. Sửa một khối thì sửa cả hai.
- Màu trong component dùng token, không hard-code hex. Ngoại lệ đã ghi nhận: `THEME_COLOR` trong `app/layout.tsx` là hằng cứng (xem [Roadmap](./development-roadmap.md)).
- Token `--bp-*` không dùng được trong media query. Media query viết giá trị px cố định kèm chú thích `/* 768px = --bp-md */` (hoặc `--bp-lg`, `--bp-xl`). Các media query ở shell, editor, list, overview, tabs và lookbook đã có chú thích. `outfit-card.module.css` và `site-header.module.css` chưa có (xem [Roadmap](./development-roadmap.md)).

### Animation lúc tải trang: chỉ CSS

- Hiệu ứng vào trang (fade, stagger, reveal) viết bằng CSS trong `styles/motion-primitives.module.css`: `fadeUp`, `fadeIn`, `revealOnScroll`. Dùng `animation-fill-mode: backwards`, **không** dùng `both`. Trạng thái "from" chỉ áp dụng lúc chờ delay, sau đó quy tắc opacity/transform bình thường (ví dụ làm mờ món khác khi hover) thắng.
- Mỗi phần tử chỉ gắn **một** class animation.
- Route fade: `app/(public)/template.tsx` dùng `fadeIn`.
- Draw-once của connector lookbook: keyframes `draw` trong `components/lookbook/lookbook-motion.module.css` chỉ chạy khi có thuộc tính `[data-ready]`. `useLookbookReady` không quay lại `false`, nên đổi viewport không chạy lại animation. Thuộc tính `data-ready` là cơ chế kiểm trong e2e, không dùng `data-drawn`.

### Motion (`motion@14.10.1`): chỉ cho tương tác sau hydrate

- Chỉ dùng cho tương tác sau khi trang đã hydrate: hiện tại là header public ẩn/hiện khi cuộn (`components/public/hide-on-scroll-header.tsx`) và toast admin (`components/admin/shell/admin-toast-provider.tsx`).
- Dùng component `m.*` (ví dụ `m.header`, `m.div`). `components/motion/motion-provider.tsx` bọc `LazyMotion` (`domAnimation`, `strict`) và `MotionConfig reducedMotion="user"`. `MotionProvider` được mount trong `app/layout.tsx`. Với `strict`, `motion.div` (không phải `m.div`) sẽ lỗi lúc chạy.
- **Cấm trạng thái ẩn lúc SSR** bằng motion: không đặt `initial` làm phần tử ẩn trong HTML trả về. Nội dung phải có sẵn trong HTML.
- Thay đổi bề rộng rail admin dùng CSS `transition: width`, không dùng motion, vì bố cục do cookie quyết định từ server.

### Tắt JS và giảm chuyển động

- Nội dung cuối cùng phải hiển thị khi tắt JS. Animation CSS vẫn chạy khi tắt JS, nên mọi phần tử được animate phải về `opacity: 1` khi animation kết thúc.
- `prefers-reduced-motion: reduce`: `motion-primitives.module.css` đặt `animation: none`. `globals.css` rút thời lượng animation và transition về `0.01ms`. Motion dùng `reducedMotion="user"`.
- Kiểm bằng e2e: `public-viewport-and-no-js.spec.ts` đọc `getComputedStyle(...).opacity` sau khi animation xong. Không chỉ dùng `toBeVisible()`, vì Playwright không xét opacity.
- Lookbook ẩn connector khi chưa `data-ready` (`visibility: hidden`). Ảnh lỗi cũng phải được coi là sẵn sàng (listener `error` trong `use-lookbook-ready.ts`), nếu không đường nối ẩn vĩnh viễn.
- Form đăng ký bản tin gửi được khi tắt JS: Server Action + redirect (PRG), kết quả đọc từ `?newsletter=` (xem [Bản tin](./system-architecture.md#bản-tin-newsletter)). Thông báo kết quả nhận focus (`newsletter-status-message.tsx`) để trình đọc màn hình đọc được.

### Editorial: chữ, nhãn, nút

- **Tiêu đề public** dùng `--font-display` với `--font-weight-display` (400). Không đặt bold cho chữ serif. Tiêu đề admin (`h1`) cũng dùng `--font-weight-display`.
- **Nhãn, nav, nút, breadcrumb** viết hoa bằng CSS: `text-transform: uppercase` cộng `letter-spacing: var(--client-label-tracking)`. Không gõ chữ hoa trong HTML. DOM giữ nguyên nội dung, nên `getByRole(..., { name })` trong e2e không đổi.
- **Nút public** dùng `components/public/public-button.module.css` (đang dùng ở 9 file). Không viết lại rule pill riêng trong module mới. Chấm điều hướng của hero là ngoại lệ có chủ đích.
- Không thêm `box-shadow` và màu accent ngoài ink, nền, chữ phụ ở public. Bo góc qua token `--client-radius-*`.
- **Form public** validate bằng thuộc tính HTML gốc (`required`, `type="email"`, `autoComplete`). Không thêm thư viện validate. Honeypot là `<input name="website" tabIndex={-1} autoComplete="off">` nằm trong vùng `aria-hidden` có class ẩn (`srOnlyClass`).
- **Hero** (`HeroSlider`): lớp phủ gradient alpha ≥ 0.6 trong vùng chữ (`hero-slider-caption.module.css`), đủ tương phản trên ảnh sáng. Dưới 768px chữ nằm trên panel đặc bên dưới ảnh; mũi tên ẩn, vuốt và chấm vẫn dùng được.
- **Tên vùng section** (`SectionShell`): khi tiêu đề nằm trong panel (`CampaignBanner`, `NewsletterSignup`), truyền `labelledBy` trỏ tới `h2` đang hiện. Không dùng `label` (aria-label) lặp lại chữ hiển thị.

### Ảnh LCP: một ảnh ưu tiên

Mục tiêu: mỗi trang chỉ có một ảnh được tải sớm. Trước đây `/` phát ra năm `<link rel="preload">`.

| Nơi | Cách làm |
|-----|----------|
| Lookbook (`LookbookModelFigure`) | Prop `preload` của `next/image`. `FeaturedLookbookView` truyền `preload={priority}`. Trang `/look/[slug]` giữ mặc định `preload` |
| Card outfit, card bộ sưu tập | `loading="eager"` và `fetchPriority="high"` chỉ khi ô đầu của grid là LCP (`firstRow && highPriority`). Các ô còn lại để lazy |
| Slide đầu `HeroSlider` khi là LCP | `fetchPriority="high"` (`hero-image-props.ts`), không preload |
| `Gallery` (ô đầu), `CampaignBanner` (ảnh chính) | Chỉ preload khi section là LCP (`priority`) |

Kiểm nhanh với bố cục mặc định: `curl -s http://localhost:3000/ | grep -c 'rel="preload" as="image"'` phải ra 1.

### Chữ chạy (Marquee) và giảm chuyển động

- Chạy bằng CSS, không dùng JS. Không có nút tạm dừng: dải chữ dừng khi rê chuột (`.marquee:hover .track`) và tắt hẳn dưới reduced motion (quyết định 2026-11-08).
- `prefers-reduced-motion: reduce` đặt `animation: none` và ẩn nhóm chữ lặp (`marquee.module.css`). Không chỉ rút ngắn thời lượng: vòng lặp vô hạn rút ngắn sẽ nhấp nháy.

### Icon

- Icon trang trí dùng `DecorativeIcon` (`components/ui/decorative-icon.tsx`), bọc `lucide-react@1.70.0`. Component gắn `aria-hidden="true"` và `focusable="false"`.
- Icon mang nghĩa (nút chỉ có icon) phải có nhãn riêng qua `aria-label` hoặc text ẩn, không dựa vào icon.
- Rail sidebar: khi thu gọn, link có `aria-label` và tooltip CSS (`data-tip`). Khi mở rộng, bỏ `aria-label` vì chữ đã hiện, tránh lệch tên (WCAG 2.5.3).

### Hộp thoại, drawer, toast

- Mọi hộp thoại và drawer dùng `hooks/use-modal-dialog.ts` (`useModalDialog`) trên `<dialog>` với `showModal()`. Đóng thì trả focus về phần tử đã mở. Drawer mobile hiện dùng hook này (`components/admin/shell/admin-nav-drawer.tsx`). Sheet "Mua đồ" của feed (`components/feed/feed-shop-sheet.tsx`) cũng dùng hook này.
- **Toast chỉ báo thành công.** `toast.success(...)` qua `useAdminToast` (`components/admin/shell/use-admin-toast.ts`). Tự ẩn sau `--toast-duration`.
- **Lỗi hiện inline** cạnh field hoặc form (`FormError`), không đưa vào toast. Một lỗi không được xuất hiện trên hai kênh cùng lúc, vì cả hai đều nằm trong vùng `role="alert"`.
- **Xoá vĩnh viễn** trong admin (ví dụ người đăng ký bản tin): nút `btnDanger`, có hộp thoại xác nhận, và chữ nút đổi sang "Đang xoá…" khi đang chạy. Huỷ/huỷ đăng ký là thao tác đảo ngược được nên dùng nút thường.
- Hai live region của toast luôn có sẵn trong DOM. Chỉ phần tử toast con được animate bằng `m.*`.

### Điều khiển chạm và URL

- Vùng chạm tối thiểu **44px** cho điều khiển admin (`--admin-control-height`). Nav public cũng được kiểm ở 320 và 390px trong e2e.
- Nút và link trong admin bo theo `--admin-radius`, focus ring theo `--admin-focus`.
- Mọi URL admin lấy từ `ADMIN_PATHS` (xem [Route admin](./system-architecture.md#nhóm-admin-appadmin)).

### Feed (bài Photo)

- Chữ giao diện của feed nằm trong `FEED_COPY` (`components/public/public-copy.ts`). Màu, kích thước và thời gian là token `--feed-*`, không viết thẳng trong component.
- `sizes` của `next/image` phải là chuỗi literal. Đặt hằng ở `components/feed/feed-photo-sizes.ts`, không ghép chuỗi trong JSX.
- Điều khiển chỉ có ích khi có JS (nút chia sẻ, Mua đồ, chấm, mũi tên) thì ẩn bằng `@media (scripting: none)` trong `feed-post-controls.module.css`. Phần còn lại phải dùng được khi tắt JS (xem [Tắt JS](#tắt-js-và-giảm-chuyển-động)).

### Baseline visual của lookbook

- Spec `e2e/visual-reference-screenshots.spec.ts` chụp `[data-lookbook]` bằng `toHaveScreenshot` ở 390 và 1440px. Ảnh baseline nằm trong `e2e/visual-reference-screenshots.spec.ts-snapshots/`, tên có hậu tố `-visual-win32.png`.
- Baseline ghi nhận với **dev mode** (`pnpm dev`) trên **Windows (win32)**. Chạy ở môi trường khác (OS, chế độ build) sẽ lệch font và pixel, cần baseline riêng.
- Chạy: `pnpm e2e --project visual`.
- Không dùng `--update-snapshots` tuỳ tiện. Chỉ cập nhật baseline khi có thay đổi thiết kế chủ đích, và ghi vào [Lịch sử thay đổi](./project-changelog.md).
- Đợt editorial (2026-11-08): font lookbook đã đổi sang Playfair, nên baseline cũ không còn khớp ở phần nhãn. Baseline mới chỉ được cập nhật sau khi chủ repo duyệt ảnh bằng mắt. Lệch bố cục (vị trí, kích thước, số dòng nhãn) là lỗi phải sửa trước, không đưa vào baseline.

## Hợp đồng dùng chung (`packages/shared`)

- Mọi schema request/response, kiểu DTO, mã lỗi, đường dẫn API (`API_PATHS`, `apiUrl`) và hằng header (`REVALIDATE_SECRET_HEADER`) đều nằm trong `packages/shared/src`. API và web cùng import `@under30ss/shared`.
- Đừng định nghĩa lại kiểu hoặc đường dẫn API ở một workspace khác.
- **Đổi hợp đồng phải báo trước** và cập nhật cả API lẫn web trong cùng thay đổi. Chạy `pnpm typecheck` và `pnpm test` để thấy lệch.
- Cách nạp: typecheck và vitest dùng điều kiện `source` (đọc `src/*.ts` trực tiếp). Runtime (`node dist/...`, build Docker) dùng `dist/`. Sau khi đổi `packages/shared/src`, chạy `pnpm --filter @under30ss/shared build` trước khi chạy runtime trên host. `pnpm dev` và `pnpm build` đã build shared trước.
- Fixtures mẫu cho test: `@under30ss/shared/fixtures` (`packages/shared/src/fixtures`).
- Quy ước chuỗi: thông điệp lỗi cho người dùng viết tiếng Việt; tên trường, mã lỗi và khoá JSON viết tiếng Anh.

## Section trang chủ, bộ sưu tập, editor

Thư mục:

- `apps/web/src/components/home-sections/`: view của từng loại section, `HomeSectionList`, `SectionShell` (holder chung, tiêu đề qua `aria-labelledby`).
- `apps/web/src/components/admin/collections/` (form, danh sách, outfit trong bộ sưu tập), `components/admin/pickers/` (`AdminEntityPicker` tìm kiếm phía server, dùng chung cho outfit và bộ sưu tập), `components/admin/home-editor/` (màn hình, toolbar, danh sách thẻ section, form theo `home-section-field-specs.ts`, xem trước).
- `apps/web/src/lib/newsletter/`: Server Action đăng ký bản tin, `pickClientIp`, `newsletterResultHref`. Không import từ module client.
- `apps/web/src/components/admin/newsletter/`: danh sách, bộ lọc, hành động từng dòng của trang Đăng ký nhận tin.

Luật "view section client-safe": view trong `home-sections/` chỉ nhận DTO đã resolve từ API (`GET /api/public/home`). Không import module server-only, không gọi API, không đọc env. Test `apps/web/test/home-sections/views-client-safe.test.tsx` giữ luật này.

Thêm một loại section mới:

1. Thêm schema và `type` vào `packages/shared/src/home-sections/` (`home-section-union.ts`, `home-section-defaults.ts`, `home-section-meta.ts`).
2. Thêm resolver ở API (`apps/api/src/services/home-section-resolver-service.ts`) để lấy dữ liệu theo id, lọc bản ghi không còn dùng được.
3. Thêm view trong `components/home-sections/` và đăng ký trong `home-section-views.ts`.
4. Thêm field spec trong `components/admin/home-editor/home-section-field-specs.ts` (nhãn tiếng Việt, lấy từ `HOME_SECTION_META`).
5. Thêm test: schema (shared), resolver (api), view (web), và spec `content-home-sections-render` nếu loại đó có hành vi riêng trên trang.

Chữ mới của từng khu vực nằm ở file copy riêng (`apps/web/src/components/public/collection-copy.ts`, `components/home-sections/home-section-copy.ts`, `components/admin/home-editor/home-editor-copy.ts`). `public-copy.ts` chỉ dành cho shell.

### Client component và barrel shared

- Module `'use client'` không import giá trị (value) từ barrel `@under30ss/shared`. Barrel kéo theo zod và mọi schema vào client bundle public, tăng khoảng 100 KiB. Dùng `import type` hoặc module client-safe riêng. Ví dụ: `apps/web/src/components/public/home-path.ts`.
- Server Component không truyền hàm sang Client Component (props phải serializable). Dựng link hoặc giá trị ngay trong Client Component, hoặc truyền dữ liệu thuần. Ví dụ đã sửa: trang sửa bộ sưu tập không còn truyền hàm phân trang xuống panel. Panel tự gọi `collectionOutfitsPageHref` từ `components/admin/collections/collection-list-query.ts`.

## Cấu hình, không fix cứng giá trị nghiệp vụ

Giá trị nghiệp vụ (giới hạn upload, ngưỡng rate limit, số trang, múi giờ, thời gian cache, tên site) không được hard-code. Chúng nằm ở một trong ba nơi, ưu tiên theo thứ tự:

1. **Settings trong DB** (admin sửa trên UI): tên site, SEO, OG image, `uploadMaxMb`, `looksPageSize`, `relatedOutfitsCount`.
2. **Biến môi trường** có schema: `apps/api/src/config/env-config.ts`, `apps/web/src/lib/web-env.ts`, tham số tuỳ chọn trong `apps/api/src/lib/runtime-defaults.ts`.
3. **Compose**: giá trị mặc định cho các biến trong `infra/docker-compose.yml` (dạng `${VAR:-default}`).

Ngoại lệ là guard kỹ thuật, không phải giá trị nghiệp vụ (ví dụ `MAX_INPUT_PIXELS` 100 triệu, `REVALIDATE_TIMEOUT_MS` 3000, `JSON_BODY_LIMIT` 1 MB, `MAX_PATHS` 50, `MAX_LIST_PAGE` 100000). Ngoại lệ phải có lý do ghi trong code.

**Checklist khi thêm một biến môi trường mới:**

- [ ] Thêm vào schema (`env-config.ts` hoặc `web-env.ts`), hoặc vào `runtime-defaults.ts` nếu là tham số tuỳ chọn.
- [ ] Thêm vào `.env.example` ở gốc (nếu compose dùng) và/hoặc `apps/api/.env.example`, `apps/web/.env.example`.
- [ ] Thêm vào `environment:` của service trong `infra/docker-compose.yml`. Compose prod kế thừa, không cần thêm trừ khi cần ghi đè.
- [ ] Thêm vào `infra/.env.prod.example` nếu là biến production bắt buộc hoặc cần đổi theo môi trường.
- [ ] Cập nhật bảng trong [Triển khai](./deployment-guide.md#tham-chiếu-biến-môi-trường).

## Danh sách lọc, tìm kiếm, phân trang

- Query, lọc, sắp xếp và phân trang làm ở **server**. Admin gọi `GET /api/admin/outfits?q&status&page&size` và nhận đúng một trang. Không kéo toàn bộ dữ liệu về trình duyệt rồi lọc bằng JS.
- Public: `/looks?page=n` render phía server; API `GET /api/public/outfits?page&size` trả đúng một trang. Trang `/`, `/looks` và `/collections/[slug]` (chế độ feed) đọc `GET /api/public/outfits/feed` theo lô, server render slide; link `?page=N+1` là dự phòng khi không có JS. Chi tiết: [Kiến trúc, mục Feed outfit](./system-architecture.md#feed-outfit).
- Kích thước trang mặc định và tối đa lấy từ settings hoặc env: admin dùng `ADMIN_PAGE_SIZE_DEFAULT` và `ADMIN_PAGE_SIZE_MAX`; public dùng `looksPageSize` (fallback `PUBLIC_LOOKS_PAGE_SIZE`) và trần `PUBLIC_PAGE_SIZE_MAX`.
- Tương tác nhỏ (ô tìm kiếm, phân trang) dùng form hoặc link để server dựng lại kết quả.

## Comment

- Comment viết **tiếng Anh**, và chỉ khi cần giải thích **vì sao** (ràng buộc, workaround, lỗi thư viện, invariant). Không comment lại điều code đã nói rõ.
- Không viết JSDoc cho hàm đơn giản. Chỉ viết cho API public hoặc hành vi có điểm bất ngờ.
- Không dùng comment chia khu (`// ===== ... =====`) và không ghi lịch sử sửa đổi trong comment.
- Một số file cũ còn comment tiếng Việt. Không dịch hàng loạt. Comment mới viết tiếng Anh.

## Commit và nhánh

- Commit message **tiếng Anh**, theo Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Không nhắc tới công cụ AI trong commit message, PR hoặc comment.
- Ví dụ thật từ lịch sử repo:
  - `fix: harden login limiter with device cookie and ensure outfit indexes`
  - `feat: add production compose override and mongo/bucket backup script`
  - `test: add Playwright e2e for admin flow, public lookbook and visuals`
- Mỗi commit chỉ chứa thay đổi của một mục đích. Không commit file môi trường, khoá, mật khẩu, `.env*` (trừ `.env.example`, `infra/.env.prod.example`).
- Nhánh chính là `main`.

## Line ending và file nhị phân

- `.gitattributes`: `* text=auto eol=lf`. Mọi file text lưu với LF, kể cả script shell.
- Nhị phân được khai báo `binary`: `*.png`, `*.jpg`, `*.webp`, `*.onnx`.
- Script shell trong repo (`infra/backup/backup-mongo-and-bucket.sh`) phải giữ LF. Lưu ý quyền thực thi: xem [Triển khai, mục sao lưu](./deployment-guide.md#sao-lưu).

## Kiểm tra trước khi commit

Chạy ở gốc repo:

| Lệnh | Nội dung |
|------|----------|
| `pnpm lint` | `eslint .` (cấu hình `eslint.config.mjs`) |
| `pnpm typecheck` | `pnpm -r typecheck` cho từng workspace, rồi `tsc -p tsconfig.json` (gồm `e2e/` và `playwright.config.ts`) |
| `pnpm test` | `pnpm -r test`: shared, api, web |
| `pnpm e2e` | Playwright, cần stack đang chạy (xem [Kiểm thử](#kiểm-thử)) |

Quy tắc: không bỏ qua test đang fail để qua build. Không dùng mock thay cho hành vi thật ở test tích hợp và e2e.

## Kiểm thử

| Phạm vi | Công cụ | Vị trí | Số test (2026-11-07) |
|---------|---------|--------|----------------------|
| `packages/shared` | Vitest | `packages/shared/src/**/*.test.ts` | 126 |
| `apps/api` | Vitest, supertest, mongodb-memory-server | `apps/api/src/**/*.test.ts`, `apps/api/test/**/*.test.ts` | 183 |
| `apps/web` | Vitest, jsdom, Testing Library | `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/test/**/*.test.{ts,tsx}` | 572 |
| E2E | Playwright (Chromium) | `e2e/*.spec.ts`, `e2e/*.teardown.ts` | 88 (xem bên dưới) |

Chi tiết:

- **API.** `apps/api/vitest.config.ts` dùng `globalSetup: test/setup/shared-mongod-global-setup.ts`. Một MongoDB in-memory được khởi động cho cả lần chạy, nên test không cần Mongo thật. Test HTTP dùng supertest trên `createApp`.
- **Web.** `environment: jsdom`, `globals: true`, setup `apps/web/test/setup.ts`. Alias `@/` trỏ tới `apps/web/src`.
- **E2E.** `playwright.config.ts` ở gốc, `testDir: e2e`, `baseURL` mặc định `http://localhost:8080`. Config không tự khởi động server, stack phải chạy sẵn (Docker hoặc `pnpm dev`, xem [Triển khai](./deployment-guide.md)).
  - Project và thứ tự:

    | Project | Spec | Ghi chú |
    |---------|------|---------|
    | `admin-flow` | `admin-outfit-flow.spec.ts` | Tạo outfit qua UI. Project `public` chờ project này xong |
    | `public` | `public-*.spec.ts` | Trang public, `/looks`, connector, viewport, chế độ không JS |
    | `admin-shell` | `admin-shell-*.spec.ts` | Theme, rail, drawer, toast, redirect, viewport admin. Không phụ thuộc `admin-flow` |
    | `visual` | `visual-*.spec.ts` | Chụp `[data-lookbook]` so với baseline |
    | `cleanup` | `cleanup.teardown.ts` | Xoá outfit test qua API sau khi chạy |
    | `content-setup` → `content-collections` → `content-home-editor-flow` → `content-home-editor-mobile` → `content-home-sections-render` → `content-footer-and-nav` | `content-*.spec.ts` (mỗi file một project) | Đổi bố cục trang chủ, settings, bộ sưu tập. Chạy nối tiếp qua `dependencies`, không song song. `content-setup` (`content.setup.ts`) chỉ chạy khi `E2E_BASE_URL` là localhost / 127.0.0.1 hoặc có `E2E_ALLOW_CONTENT_RESET=1`, rồi ghi bố cục trang chủ và settings hiện có vào `test-results/content-snapshot.json`. Project cuối có `teardown: content-cleanup` (`content.teardown.ts`: khôi phục bố cục và settings từ snapshot, xoá fixture có tiền tố `e2e-content-`). Không khôi phục được y nguyên `previous` và `publishedAt` của bản đăng |

    Lý do một file một project: Playwright không tuần tự hoá các file trong cùng project khi `workers: 2`. `visual` và `admin-shell` chạy trước chuỗi `content` vì snapshot `/` cần bố cục mặc định.

  - Biến môi trường: `E2E_ADMIN_PASSWORD` (bắt buộc, không có giá trị mặc định, không lưu trong repo), `E2E_ADMIN_EMAIL` (mặc định `admin@under30ss.local`), `E2E_BASE_URL` (mặc định `http://localhost:8080`), `E2E_ALLOW_CONTENT_RESET` (xem dưới).
  - Test chỉ đăng nhập thành công, không thử sai, nên không chạm rate limit. Playwright chạy `retries: 0`.
  - Số test: 88 (admin-flow 1, public 41, admin-shell 18, visual 4, cleanup 1; content: setup 1, collections 4, editor desktop 2, editor mobile 3, render 7, footer và nav 5, content-cleanup 1).
  - Cache dev: dưới `next dev`, request đầu tiên tới trang public sau khi đăng, reset hoặc đổi settings có thể còn nội dung cũ; request kế tiếp đúng. Production (`next build` + `next start`) đã kiểm chứng là đọc mới. Web gọi `revalidateTag(tag, { expire: 0 })` (`apps/web/src/app/api/revalidate/route.ts`), theo [tài liệu Next.js](https://nextjs.org/docs/app/api-reference/functions/revalidateTag). Spec phải `expect.poll` (đọc lại trang), không `waitForTimeout` cố định để chờ dữ liệu.
  - Đăng nhập admin: `adminApi()` và `signInContext()` đăng nhập một lần mỗi worker. Limiter 20 lần/IP/15 phút, nên chạy đầy đủ `pnpm e2e` là đủ, không lặp lại nhiều lần liên tiếp.
- **Lighthouse.** Mục tiêu SEO và accessibility ≥ 95 (kế hoạch P7). Không có script tự động trong repo, chạy tay bằng Lighthouse CLI. Kết quả đo và điều kiện xem [Roadmap, trạng thái](./development-roadmap.md#trạng-thái-phase).

## Bảo mật trong code

- Secret chỉ đi qua biến môi trường. Không ghi vào repo, không đặt trong `*.example`.
- Mật khẩu admin không nhận qua tham số dòng lệnh. `create-admin` từ chối cờ `--password` và hỏi mật khẩu qua prompt (ẩn khi có TTY).
- Mọi input đi qua schema Zod ở biên (`validateBody`, schema query, schema body upload, Server Action cookie). Không tin dữ liệu từ client.
- Ảnh được decode và encode lại bằng sharp, không lưu file gốc. Chỉ nhận định dạng cho phép.
- Key object S3 công khai phải nằm dưới `public/`. Mọi đường ghi chỉ qua API.
- Dùng `timingSafeEqual` cho so sánh secret và chữ ký. Dùng `crypto.randomUUID` cho key ảnh.
- Thông báo lỗi 500 không lộ stack hay chi tiết nội bộ cho client.
- Cookie giao diện admin không chứa dữ liệu nhạy cảm, chỉ `admin-theme` và `admin-sidebar` với giá trị nằm trong danh sách cho phép.
