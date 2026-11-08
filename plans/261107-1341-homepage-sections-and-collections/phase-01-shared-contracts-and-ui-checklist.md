# Phase 1: Contract dùng chung, file hub, checklist UI

## Context Links
- Brainstorm mục "Dữ liệu", "Loại section", "Chốt thêm".
- Code đã đọc: `packages/shared/src/{index,api-contract,revalidate-contract,settings-schemas,outfit-schemas,public-outfit-list-contract,public-outfit-dto}.ts`; `apps/web/src/app/api/revalidate/route.ts`; `apps/web/src/lib/seo/public-data-loaders.ts`; `apps/web/src/lib/admin-paths.ts`; `apps/web/src/components/public/{outfit-card-grid,outfit-grid-columns,related-outfits-section}.tsx`.
- Checklist UI của plan trước (dùng lại phần A, B): `plans/261107-0913-professional-ui-refactor-client-admin/ui-consistency-checklist.md`.
- `docs/code-standards.md` mục "Hợp đồng dùng chung", "Cấu hình, không fix cứng".

## Overview
- Priority: P1. Status: Completed (2026-11-07). Effort: 9h. Chặn P2–P5. Wave 1 chỉ có phase này.
- Đóng băng contract của cả đợt (bộ sưu tập, 7 loại section, bố cục + khôi phục bản đăng trước, settings mới gồm dải thông báo, revalidate tag, đường dẫn API) và sửa các file hub. Nhờ vậy P2, P3, P4, P5 chạy song song, mỗi phase chỉ tạo file của mình.
- Chạy `ui-consistency:finding-patterns` trước mọi việc UI, mở rộng checklist cũ.
- Đo số "trước" của First Load JS `/` (trước khi P4 đổi trang chủ) để P7 so sánh.

## Key Insights
- Repo phải xanh khi P1 xong, dù API chưa điền trường mới. Vì vậy trường mới trên kiểu cũ đều **optional**:
  - `Outfit.collectionIds` (thiếu trong PUT = giữ nguyên, đúng vì `updateOutfit` dùng `$set: input`).
  - `PublicSettingsDto.{collectionsLabel, collectionsNavVisible, footer, announcement}`. Sáu file test web dựng fixture `PublicSettingsDto` (`home-page`, `look-page`, `looks-page`, `build-looks-metadata`, `build-outfit-metadata`, `settings-form`). Bắt buộc thì phải sửa test của P3/P4/P5 cùng lúc.
- `z.object` bỏ key lạ (comment ở `outfit-schemas.ts` cạnh `outfitUpdateSchema`). Field phụ editor gửi kèm (vd `data` của bản resolved) tự rơi khi API parse.
- `revalidateRequestSchema` hiện là union `{ paths }` | `{ scope: 'all' }`. Thêm `tags` dạng optional thì request `{ paths }` cũ vẫn hợp lệ, API compile không đổi.
- `serializeJsonLd` đã escape `<`, U+2028, U+2029 (`lib/seo/build-outfit-json-ld.ts:30-34`). P4 dùng lại cho FAQ.
- `slugifyVietnamese` có sẵn trong shared (P3 dùng tự sinh slug).
- Hai component trình bày dùng chung cho hai phase chạy song song nên đặt ở đây: `PublicSmartLink` (P4 CTA, P5 footer) và `CollectionCard*` (P3 trang `/collections`, P4 ô bộ sưu tập).

## Requirements
### Shared: schema section (`packages/shared/src/home-sections/`)
Mọi section có `props.id` (chuỗi 1–64) và `props.visible` (mặc định `true`). Số trong cột "Mặc định" là **giá trị mặc định**, admin sửa được từng section. Cột "Guard" là giới hạn kỹ thuật (chống payload lớn), ghi lý do trong code.

| `type` | Props riêng | Mặc định | Guard |
|---|---|---|---|
| `HeroSlider` | `label?` ≤60 (tên vùng cho trình đọc màn hình), `slides[]`: `image` (bắt buộc), `mobileImage?`, `alt` ≤160, `heading?` ≤80, `text?` ≤200, `ctaLabel?` ≤30, `ctaHref?`; `autoplaySeconds` | `autoplaySeconds` 6 (0 = tắt) | 1–10 slide; autoplay 0 hoặc 3–30 |
| `CollectionTiles` | `title` ≤60, `mode` `auto`/`manual`, `collectionIds[]`, `count`, `columnsDesktop`, `showViewAll` | "Bộ sưu tập", `auto`, 6, 3, `true` | ids ≤24, cột 2–6 |
| `OutfitList` | `title` ≤60, `source` `latest`/`collection`/`manual`, `collectionIds[]` (>1 = tab), `outfitIds[]`, `count?`, `display` `carousel`/`grid`, `columnsDesktop`, `excludeFeatured`, `showViewAll` | "Outfit mới", `latest`, `count` bỏ trống = `relatedOutfitsCount` của Cài đặt, `carousel`, 4, `false`, `true` | outfitIds ≤48, tab ≤6, cột 2–6 |
| `FeaturedLookbook` | `source` `featured`/`manual`, `outfitId?` | `featured` | — |
| `TextWithImage` | `heading` ≤80, `body` ≤2000 (văn bản thuần, đoạn tách bằng dòng trống), `image?`, `alt?` ≤160, `imagePosition` `left`/`right`, `ctaLabel?`, `ctaHref?` | `right` | — |
| `Faq` | `title` ≤60, `items[] { question ≤200, answer ≤1000 }` | "Câu hỏi thường gặp" | 1–30 mục |
| `Commitments` | `items[] { icon, title ≤40, text ≤120 }`, `icon` thuộc danh sách cho phép | — | 2–4 mục (brainstorm) |

- `count` phía shared chỉ `int ≥ 1`. Trần `PUBLIC_PAGE_SIZE_MAX` do API kiểm (giống `looksPageSize`).
- Ảnh: `sectionImageSchema = imageRefSchema.extend({ url: z.string().optional() })`. API bỏ `url` khi ghi, gắn lại khi đọc.
- Icon cam kết: enum key (`truck`, `shield-check`, `refresh-ccw`, `sparkles`, `heart`, `gift`, `tag`, `badge-check`, `package-check`, `headset`, `award`, `message-circle`). Đã kiểm có file icon tương ứng trong `lucide-react@1.70.0`. P4 map key → component.
- `homeSectionSchema` = `z.discriminatedUnion('type', [...])`. `homeLayoutContentSchema` = mảng ≤ `MAX_HOME_SECTIONS` (40, guard), `props.id` không trùng.
- `HOME_SECTION_DEFAULTS[type]`: props mặc định khi editor (P6) thêm khối mới.
- `HOME_SECTION_META[type]`: `{ label, description }` tiếng Việt cho hộp chọn "+ Thêm section" (nhãn hiển thị, nằm cạnh schema để thêm loại mới chỉ sửa một chỗ).
- `DEFAULT_HOME_CONTENT` (id cố định):
  1. `FeaturedLookbook` `featured`;
  2. `OutfitList` "Outfit khác", `latest`, `grid`, không đặt `count`, `excludeFeatured: true`;
  3. `CollectionTiles` `auto`.

  Khớp trang chủ hiện tại (`app/(public)/page.tsx:22-45`). Ô bộ sưu tập tự ẩn khi chưa có bộ sưu tập nào.

### Shared: link an toàn, id
- `safeHrefSchema`: đường dẫn nội bộ (bắt đầu `/`, không `//`, không `\`, không khoảng trắng hay ký tự điều khiển) hoặc URL tuyệt đối `http:`/`https:`. Tối đa 2048. Hàm `isInternalHref`.
- `externalHttpUrlSchema` (chỉ `http(s)`, cho mạng xã hội). `objectIdSchema` (24 hex).

### Shared: bộ sưu tập (`collection-schemas.ts`, `collection-contract.ts`)
- Input: `slug` (dùng `slugSchema`, cấm `slugs` vì trùng route), `name` 1–80, `description?` ≤500, `coverImage?` (ImageRef), `status`, `seoDescription?` ≤300. Bộ sưu tập `published` bắt buộc có `coverImage` (refine, giống luật publish của outfit). `order` do server quản lý.
- `adminCollectionListQuerySchema` (`q`, `status`, `page`, `size`, giống outfit). `collectionMoveRequestSchema { direction: 'up' | 'down' }`. `collectionOutfitsRequestSchema { outfitIds: objectId[] 1–48 }`.
- DTO:
  - `AdminCollectionListItemDto`: `id`, `slug`, `name`, `status`, `order`, `outfitCount`, `coverImageUrl | null`, `updatedAt`.
  - `AdminCollectionDto`: như input, kèm `id`, `order`, ảnh có `url`, `usage { outfitCount, usedInDraft, usedInPublished }`.
  - `PublicCollectionCardDto`: `slug`, `name`, `description?`, `coverImage: ImageWithUrl`.
  - `PublicCollectionPageResponse`: `{ collection, outfits: Paginated<PublicOutfitCardDto> }`.
  - `CollectionSlugsResponse`.
- Hằng: `DEFAULT_COLLECTIONS_LABEL = 'Bộ sưu tập'` (mặc định, Cài đặt ghi đè được).

### Shared: bố cục (`home-layout-contract.ts`)
- `saveHomeDraftRequestSchema { content, baseUpdatedAt: string | null }`. `previewHomeRequestSchema { content }`.
- `HomePreviousInfo = { publishedAt: string | null } | null`: `null` = không có gì để hoàn tác; `publishedAt: null` = bản trước là bố cục mặc định (lần đăng đầu tiên vẫn hoàn tác được).
- `publishHomeRequestSchema { baseUpdatedAt: string | null }` (khoá theo bản nháp). `PublishHomeResponse { publishedAt: string, previous: HomePreviousInfo }`.
- `restorePreviousHomeRequestSchema { basePublishedAt: string | null }` (khoá theo lần đăng hiện tại, key bắt buộc). `RestorePreviousHomeResponse { publishedAt: string | null, previous: HomePreviousInfo }`.
- `AdminHomeLayoutDto`: `draft` (ảnh có `url`), `draftUpdatedAt`, `publishedAt`, `previous: HomePreviousInfo`, `hasUnpublishedChanges`, `usingDefault`.
- Không lưu thông tin editor (bỏ Puck). Giữ `HOME_LAYOUT_SCHEMA_VERSION` để migrate sau này.
- `ResolvedHomeSection` (union theo `type`): `props` (ảnh có `url`) + `data`:
  - `CollectionTiles`: `{ items: PublicCollectionCardDto[] }`;
  - `OutfitList`: `{ tabs: { key, label?, href?, items: PublicOutfitCardDto[] }[] }`;
  - `FeaturedLookbook`: `{ outfit: PublicOutfitDto }`;
  - loại khác không có `data`.
- `PublicHomeResponse { source: 'published' | 'default', sections }`: chỉ chứa section hiện và có dữ liệu.

### Shared: sửa file cũ
- `outfit-schemas.ts`: `collectionIds: z.array(objectIdSchema).max(24).optional()`, không trùng phần tử.
- `settings-schemas.ts`:
  - input thêm `collectionsNavEnabled?`, `collectionsLabel?` 1–40, `footer?`, `announcement?`. `footer` gồm `columns` ≤4 (mỗi cột `title` ≤40, `links` ≤8 dạng `{ label ≤40, href: safeHref }`) và `social` ≤8 dạng `{ label ≤30, href: externalHttpUrl }`.
  - `announcement` (dải thông báo toàn site, không phải section trang chủ): `{ enabled, text, linkLabel?, href? }`. `text` ≤160, `linkLabel` ≤40, `href: safeHref`. Refine: `enabled = true` thì `text` 1–160 bắt buộc; có `linkLabel` thì phải có `href`. Mặc định `DEFAULT_ANNOUNCEMENT = { enabled: false, text: '' }`.
  - admin DTO trả các trường này (thiếu trong DB → mặc định).
  - public thêm `collectionsLabel?`, `collectionsNavVisible?`, `footer?`, `announcement?: { text, linkLabel?, href? } | null` (optional, xem Key Insights; `null` khi tắt hoặc rỗng).
- `api-contract.ts`:
  - `API_PATHS.public`: `collections`, `collectionSlugs`, `collectionBySlug`, `home`.
  - `API_PATHS.admin`: `collections`, `collectionById`, `collectionMove`, `collectionOutfits`, `collectionOutfit`, `home`, `homeDraft`, `homePublish`, `homeRestorePrevious` (`/api/admin/home/restore-previous`), `homePreview`, `homeRevertDraft`, `homeReset`.
  - `apiUrl` tương ứng.
  - `adminOutfitListQuerySchema.collectionId?: objectId`.
- `revalidate-contract.ts`:
  - `PUBLIC_CACHE_TAGS = { settings: 'public-settings', collections: 'public-collections', home: 'public-home' }`, giữ `PUBLIC_SETTINGS_CACHE_TAG`.
  - `COLLECTIONS_PAGE_PATH = '/collections'`.
  - Schema: `{ paths?: (≤50), tags?: enum[] (≤3) }`, ít nhất một mảng không rỗng, hoặc `{ scope: 'all' }`.
- `index.ts` export file mới. Fixtures: `sample-collections.ts`, `sample-home-sections.ts` (đủ 7 loại, có bản resolved), `sample-announcement.ts` cho test web P3/P4/P6.

### Web: file hub
- `app/api/revalidate/route.ts`: `tags` → `revalidateTag(tag, { expire: 0 })`. `scope: 'all'` expire **mọi** tag trong `PUBLIC_CACHE_TAGS` + `revalidatePath('/', 'layout')`.
- `lib/seo/public-data-loaders.ts`: export `safetyRevalidate`, `nullOnNotFound` để loader mới của P3/P4 dùng lại.
- `lib/admin-paths.ts`: `collections`, `collectionNew`, `collectionEdit(id)`, `home`, `homePreview` (`/admin/home-preview`, nằm ngoài `(protected)`, xem P6).
- Token: `--toast-action-duration` (mặc định 10000ms, toast có nút "Hoàn tác" ở lại lâu hơn `--toast-duration` 4000ms) cùng token còn thiếu theo checklist (khoảng cách section, gap rail, kích thước nút rail/slider, cột footer, dải thông báo, chiều rộng ảo khung xem trước editor...) vào `client-theme-tokens.css` / `design-tokens.css`. Vùng chạm 44px dùng `--admin-control-height` có sẵn (`design-tokens.css:102`), không thêm token. Không phase nào khác sửa 3 file token. Cần token mới thì báo lead.
- `components/public/public-smart-link.tsx`: link nội bộ → `next/link`, link ngoài → `<a rel="noopener noreferrer">`. Nhận `href` đã qua `safeHrefSchema`.
- `components/public/collection-card.tsx`, `collection-card.module.css`, `collection-card-image-sizes.ts`, `collection-card-grid.tsx`: thẻ ảnh bìa + tên. Grid nhận `columnsDesktop` (CSS var), `headingLevel`, `highPriorityFirstRow` (cùng API với `OutfitCardGrid`).

### Non-functional
- Không đổi hành vi API. File < 200 dòng (tách file theo loại section). Comment tiếng Anh, chỉ khi cần giải thích lý do.

## Architecture
```
packages/shared  ──(types + zod)──> apps/api (P2: validate, resolve)
                 └───────────────> apps/web (P3/P4/P5/P6: render, form, editor)
DEFAULT_HOME_CONTENT, HOME_SECTION_DEFAULTS: một nguồn cho API (bố cục mặc định) và editor (khối mới)
revalidate: API gửi { paths?, tags? } | { scope:'all' } -> web route -> revalidatePath / revalidateTag
```

## Related Code Files
- Create:
  - `packages/shared/src/`:
    - `safe-href.ts`, `safe-href.test.ts`, `object-id-schema.ts`
    - `collection-schemas.ts`, `collection-contract.ts`, `collection-schemas.test.ts`
    - `home-layout-contract.ts`
    - `home-sections/`: `section-common-schemas.ts`, `hero-slider-section.ts`, `collection-tiles-section.ts`, `outfit-list-section.ts`, `featured-lookbook-section.ts`, `text-with-image-section.ts`, `faq-section.ts`, `commitments-section.ts`, `home-section-union.ts`, `home-section-defaults.ts`, `home-section-meta.ts`, `default-home-content.ts`, `index.ts`, `home-section-schemas.test.ts`
    - `fixtures/sample-collections.ts`, `fixtures/sample-home-sections.ts`, `fixtures/sample-announcement.ts`
  - `scripts/perf/measure-first-load-js.mjs` (Playwright mở URL, cộng `encodedBodySize` của mọi script; tuỳ chọn `--grep <chuỗi>` báo chunk chứa chuỗi). Next 16 không in First Load JS nên phải đo kiểu này.
  - Plan dir: `perf-baseline-first-load-js.md` (số "trước" của `/`, `/looks`)
  - `apps/web/src/components/public/`: `public-smart-link.tsx`, `collection-card.tsx`, `collection-card.module.css`, `collection-card-image-sizes.ts`, `collection-card-grid.tsx`
  - `apps/web/test/public/public-smart-link.test.tsx`, `apps/web/test/public/collection-card-grid.test.tsx`
  - Plan dir: `ui-consistency-checklist.md`
- Modify:
  - `packages/shared/src/`: `outfit-schemas.ts`, `outfit-schemas.test.ts`, `settings-schemas.ts`, `settings-schemas.test.ts`, `api-contract.ts`, `revalidate-contract.ts`, `index.ts`, `fixtures/index.ts`
  - `apps/web/src/app/api/revalidate/route.ts`, `apps/web/test/public/revalidate-route.test.ts`
  - `apps/web/src/lib/seo/public-data-loaders.ts`, `apps/web/src/lib/admin-paths.ts`
  - `apps/web/src/styles/`: `client-theme-tokens.css`, `design-tokens.css`, `admin-theme-tokens.css` (chỉ khi checklist cần)
- Delete: không

## Implementation Steps
1. Chạy `ui-consistency:finding-patterns`. Phạm vi (bound) là `apps/web`, lấy phần A/B của checklist cũ làm nền.
   - Thêm phần C: section trang chủ, tham chiếu `/looks` + `RelatedOutfitsSection`. Gồm holder section, heading (một `h1` ẩn của trang, section `h2`), rail ngang, slider, tab radio, FAQ `details`, link "Xem tất cả" (pill), ảnh (eager/lazy).
   - Thêm phần D: `/collections`, `/collections/[slug]`, tham chiếu `/looks`, `/look/[slug]`.
   - Thêm phần E: admin danh sách/form bộ sưu tập + picker, tham chiếu `/admin/outfits` + Cài đặt.
   - Thêm phần F: editor trang chủ (danh sách thẻ section, form, khung xem trước, nút chuyển "Chỉnh sửa ⇄ Xem trước" trên mobile, toast có nút hành động) + form footer và dải thông báo trong Cài đặt + dải thông báo trên header public.
   - Ghi "Chữ mới cần duyệt" và danh sách token còn thiếu. Lưu `ui-consistency-checklist.md` trong plan dir này, dẫn link sang file cũ, không chép lại phần A/B.
2. Viết `safe-href.ts`, `object-id-schema.ts` + test (từ chối `javascript:`, `data:`, `//evil.example`, `/\evil`, khoảng trắng; nhận `/looks`, `/collections/ao-thun?page=2`, `https://shopee.vn/...`).
3. Viết schema 7 section, union, defaults, meta, `DEFAULT_HOME_CONTENT`. Test:
   - mặc định parse được;
   - mỗi loại từ chối href xấu và vượt guard;
   - key lạ bị bỏ;
   - id trùng bị từ chối;
   - `count` thiếu được chấp nhận.
4. Viết contract bộ sưu tập + bố cục (gồm publish/restore) + test (publish thiếu ảnh bìa → lỗi tại `coverImage`; slug `slugs` → lỗi; restore thiếu `basePublishedAt` → lỗi).
   - Test `announcement`: bật mà `text` rỗng → lỗi tại `announcement.text`; `href` `javascript:` → lỗi; tắt + rỗng → hợp lệ.
5. Sửa `outfit-schemas.ts`, `settings-schemas.ts`, `api-contract.ts`, `revalidate-contract.ts`, `index.ts`, fixtures. Chạy `pnpm --filter @under30ss/shared build`.
6. Web hub: route revalidate (+ test: tags, scope all expire 3 tag, tag lạ → 400), export helper loader, `ADMIN_PATHS`.
7. Token theo checklist. `PublicSmartLink`, `CollectionCard*` + test (link ngoài có `rel`, grid đổi số cột qua prop, `firstRow` eager).
8. Viết `scripts/perf/measure-first-load-js.mjs`. `pnpm --filter @under30ss/web build` + `next start` cổng 3100, đo `/`, `/looks` ba lần, ghi trung vị vào `perf-baseline-first-load-js.md`.
9. `pnpm lint && pnpm typecheck && pnpm test`, spec visual. Không commit (commit một lần cuối đợt, khi chủ repo yêu cầu).

## Todo List
- [x] Checklist UI (C, D, E, F) + danh sách token, chữ mới
- [x] safe-href, object-id + test
- [x] 7 schema section + defaults + meta + bố cục mặc định + test
- [x] Contract bộ sưu tập + bố cục (publish, restore) + announcement + test
- [x] Sửa outfit/settings/api/revalidate contract, index, fixtures, build shared
- [x] Route revalidate + test, helper loader, ADMIN_PATHS
- [x] Token, PublicSmartLink, CollectionCard* + test
- [x] Script đo First Load JS + số "trước"
- [x] lint, typecheck, test, visual xanh

## Success Criteria
- `pnpm typecheck` xanh trên cả 3 workspace mà không sửa file nào của `apps/api` (chứng minh trường mới không phá API).
- Test shared mới pass (≥ 25 case, gồm mọi href xấu ở bước 2). Test cũ không đổi kết quả.
- `POST /api/revalidate` với `{ "tags": ["public-home"] }` → 200. Với `{ "tags": ["x"] }` → 400 (test).
- Checklist có đủ phần C–F, mỗi dòng có `file:line` và mức quyết định.
- `perf-baseline-first-load-js.md` có số encoded KB của `/` và `/looks` (trung vị 3 lần đo).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Contract phải đổi khi P2–P6 làm | Trung bình × Trung bình | Chỉ chủ P1 sửa. Phase cần đổi báo lead, lead sửa và báo mọi phase đang chạy. Thêm field optional trước, không đổi tên |
| Guard quá chặt với nội dung thật | Thấp × Thấp | Guard là hằng có tên trong shared, nới ở một chỗ |
| `discriminatedUnion` + `superRefine` của zod 4 sinh đường dẫn lỗi khó map | Thấp × Trung bình | Test in `issue.path` cho từng loại. P6 map theo `content.{i}.props.{field}` |

## Security Considerations
- `safeHrefSchema` là lớp chặn `javascript:`/`data:`/protocol-relative cho mọi link section và footer. API (P2) parse lại, không tin client.
- Không có HTML thô: `body`, `answer` là văn bản thuần. Renderer tách đoạn, React tự escape.
- Tag revalidate chỉ nhận giá trị trong enum, nên không expire được tag tuỳ ý.

## Rollback
- Thay đổi chỉ thêm, trường mới optional. Hoàn tác bằng git: xoá file mới, `git restore` file đã sửa theo ma trận sở hữu. P2–P6 phụ thuộc nên phải hoàn tác theo thứ tự ngược (P7 → P1).

## Next Steps
- Mở P2, P3, P4, P5 song song. Gửi đường dẫn checklist cho P3, P4, P5, P6.
