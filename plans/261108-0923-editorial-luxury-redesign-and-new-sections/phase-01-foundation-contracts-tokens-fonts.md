# Phase 1: Nền (contract, token, font, field spec)

## Context Links
- Research: `../reports/researcher-261108-0930-editorial-fonts-and-motion.md` (mục 1 font, 2 marquee, 3 mosaic, 4 banner), `../reports/researcher-261108-0930-newsletter-signup.md` (mục 1, 3, "Cấu hình động").
- Checklist UI: [ui-consistency-checklist.md](./ui-consistency-checklist.md) (G1-G4, H). Ma trận: [file-ownership-matrix.md](./file-ownership-matrix.md).
- Code: `packages/shared/src/home-sections/*`, `home-layout-contract.ts:56-63` (`ResolvedHomeSection`), `settings-schemas.ts:55-95`, `api-contract.ts:9-47` (`API_PATHS`), `apps/web/src/styles/*.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/admin/home-editor/{home-section-field-specs,section-summary}.ts`, `field-specs/*`.
- Docs: `docs/code-standards.md` mục "Token màu và kích thước", "Section trang chủ, bộ sưu tập, editor", "Cấu hình, không fix cứng".

## Overview
- Priority: P1. Status: Completed. Effort: 10h. Chặn mọi phase khác.
- Đóng băng contract (4 section mới, eyebrow, newsletter, settings đồng ý), đổi token + font, field spec cho editor. Mọi thứ additive/optional để repo xanh ngay sau phase.

## Key Insights
- Token-first đúng như kỳ vọng: 11 module public dùng `--client-radius-pill` (14 dòng), 9 module (14 dòng) dùng `--client-radius-lg`/`--client-shadow-soft`, admin 32 dòng dùng `--admin-radius*` (grep, xem checklist G1). Đổi giá trị token là vuông góc + bỏ bóng cho phần lớn UI.
- Thêm type vào union làm vỡ typecheck ở 4 chỗ dùng kiểu exhaustive: `apps/api/src/services/home-section-resolver-service.ts:22` (switch), `components/home-sections/home-section-views.ts:15` (mapped type), `home-section-field-specs.ts:18` (Record), `section-summary.ts:9` (switch). Cách giữ xanh:
  - Field spec + summary là bản soi 1:1 của schema, test `home-section-field-specs.test.ts:34` đòi "mỗi prop có field" → P1 sở hữu luôn (lý do đổi chủ so với phân công gốc).
  - Resolver và views: P1 thêm nhánh rỗng (section mới bị bỏ qua như section "không có gì để hiện"), P2/P4 thay bằng bản thật. Khai là cặp tuần tự.
- Fixture mới tách export riêng (`sampleEditorialHomeSections`, `sampleResolvedEditorialSections`). Không chèn vào `sampleHomeSections` vì test web hiện dùng chỉ số (`home-section-list.test.tsx:39` `slice(4, 5)`) và render qua view thật.
- Hệ quả (red team H1): `home-section-field-specs.test.ts:62-72` gọi `sampleSection(type)` cho mọi field `select`, mà `home-editor-fixture.ts:4-7` chỉ tìm trong `sampleHomeSections` và `throw` khi không thấy. P1 sở hữu `apps/web/test/admin/home-editor/home-editor-fixture.ts`: `sampleSection` tìm trong `[...sampleHomeSections, ...sampleEditorialHomeSections]`, `sampleContent()` giữ 7 section (để `add-section-dialog.test.tsx:59` `toHaveLength(8)` không đổi).
- Hai danh sách type viết tay (red team F4): `DATA_TYPES` (`use-section-preview-data.ts:16`) và `TEXT_ONLY_TYPES` (`home-section-list.tsx:18`, chọn ảnh LCP). P1 thêm cờ `resolvesData`, `hasImage` vào `HOME_SECTION_META` (có test). P1 đổi luôn `DATA_TYPES` thành suy từ `resolvesData` (file chuyển chủ từ P5 sang P1, sửa 1 dòng), nên khung xem trước có `data` cho Gallery/NewsletterSignup ngay khi API có, không phụ thuộc P5. P4 tự đổi `TEXT_ONLY_TYPES` sang `hasImage` trong file của mình.
- Eyebrow (dòng nhãn nhỏ trên tiêu đề, có ở mọi section của mockup) = `eyebrow?: string` optional cho section **đã có tiêu đề** + slide hero. Không thêm eyebrow/title cho Commitments và FeaturedLookbook (YAGNI; P4 chỉ restyle phần đang có). Optional nên bố cục đã lưu vẫn hợp lệ.
- Bố cục mặc định (Q3 đã chốt) có NewsletterSignup, nhưng form chỉ hiện sau khi admin chủ động lưu câu đồng ý trong Cài đặt (P2 resolver bỏ section khi settings chưa có `newsletterConsent`). Câu mặc định ở shared chỉ là giá trị điền sẵn trong form Cài đặt, không tự bật form.
- OutfitList trong bố cục mặc định giữ một tab `latest` ("Outfit khác"): bố cục mặc định không biết id bộ sưu tập nên không tạo được tab theo bộ sưu tập. Tab xuất hiện khi admin chọn bộ sưu tập trong editor.
- Font: Playfair Display có subset `vietnamese`, variable 400-900 (research mục 1). `next/font/google` biến `--font-playfair-display`, token `--font-display`.
- Global `globals.css:41-47` ép `animation-duration: 0.01ms !important` khi reduced-motion. Marquee phải tự đặt `animation: none` (P4), không dựa vào rule toàn cục (0.01ms lặp vô hạn = nhấp nháy).

## Requirements
### Functional
- Shared schema mới (`packages/shared/src/home-sections/`):
  | Type | Props (ngoài `id`, `visible`) | Ràng buộc kỹ thuật |
  |---|---|---|
  | `CampaignBanner` | `eyebrow?`, `heading` (1-80), `body?` (<=400), `image`, `alt` (<=160), `imagePosition` left/right, `ctaLabel?`, `ctaHref?` (safeHref) | ảnh bắt buộc |
  | `Marquee` | `label?` (<=60, tên vùng), `items: {text}[]` (1-40 ký tự), `durationSeconds` | `MAX_MARQUEE_ITEMS` 12; giây 10-120 |
  | `Gallery` | `eyebrow?`, `title` (1-60), `note?` (<=120), `source` latest/collection/manual (Q5 đã chốt, không có `featured`), `collectionIds` (max 1), `outfitIds`, `count` | `MAX_GALLERY_ITEMS` 12 |
  | `NewsletterSignup` | `eyebrow?`, `heading` (1-80), `body?` (<=300), `buttonLabel` (1-30), `successMessage?` (<=160, trống = câu mặc định trong `home-section-copy.ts`), `finePrint?` (<=160) | câu đồng ý KHÔNG nằm ở section (ở settings) |
- `eyebrow?` (<=40) thêm vào: `CollectionTiles`, `OutfitList`, `TextWithImage`, `Faq`, `heroSlideSchema`. Không thêm cho Commitments, FeaturedLookbook.
- `ResolvedHomeSection` thêm: Marquee/CampaignBanner (không data), `Gallery & { data: { items: PublicOutfitCardDto[] } }`, `NewsletterSignup & { data: { consent: NewsletterConsentDto } }`.
- `HOME_SECTION_DEFAULTS`, `HOME_SECTION_META` cho 4 type (nhãn: "Banner chiến dịch", "Dải chữ chạy", "Thư viện ảnh", "Đăng ký nhận tin"). Mặc định là giá trị khởi tạo, admin sửa được: `durationSeconds` 30, Gallery `count` 6 + `source` latest (6 = 2 nhóm mosaic đủ, không ô lẻ; số khác vẫn không thủng, xem P4 `galleryMosaicSpans`), Newsletter `buttonLabel` "Đăng ký".
- `HomeSectionMeta` thêm `resolvesData: boolean` (true: CollectionTiles, OutfitList, FeaturedLookbook, Gallery, NewsletterSignup) và `hasImage: boolean` (false: Faq, Commitments, Marquee, NewsletterSignup). Test: mỗi type có đủ cờ; cờ khớp với `ResolvedHomeSection` (type có `data` ⇔ `resolvesData`).
- `DEFAULT_HOME_CONTENT` (Q3 đã chốt): FeaturedLookbook, CollectionTiles, OutfitList (`latest`, "Outfit khác", `excludeFeatured`), Gallery (`latest`), NewsletterSignup. Id ổn định `default-*`.
- `newsletter-contract.ts`:
  - `NEWSLETTER_STATUSES = ['subscribed','unsubscribed']` (DOI sau thêm `pending`), `NEWSLETTER_SOURCES = ['home']`;
  - `newsletterSubscribeRequestSchema` {email (trim, lowercase, `.email()`, max 254), `consent: z.literal(true)`, `consentTextVersion` int >= 1, `source`, `website?` (honeypot, max 200)}; `newsletterFormSchema` (bản `FormData`: consent `'on'`, version coerce, `sectionId`);
  - `adminNewsletterListQuerySchema` {q, status, page, size}; `AdminNewsletterSubscriberDto` (trạng thái hiện tại + `events`);
  - `NewsletterConsentEventDto` {`type`: subscribe/unsubscribe, `at`, `actor`: self/admin, `source?`, `textVersion?`} (lịch sử chỉ ghi nối, red team F6);
  - `NewsletterConsentDto` {text, version, privacyHref?, privacyLabel}; `NEWSLETTER_RESULT_PARAM = 'newsletter'`, `NEWSLETTER_RESULTS = ['ok','invalid','rate','error']`.
- `settings-schemas.ts`: `newsletterConsentSchema` {text (1-1000), privacyHref? (safeHref), privacyLabel? (1-40)}; `settingsInputSchema.newsletterConsent?`; `adminSettingsSchema` thêm `newsletterConsentVersion` (chỉ đọc, `null` khi chưa lưu lần nào). `DEFAULT_NEWSLETTER_CONSENT` (câu điền sẵn, Q4 còn mở), `DEFAULT_PRIVACY_LABEL`.
- `API_PATHS`: `public.newsletter`, `admin.newsletter`, `admin.newsletterExport`; `apiUrl.adminNewsletterSubscriber(id)`, `apiUrl.adminNewsletterUnsubscribe(id)`.
- Token + font + `THEME_COLOR` (xem Architecture). Module nút public (Q1 đã chốt).
- Field spec 4 type mới + field `eyebrow` cho type cũ; summary cho 4 type.

### Non-functional
- Mọi field mới optional/additive: bố cục đã đăng, settings cũ vẫn parse. Không migration (Mongo, `Mixed`).
- Con số trong bảng trên: chỉ là guard kỹ thuật hoặc mặc định; ghi comment "technical guard" như `section-common-schemas.ts:4`.
- File < 200 dòng (union, field specs, fixtures: tách file nếu chạm ngưỡng).

## Architecture
```
packages/shared (P1)
  home-sections/{campaign-banner,marquee,gallery,newsletter-signup}-section.ts
    -> home-section-union.ts (discriminatedUnion + HOME_SECTION_TYPES)
    -> home-section-defaults.ts / home-section-meta.ts / default-home-content.ts
  home-layout-contract.ts (ResolvedHomeSection + data)   newsletter-contract.ts   settings-schemas.ts
        |                                   |                         |
        v                                   v                         v
  API resolver (P1 nhánh rỗng -> P2)   API newsletter (P2)     settings API (P2), form admin (P5)
  web views map (P1 nhánh rỗng -> P4)  server action (P4), admin list (P5)
  field-specs + DATA_TYPES (P1, cố định)  -> editor admin (P5 chỉ dùng)
  HOME_SECTION_META.{resolvesData,hasImage} -> use-section-preview-data (P1), home-section-list LCP (P4)
```
Token (giá trị đã đo bằng script node, công thức WCAG, xem checklist G1):
- `client-theme-tokens.css`: bg `#faf8f5`, surface `#fff`, surface-soft `#f3f0eb`, ink `#111111`, ink-muted `#5c5752`, accent = ink, border `#e7e2da`, focus = ink, `--client-radius-lg` và `--client-radius-pill` = `2px` (giữ tên, có comment), `--client-shadow-soft: none`, `--client-card-image-ratio: 2 / 3`, `--client-collection-card-ratio: 2 / 3`.
  - Thêm: `--client-border-strong #8a827c` (viền ô nhập, 3.56:1), `--client-hero-scrim` (gradient ink 0.85 → 0.6 → 0), `--client-footer-bg/-fg/-muted/-wordmark`, `--client-focus-on-ink`, `--client-label-size`, `--client-label-tracking: 0.14em`, `--client-marquee-gap/-height`, `--client-mosaic-gap/-row/-row-lg`, `--client-banner-ratio`, `--client-newsletter-max-width`, `--lookbook-item-name-font: var(--font-display)` (Q2 đã chốt; P3 mới dùng token này nên visual P1 vẫn xanh).
  - Bỏ dùng `--client-hero-overlay` (P4 chuyển sang scrim), giữ token tới P6 dọn.
- `design-tokens.css`: `--font-display: var(--font-playfair-display), Georgia, serif`, `--font-weight-display: 400`, `--display-title-size` (clamp hero/banner), `--text-label: 12px`, `--letter-spacing-label: 0.14em`.
- `admin-theme-tokens.css`: sáng bg `#faf8f5`, text `#111111`, muted `#5c5752`, border `#e7e2da`, accent/focus `#111111`, `--admin-shadow: none`; tối giữ, accent/focus `#e6e8ee` (sửa cả 2 khối dark). `--admin-radius`, `--admin-radius-sm` = `2px` (ở `design-tokens.css`).
- `layout.tsx`: thêm `Playfair_Display({ subsets: ['vietnamese','latin'], display: 'swap', variable: '--font-playfair-display' })`, `THEME_COLOR = '#faf8f5'`.
- `public-button.module.css` (Q1 đã chốt): `.button` (khung chung 44px, chữ hoa, giãn chữ), `.primary` (nền ink, chữ on-ink), `.outline` (viền ink), `.onDark` (cho hero/footer), `.textLink` (gạch chân + mũi tên), `.icon` (nút vuông 44px).

## Related Code Files
- Create:
  - `packages/shared/src/home-sections/campaign-banner-section.ts`, `marquee-section.ts`, `gallery-section.ts`, `newsletter-signup-section.ts`
  - `packages/shared/src/newsletter-contract.ts`, `newsletter-contract.test.ts`
  - `packages/shared/src/fixtures/sample-editorial-sections.ts`, `sample-newsletter.ts`
  - `apps/web/src/components/public/public-button.module.css` (Q1)
  - `apps/web/src/components/admin/home-editor/field-specs/campaign-banner-fields.ts`, `marquee-fields.ts`, `gallery-fields.ts`, `newsletter-signup-fields.ts`
- Modify:
  - `packages/shared/src/home-sections/{section-common-schemas,hero-slider-section,collection-tiles-section,outfit-list-section,text-with-image-section,faq-section,home-section-union,home-section-defaults,home-section-meta,default-home-content,index}.ts`, `home-section-schemas.test.ts`
  - `packages/shared/src/{home-layout-contract,settings-schemas,settings-schemas.test,api-contract,index}.ts`, `fixtures/index.ts`
  - `apps/web/src/styles/{design-tokens,client-theme-tokens,admin-theme-tokens}.css`, `apps/web/src/app/globals.css` (chỉ nếu cần, vd `font-synthesis`), `apps/web/src/app/layout.tsx`
  - `apps/web/src/components/admin/home-editor/home-section-field-specs.ts`, `section-summary.ts`, `use-section-preview-data.ts` (`DATA_TYPES` suy từ meta), `field-specs/{common-fields,hero-slider-fields,outfit-list-fields}.ts`
  - `apps/web/test/admin/home-editor/home-editor-fixture.ts` (`sampleSection` tìm cả 2 mảng fixture)
  - Tuần tự 1/2: `apps/api/src/services/home-section-resolver-service.ts` (4 `case` trả `null`), `apps/web/src/components/home-sections/home-section-views.ts` (4 entry render `null`)
- Delete: không.

## Implementation Steps
1. Đọc checklist G/H. Chạy lại script contrast cho bộ token (ghi bảng vào checklist G1 nếu giá trị đổi).
2. `section-common-schemas.ts`: thêm `eyebrowSchema` + guard (`MAX_MARQUEE_ITEMS`, `MIN/MAX_MARQUEE_SECONDS`, `MAX_GALLERY_ITEMS`). Thêm `eyebrow?` vào 4 schema cũ + slide hero.
3. Tạo 4 file schema; đăng ký vào union, `HOME_SECTION_TYPES`, defaults, meta (+ cờ `resolvesData`, `hasImage` cho 11 type + test), index. `DEFAULT_HOME_CONTENT` 5 section theo Q3.
4. `home-layout-contract.ts`: mở rộng `ResolvedHomeSection`. `newsletter-contract.ts` + test (email chuẩn hoá, consent bắt buộc true, honeypot optional, list query lenient).
5. `settings-schemas.ts`: `newsletterConsent`, version chỉ đọc, mặc định; test. `api-contract.ts`: path mới.
6. Fixture: section mới (cả bản resolved), subscriber mẫu (có `events`), settings có `newsletterConsent`. Sửa `home-section-schemas.test.ts:41` so sánh với `[...sampleHomeSections, ...sampleEditorialHomeSections]`. Sửa `home-editor-fixture.ts` (`sampleSection` tìm cả 2 mảng, `sampleContent` giữ nguyên).
7. Field spec: 4 file mới (Marquee `items` dùng `kind: 'array'` với field `text`; Gallery `collectionIds` dùng `kind: 'collections', max: 1`, `outfitIds` dùng `kind: 'outfits'`, `showIf` theo `source`; Newsletter `successMessage` `optional: true`), field `eyebrow` (`optional: true`) cho type cũ, summary 4 type. `use-section-preview-data.ts`: `DATA_TYPES` = type có `resolvesData`.
8. Nhánh rỗng ở resolver API và views web (comment một dòng tiếng Anh: "Replaced by the real resolver/view in this plan").
9. Token 3 file + `layout.tsx` + `THEME_COLOR`. Tạo `public-button.module.css` (chỉ CSS, chưa ai dùng).
10. `pnpm lint && pnpm typecheck && pnpm test`; `E2E_BASE_URL=http://localhost:3000 pnpm e2e --project visual` (dự kiến xanh: lookbook dùng `--color-*`, chưa đổi font; nếu lệch ở góc thẻ thì báo lead, không update snapshot).

## Todo List
- [x] Contrast script + bảng G1 (bảng đo 2026-11-08 ở ui-consistency-checklist.md, mục G1)
- [x] Eyebrow + guard + 4 schema + union/defaults/meta (cờ) + default content 5 section
- [x] ResolvedHomeSection, newsletter contract + test
- [x] Settings đồng ý + API paths + test
- [x] Fixture mới, sửa test shared, `home-editor-fixture.ts`
- [x] Field spec 4 type + eyebrow + summary + `DATA_TYPES` từ meta
- [x] Nhánh rỗng resolver/views (tuần tự 1/2)
- [x] Token, font, THEME_COLOR, module nút
- [x] lint/typecheck/test/visual xanh

## Success Criteria
- `pnpm typecheck` xanh toàn repo với union 11 type. `pnpm test` xanh (shared + api + web), gồm `home-section-field-specs.test.ts` (field cho mọi prop) và `add-section-dialog.test.tsx` (11 nút).
- Parse `DEFAULT_HOME_CONTENT` và bố cục đã lưu trước đợt (không eyebrow) đều thành công (test). Với nhánh rỗng của P1, `/` mặc định vẫn hiện 3 section cũ (Gallery/Newsletter bị bỏ cho tới P2).
- Test meta: mọi type có `resolvesData`/`hasImage`; `DATA_TYPES` suy ra gồm đúng 5 type.
- HTML `/` có `<link rel="preload" ... font>` Playfair subset vietnamese; computed `--font-display` khác rỗng (P6 kiểm lại).
- Visual spec lookbook xanh (không update snapshot).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Đổi token làm lệch spec visual lookbook (góc thẻ, nền trang) | Thấp × Trung bình | Lookbook dùng `--color-*` không đổi; chạy spec ở bước 10, lệch thì dừng báo lead |
| Nhánh rỗng bị quên, section mới không bao giờ hiện | Thấp × Cao | Cặp tuần tự trong ma trận; P2/P4 có test "type mới render/resolve"; P6 e2e |
| Bố cục cũ không parse do field bắt buộc mới | Thấp × Cao | Mọi field mới optional; test parse fixture cũ |
| Playfair làm tăng tải font, CLS | Trung bình × Thấp | Variable 1 file/subset, `adjustFontFallback` mặc định; P6 đo CLS/LCP |
| Union + field spec vượt 200 dòng | Trung bình × Thấp | Đã tách field spec theo type; union file chỉ thêm 4 dòng |

## Security Considerations
- Email: trim + lowercase + `.email()` + max 254 ở shared, dùng chung web và API.
- `consent: z.literal(true)`: API từ chối nếu thiếu (chặn gọi thẳng bỏ checkbox).
- `privacyHref`, `ctaHref` qua `safeHrefSchema` (chặn `javascript:`).

## Rollback
- `git restore`/xoá file theo ma trận P1.
- Field mới (eyebrow, `newsletterConsent`) trong dữ liệu đã lưu: `z.object` mặc định bỏ key lạ, nên schema cũ đọc vẫn được.
- Section type mới trong bố cục đã đăng thì schema cũ parse lỗi. Chỉ rollback P1 khi chưa đăng bố cục có type mới; nếu đã đăng, dùng "Hoàn tác lần đăng" hoặc "Khôi phục bố cục mặc định" trước.

## Next Steps
- P2, P3, P4, P5 bắt đầu song song. Cần token/contract thêm thì báo lead, P1 sửa (không phase nào khác sửa file của P1).
