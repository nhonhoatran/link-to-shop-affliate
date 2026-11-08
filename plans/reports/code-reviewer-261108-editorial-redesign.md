# Code review — Editorial monochrome + 4 section mới + newsletter

Ngày: 2026-11-08 · Plan: `plans/261108-0923-editorial-luxury-redesign-and-new-sections/plan.md`
Phạm vi: diff chưa commit (102 file sửa, ~+1037/-468) + file mới trong `packages/shared`, `apps/api`, `apps/web`. Bỏ qua `apps/web/next-env.d.ts`, `plans/`. Không chạy Playwright (e2e đang chạy song song). Không chạy lại lint/typecheck/test (theo báo cáo: xanh).

## Điểm: 8/10

Phần bảo mật newsletter làm kỹ: honeypot ở cả web và API, limiter đếm mọi request (kể cả 400/409), lúc nào cũng trả 202, escape regex, chặn công thức CSV, `requireAdmin` + kiểm Origin cho route admin mới, `safeHrefSchema` cho `ctaHref`/`privacyHref`, ảnh CampaignBanner đi qua `listSectionImageKeys` → `isPublicKey`. Lỗi chính nằm ở hiệu năng LCP (5 preload thay vì 1) và Gallery lặp lại outfit nổi bật.

Đếm: Critical 0 · High 1 · Medium 4 · Low 7

---

## Critical
Không có.

## High

### H1. Trang `/` phát ra 5 `<link rel="preload" as="image">`, plan chỉ cho phép 1 (quyết định 5)
- Bằng chứng: `curl http://localhost:3000/` → 5 preload: 1 ảnh lookbook + 1 ảnh collection card + 3 ảnh outfit card (đối chiếu từng `src` với thẻ `<img>`: `collection-card-module__image` và `outfit-card-module__image` đều mang `loading="eager"`, không có `fetchPriority`).
- Nguyên nhân:
  1. `apps/web/src/components/public/outfit-card.tsx:30` và `apps/web/src/components/public/collection-card.tsx:36` đặt `loading="eager"` cho **cả hàng đầu, bất kể có `highPriority` hay không**. React 19 tự sinh preload khi SSR cho mọi `<img>` không có `loading="lazy"`/`fetchPriority="low"` (theo https://react.dev/reference/react-dom/components/img). Nên grid CollectionTiles/OutfitList, dù không phải LCP (`priority=false`), vẫn đẻ preload.
  2. `apps/web/src/components/lookbook/lookbook-model-figure.tsx:18` luôn gắn `preload`, kể cả khi FeaturedLookbook không phải section LCP (ví dụ admin đặt HeroSlider/CampaignBanner lên đầu → 2 preload cạnh tranh nhau).
- Cách sửa:
  ```tsx
  // outfit-card.tsx / collection-card.tsx: chỉ eager khi grid là LCP
  {...(firstRow && highPriority ? { loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
  ```
  (Lưu ý: `/looks` và trang collection đang truyền `highPriorityFirstRow` → ở đó vẫn còn N preload của hàng đầu; muốn chặt hơn thì chỉ eager cho `index === 0`, các ô còn lại để mặc định lazy.)
  Lookbook: thêm prop `preload?: boolean` (mặc định `true` để `/look/[slug]` giữ nguyên) cho `LookbookLayout` → `LookbookModelFigure`; `FeaturedLookbookView` truyền `preload={priority}`.
- Chủ file: P3 (`components/public/**`, `components/lookbook/**`); P4 (`featured-lookbook-view.tsx`). Thêm test SSR đếm `rel="preload"` trên `/` (P6).

## Medium

### M1. Gallery `latest` lặp lại outfit nổi bật của FeaturedLookbook
- `apps/api/src/services/home-section-resolver-service.ts:70-77` (`outfitListSlugs`) chỉ gom slug từ OutfitList. Bằng chứng HTML: ảnh `e01c0833…` ("Dramatic Liberty streetwear") hiện vừa ở `default-featured-lookbook` vừa ở `default-gallery`. OutfitList có `excludeFeatured: true` nhưng Gallery thì không.
- Sửa: thêm slug của section `FeaturedLookbook` đã resolve vào `exclude`:
  ```ts
  if (section?.type === 'FeaturedLookbook') slugs.add(section.data.outfit.slug);
  ```
  và thêm case vào `apps/api/test/home-layout-new-sections-resolve.test.ts`. Chủ file: P2.

### M2. Kết quả PRG không đọc được cho người dùng screen reader khi không có JS
- `apps/web/src/components/home-sections/newsletter-signup-view.tsx:69`: `<p role="status" aria-live="polite" tabIndex={-1}>` đã có nội dung lúc tải trang. Live region có sẵn nội dung khi load **không được đọc**, và nhảy tới hash `#newsletter-…` chỉ cuộn trang, không chuyển focus. Người dùng SR bấm "Đăng ký" xong không biết thành công hay lỗi.
- Sửa (progressive enhancement, không thêm dep): một client component nhỏ, khi có `result` thì `ref.current?.focus()` trên chính thẻ `<p>` (đã có `tabIndex=-1`); thêm `aria-describedby={anchorId}` cho ô email khi `result === 'invalid'`. Chủ file: P4.

### M3. Limiter newsletter gộp tất cả visitor vào một bucket khi không có `trust proxy`
- `apps/api/src/create-app.ts:33` chỉ bật `trust proxy` khi `NODE_ENV === 'production'`. Ngoài production, Server Action gọi API trực tiếp nên `req.ip` = IP của Next → mọi người dùng chung 10 lượt/15 phút (`NEWSLETTER_RATE_LIMIT_MAX_PER_IP`). Dễ làm e2e/staging bị 429 lung tung. Thêm nữa, `newsletter-rate-limit-middleware.ts:15` dùng `req.ip ?? ''` → thiếu IP thì cũng gom một bucket.
- Production đúng: Caddy (`infra/caddy/Caddyfile`) bỏ XFF không tin cậy và gắn IP thật → `pickClientIp` lấy phần tử cuối → Next gửi lại một IP → API `trust proxy 1` đọc đúng. API không publish port (`docker-compose.yml`), nên không giả mạo XFF được.
- Sửa: ghi rõ trong `docs/deployment-guide.md` (P2) rằng ngoài production limiter đếm theo IP của web; nếu staging chạy `NODE_ENV=development` sau Caddy thì cần env `TRUST_PROXY_HOPS` (mặc định 1 ở production). Nếu đặt CDN (Cloudflare…) trước Caddy, phần tử cuối là IP edge → cần cấu hình `trusted_proxies` trong Caddy. Chủ file: P2.

### M4. Đồng ý bị đổi (409) → người dùng thấy lỗi chung chung
- `apps/web/src/lib/newsletter/subscribe-newsletter-action.ts:36-39`: 409 (câu đồng ý đã đổi) trả `'error'`. Action đã xoá cache home nhưng người dùng chỉ thấy câu lỗi chung, không biết cần tải lại rồi tick lại. Sửa: thêm kết quả `'stale'` vào `NEWSLETTER_RESULTS` (P1/shared) với câu "Nội dung đồng ý vừa được cập nhật, vui lòng đọc lại và đăng ký lại" (P4 copy). Hoặc giữ `'error'` nhưng đổi câu cho có hướng dẫn tải lại.

## Low

- L1. DRY: `resolveCampaignBanner` (`home-section-resolver-service.ts:23-29`) viết lại logic của `attachSectionImageUrls` (đã có nhánh CampaignBanner ở `home-section-image-mapper.ts:19`). Có thể gộp CampaignBanner vào chung `case 'TextWithImage'`. (P2)
- L2. Hằng số trùng: `MAX_SECTION_ID_LENGTH = 64` (`subscribe-newsletter-action.ts:18`) trùng với `sectionIdSchema`; `maxLength={254}` (`newsletter-signup-view.tsx:50`) nên dùng `MAX_EMAIL_LENGTH`; `maxLength={40}` (`settings-newsletter-consent-fields.tsx:71`) trùng giới hạn `privacyLabel` trong schema. (P4/P5)
- L3. Nếu layout có 2 section NewsletterSignup, `result` hiện ở cả hai (`home-section-list.tsx:45` truyền `newsletter` cho mọi view). Nên chỉ hiện khi `sectionId` trong hash/param khớp, hoặc giới hạn 1 section/trang trong meta. (P4)
- L4. Marquee: nút tạm dừng là checkbox có nhãn đổi "Tạm dừng"/"Tiếp tục" → SR đọc "Tiếp tục, checkbox, đã chọn" (dễ rối). Chấp nhận được với cách chỉ dùng CSS; nếu muốn rõ hơn thì giữ một nhãn cố định "Tạm dừng chuyển động" (trạng thái do checked thể hiện). `marquee-view.tsx:131-135`. (P4)
- L5. `NewsletterSignupView` dùng `SectionShell label={heading}` (aria-label) trong khi đã có `<h2>` hiện ra không có `id` → nên truyền `title`/`aria-labelledby` để tên vùng trùng với heading nhìn thấy. (P4)
- L6. Chặn công thức CSV (`newsletter-csv-export.ts:7`) chưa chặn ký tự full-width `＝ ＋ － ＠` (một số bản Excel tiếng Á vẫn hiểu). Rủi ro thấp vì email đã qua `z.email()`; thêm vào regex là đủ. (P2)
- L7. Bốn file test vượt 200 dòng: `apps/api/test/home-layout-public-resolve.test.ts` (211), `apps/api/test/home-layout-new-sections-resolve.test.ts` (204), `apps/web/test/admin/settings-form.test.tsx` (232), `packages/shared/src/home-sections/home-section-schemas.test.ts` (204). Code nguồn đều < 200. (P2/P5/P1)

---

## Đã kiểm chứng ổn (không cần sửa)
- **NoSQL injection**: `q` là string zod (`max 100`), `status` enum, `page` coerce; regex qua `escapeRegex` (`mongo-query-helpers.ts:1`); sai query → `ZodError` → 400 (`error-handler-middleware.ts:26`). Express 5 nên lỗi async được bắt.
- **Auth**: `/api/admin/newsletter*` gắn sau `admin.use(requireAdmin)` (`create-app.ts:42,50`); PATCH/DELETE đi qua `createOriginCheck`. `/export` khai báo trước `/:id`. id được kiểm `isObjectId`.
- **Dò email**: email mới / đã có / honeypot / race (duplicate key 11000) đều ra 202, cùng số lần ghi DB; 409 không phụ thuộc email. Log không in email/IP; xoá thì log email đã che.
- **Version đồng ý**: tăng trong một `updateOne` có điều kiện (chống race); khi tắt form thì xoá câu nhưng giữ version → bật lại luôn tăng tiếp (đơn điệu). `toSavedConsent` trả null khi chưa lưu → NewsletterSignup bị bỏ, form không tự hiện.
- **Tương thích ngược**: `eyebrow` optional; settings cũ không có `newsletterConsent` → section bị bỏ; web gặp type lạ thì bỏ qua (`home-section-list.tsx:20-24`); layout đã lưu không bị đổi (chỉ `DEFAULT_HOME_CONTENT` đổi).
- **Contract web↔api**: `API_PATHS.public.newsletter` POST → 202 `{ok:true}`; PATCH `/:id/unsubscribe` → DTO; DELETE → 204; list `Paginated` có `size` mà trang admin đang dùng. Export qua `/api/*` (Caddy ở prod, rewrite của `next.config` ở dev) nên cookie same-origin.
- **List admin render server-side** (searchParams → `adminGet`), CSV stream bằng cursor, có `Cache-Control: no-store`, BOM, header CSV hợp lệ, dừng khi client bỏ đi.
- **Marquee**: tắt hẳn animation + ẩn nhóm trùng khi `prefers-reduced-motion`; có focus ring cho nút tạm dừng (`marquee.module.css:92`).
- Không thêm dependency (không có diff ở `package.json`/lockfile). Giá trị limiter đọc từ env, có mặt ở `.env.example` và compose.

## Thứ tự nên làm
1. H1 (P3 + P4) — sửa điều kiện eager của card + gate preload lookbook; kiểm lại bằng `curl / | grep -c 'rel="preload" as="image"'` → phải ra 1.
2. M1 (P2) — loại outfit nổi bật khỏi Gallery latest + test.
3. M2, M4 (P4/P1) — thông báo kết quả cho SR và trường hợp câu đồng ý đổi.
4. M3 (P2) — ghi chú deploy / env trust proxy.
5. Các mục Low khi tiện.

## Câu hỏi còn mở
- Có muốn `/looks` và trang collection cũng chỉ 1 preload (ô đầu tiên) không, hay quyết định "1 preload" chỉ áp dụng cho `/`?
- Gallery nguồn `manual`/`collection` có cần dedupe với OutfitList/FeaturedLookbook không (hiện chỉ `latest` được dedupe)?
- Staging có chạy `NODE_ENV=production` sau Caddy không? Nếu không thì limiter newsletter ở đó dùng chung một bucket.

Nguồn ngoài: [react.dev — `<img>`: tự preload khi SSR](https://react.dev/reference/react-dom/components/img)
