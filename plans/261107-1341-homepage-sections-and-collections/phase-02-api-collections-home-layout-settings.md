# Phase 2: API bộ sưu tập, bố cục trang chủ, settings

## Context Links
- Contract: phase 1 (`collection-*`, `home-sections/*`, `home-layout-contract.ts`, `settings-schemas.ts`, `revalidate-contract.ts`).
- Code đã đọc: `apps/api/src/create-app.ts`, `db/mongo-connection.ts` (`ensureOutfitIndexes`), `models/{outfit,settings}-model.ts`, `services/{outfit-service,outfit-mapper,public-outfit-service,settings-service,revalidate-web-service}.ts`, `routes/{admin-outfit,public-outfit,admin-settings,admin-media}-routes.ts`, `lib/{app-context,runtime-defaults}.ts`, `apps/api/test/helpers/test-app.ts` (`RevalidateHit`).
- `docs/system-architecture.md` mục "Luồng revalidate", "Bất biến featured". `docs/code-standards.md` mục "Phân lớp".

## Overview
- Priority: P1. Status: Completed (2026-11-07). Effort: 17h. Chờ P1. Chạy song song P3, P4, P5 (các phase đó code theo contract, đóng sau khi P2 xong).
- Một phase backend duy nhất vì `create-app.ts`, `mongo-connection.ts`, `revalidate-web-service.ts`, `settings-service.ts` đều bị cả hai tính năng đụng. Resolver trang chủ cũng cần model bộ sưu tập.

## Key Insights
- Luồng: route chỉ parse + gọi service, service là nơi duy nhất đụng model, dependency tiêm qua `AppContext` (`docs/code-standards.md`).
- Index build lúc khởi động và lỗi thì dừng API: mở rộng `ensureOutfitIndexes` thành `ensureContentIndexes` (Outfit, Collection, PageLayout). `connectMongo` gọi `init()` cho 2 model mới.
- `updateOutfit` dùng `$set: input` (`outfit-service.ts`): PUT không gửi `collectionIds` thì giữ nguyên. Gửi thì phải kiểm mọi id tồn tại (400 `fields.collectionIds`).
- Gán/gỡ từ phía bộ sưu tập dùng `$addToSet` / `$pull`, ghi nguyên tử. Rủi ro còn lại: editor outfit đang mở gửi PUT có `collectionIds` cũ sẽ ghi đè (xem Risk).
- Xoá bộ sưu tập: `updateMany({ collectionIds: id }, { $pull })`. Section đang tham chiếu id này không bị sửa; resolver bỏ qua id không còn.
- Thứ tự bộ sưu tập: tạo mới thì `order = max + 1`. Lệnh `move` đổi chỗ với bộ sưu tập liền kề theo `(order, _id)`.
- Bố cục: một document `pageKey: 'home'`.
  - Lưu nháp và đăng kiểm `baseUpdatedAt` (optimistic lock theo `draftUpdatedAt`) → lệch thì 409 `CONFLICT`.
  - Đăng giữ lại đúng một bản đăng trước: `previous = { published, publishedAt }` của lúc trước khi đăng (`published: null` = đang dùng bố cục mặc định, nên lần đăng đầu cũng hoàn tác được). Không lưu lịch sử dài (YAGNI). Nhờ vậy UI không cần hộp xác nhận, chỉ cần toast "Hoàn tác".
  - Khôi phục bản trước kiểm `basePublishedAt` (lock theo `publishedAt` hiện tại, `null` khớp `null`) → lệch thì 409. Hoán đổi bản đăng hiện tại ↔ `previous`, **không đụng bản nháp** (editor thấy "Có thay đổi chưa đăng" nếu nháp khác bản vừa khôi phục). Bấm "Hoàn tác" hai lần = quay lại bản vừa đăng, không mất dữ liệu. `publishedAt` sau khôi phục = mốc của bản được khôi phục (`null` nếu là mặc định), để khoá lần sau vẫn khớp DTO.
  - Reset cũng lưu bản đăng hiện tại vào `previous` (khôi phục được), nhưng UI vẫn hỏi xác nhận vì reset xoá bản nháp.
  - Nội dung lưu dạng Mixed, chỉ ghi sau khi zod parse.
  - Khi đọc, `safeParse` từng section: section hỏng bị bỏ + `console.warn`, nên schema đổi về sau không làm sập trang chủ.
- Resolver chạy `Promise.all` theo section, chỉ đọc dữ liệu `published`:
  - Danh sách chọn tay giữ thứ tự đã chọn.
  - `count` bỏ trống thì lấy `relatedOutfitsCount` (`getListingSettings`), luôn kẹp `PUBLIC_PAGE_SIZE_MAX`.
  - `excludeFeatured`: lấy `count + 1` rồi lọc, giống `getRelatedOutfits` phía web.
- `getFeaturedOutfit(env)` và `toPublicOutfitDto` có sẵn (`public-outfit-service.ts`). Thêm `getPublishedOutfitById`.
- Settings `PUT` thay cả document. Khoá optional thiếu bị `$unset` (`settings-service.ts`, vòng `OPTIONAL_KEYS`). Thêm khoá mới vào danh sách này. e2e support gửi lại đủ khoá: việc của P7.

## Requirements
### Endpoint
| Phương thức, đường dẫn | Quyền | Nội dung |
|---|---|---|
| `GET /api/admin/collections?q&status&page&size` | admin | `Paginated<AdminCollectionListItemDto>`, sort `order, _id`. `outfitCount` đếm bằng aggregate theo id của trang |
| `POST /api/admin/collections` | admin | Tạo. Slug trùng → 409 `fields.slug` |
| `GET /api/admin/collections/:id` | admin | `AdminCollectionDto` kèm `usage` (số outfit, có trong nháp/bản đăng trang chủ không) |
| `PUT /api/admin/collections/:id` | admin | Sửa. Đổi slug thì revalidate cả slug cũ |
| `DELETE /api/admin/collections/:id` | admin | Xoá + `$pull` khỏi outfit |
| `POST /api/admin/collections/:id/move` | admin | `{ direction }`. Ở đầu/cuối thì 200 không đổi |
| `POST /api/admin/collections/:id/outfits` | admin | `{ outfitIds }` → `$addToSet`. Id không tồn tại → 400 |
| `DELETE /api/admin/collections/:id/outfits/:outfitId` | admin | `$pull` |
| `GET /api/admin/outfits?collectionId=` | admin | Bộ lọc mới cho danh sách sẵn có |
| `GET /api/public/collections?page&size` | công khai | `Paginated<PublicCollectionCardDto>`, chỉ `published`. `size` mặc định `looksPageSize`, kẹp `PUBLIC_PAGE_SIZE_MAX` |
| `GET /api/public/collections/slugs` | công khai | Cho sitemap. Khai báo trước `/:slug` |
| `GET /api/public/collections/:slug?page&size` | công khai | `PublicCollectionPageResponse`. Outfit `published` có `collectionIds` chứa id, sort `updatedAt, _id` giảm dần. Không có hoặc nháp → 404 |
| `GET /api/admin/home` | admin | `AdminHomeLayoutDto`. Chưa có document → nháp = `DEFAULT_HOME_CONTENT`, `usingDefault: true` |
| `PUT /api/admin/home/draft` | admin | `saveHomeDraftRequestSchema`, kiểm giới hạn, lock theo `baseUpdatedAt` |
| `POST /api/admin/home/publish` | admin | `publishHomeRequestSchema`, lock theo `baseUpdatedAt`. `previous = { published, publishedAt }`, `published = draft`, `publishedAt = now`. Trả `PublishHomeResponse` |
| `POST /api/admin/home/restore-previous` | admin | `restorePreviousHomeRequestSchema`, lock theo `basePublishedAt`. `previous = null` → 409 `NO_PREVIOUS` (thông báo tiếng Việt). Hoán đổi bản đăng ↔ `previous`. Trả `RestorePreviousHomeResponse` |
| `POST /api/admin/home/revert-draft` | admin | `draft = published` (chưa có bản đăng thì = mặc định) |
| `POST /api/admin/home/reset` | admin | `previous = { published, publishedAt }` (khi đang có bản đăng), `published = null`, `publishedAt = null`, `draft = mặc định` |
| `GET /api/admin/home/preview` | admin | Resolve bản nháp đã lưu → `PublicHomeResponse` (trang Xem trước) |
| `POST /api/admin/home/preview` | admin | Resolve `content` gửi lên (khung xem trước của editor), không lưu. Giới hạn body như lưu nháp |
| `GET /api/public/home` | công khai | Resolve bản đăng, không có thì bố cục mặc định. Không bao giờ lộ bản nháp |

### Kiểm khi ghi bố cục (`home-layout-guards.ts`)
- `count` ≤ `PUBLIC_PAGE_SIZE_MAX` → 400, `fields["content.3.props.count"] = "Tối đa N"` (giống `assertWithinCeiling` của settings).
- Mọi key ảnh bắt đầu `public/` (`isPublicKey`).
- `url` của ảnh bị bỏ trước khi lưu.
- `schemaVersion = HOME_LAYOUT_SCHEMA_VERSION` (shared, hiện là 1).

### Settings
- Model thêm `collectionsNavEnabled`, `collectionsLabel`, `footer`, `announcement`. Admin DTO trả giá trị đã lưu (thiếu → `DEFAULT_ANNOUNCEMENT`).
- Public:
  - `collectionsLabel` = đã lưu, không có thì `DEFAULT_COLLECTIONS_LABEL`;
  - `collectionsNavVisible` = `(collectionsNavEnabled ?? true)` và có ít nhất 1 bộ sưu tập `published`. Mặc định bật;
  - `footer` = đã lưu, không có thì `{ columns: [], social: [] }`;
  - `announcement` = `{ text, linkLabel?, href? }` khi `enabled` và `text` không rỗng, ngược lại `null`.
- `updateSettings`: footer và announcement qua zod, link đã an toàn. Thêm 4 khoá vào `OPTIONAL_KEYS`. Dải thông báo hiện trên mọi trang public nên dùng revalidate `scope: 'all'` sẵn có.

### Revalidate
| Sự kiện | Gửi tới web |
|---|---|
| Tạo/sửa/xoá/đặt nổi bật outfit | `paths: outfitPaths(...)` + `tags: [collections, home]` |
| Mọi thao tác ghi bộ sưu tập (tạo, sửa, xoá, move, gán, gỡ) | `paths: ['/', '/collections', '/collections/<slug>' (+ slug cũ), '/sitemap.xml']` + `tags: [collections, home, settings]` (settings vì `collectionsNavVisible` phụ thuộc số bộ sưu tập đã đăng) |
| Đăng / khôi phục bản trước / reset bố cục | `paths: ['/']` + `tags: [home]` |
| Lưu nháp, bỏ thay đổi nháp, preview | Không gửi (không đổi trang public) |
| Lưu settings | `{ scope: 'all' }` (giữ nguyên, nay expire mọi tag) |

- `Revalidate` trong `app-context.ts` nhận `string[] | RevalidateRequest`. `createRevalidator` dedupe paths, cắt `MAX_PATHS`.

### Non-functional
- Không migration: field mới optional, collection mới tự tạo. File < 200 dòng. Test supertest + mongodb-memory-server thật, không mock.
- `GET /api/public/home` với bố cục 12 section (4 section có dữ liệu): đo thời gian phản hồi local, ghi số vào báo cáo phase. Mục tiêu tham khảo ≤ 200 ms trên máy dev.

## Architecture
```
PUT /api/admin/home/draft
  validateBody(saveHomeDraftRequestSchema)
  -> assertHomeLayoutLimits(content, env)          (count ceiling, public keys, strip url)
  -> PageLayoutModel.findOneAndUpdate({ pageKey:'home', draftUpdatedAt: base }, { draft, draftUpdatedAt: now })
     null -> 409 CONFLICT (base lệch) | duplicate key lúc tạo -> 409
POST /api/admin/home/publish { baseUpdatedAt }
  -> findOneAndUpdate({ pageKey:'home', draftUpdatedAt: base },
       [ { $set: { previous: { published: '$published', publishedAt: '$publishedAt' },
                   published: '$draft', publishedAt: now } } ])   (pipeline update, một lệnh nguyên tử)
     null -> 409 | ok -> revalidate { paths:['/'], tags:[home] } -> { publishedAt, previous: { publishedAt } }
POST /api/admin/home/restore-previous { basePublishedAt }
  -> findOneAndUpdate({ pageKey:'home', publishedAt: base, previous: { $ne: null } },
       [ { $set: { published: '$previous.published', publishedAt: '$previous.publishedAt',
                   previous: { published: '$published', publishedAt: '$publishedAt' } } } ])
     null -> phân biệt 409 NO_PREVIOUS / 409 CONFLICT bằng một lần đọc | ok -> revalidate như publish
GET /api/public/home
  layout = PageLayoutModel.findOne({ pageKey:'home' }).lean()
  content = layout?.published?.content ?? DEFAULT_HOME_CONTENT  -> safeParse từng section
  resolveHomeSections(content.filter(visible), env)
     CollectionTiles -> CollectionModel published (auto: sort order limit count | manual: $in ids, giữ thứ tự)
     OutfitList      -> latest | theo từng collection (tab: label=name, href=/collections/slug) | manual
     FeaturedLookbook-> getFeaturedOutfit | getPublishedOutfitById
     loại khác       -> chỉ gắn url ảnh
  -> bỏ section rỗng -> { source, sections }
```
Index mới:

| Index | Mục đích |
|---|---|
| `collections { slug: 1 }` unique | Trùng slug → 409 |
| `collections { status: 1, order: 1, _id: 1 }` | Danh sách public và tile `auto` |
| `outfits { collectionIds: 1, status: 1, updatedAt: -1, _id: -1 }` | Trang bộ sưu tập, tab băng chuyền |
| `page_layouts { pageKey: 1 }` unique | Một bố cục cho mỗi trang |

## Related Code Files
- Create:
  - `apps/api/src/models/collection-model.ts`, `page-layout-model.ts`
  - `apps/api/src/services/`: `collection-service.ts`, `collection-mapper.ts`, `collection-membership-service.ts` (gán, gỡ, move, đếm), `public-collection-service.ts`, `home-layout-service.ts`, `home-layout-publish-service.ts`, `home-layout-guards.ts`, `home-section-resolver-service.ts`, `home-section-image-mapper.ts`, `settings-chrome-service.ts` (footer, nav bộ sưu tập, dải thông báo)
  - `apps/api/src/routes/`: `admin-collection-routes.ts`, `public-collection-routes.ts`, `admin-home-routes.ts`, `public-home-routes.ts`
  - `apps/api/test/`: `collections-admin-crud.test.ts`, `collections-membership-and-order.test.ts`, `collections-public.test.ts`, `outfit-collection-ids.test.ts`, `home-layout-admin.test.ts`, `home-layout-publish-restore.test.ts`, `home-layout-public-resolve.test.ts`, `settings-chrome-fields.test.ts`
- Modify:
  - `apps/api/src/models/outfit-model.ts`, `models/settings-model.ts`, `db/mongo-connection.ts`, `lib/app-context.ts`
  - `apps/api/src/services/outfit-mapper.ts`, `outfit-service.ts`, `public-outfit-service.ts` (`getPublishedOutfitById`), `revalidate-web-service.ts`, `settings-service.ts`
  - `apps/api/src/routes/admin-outfit-routes.ts`, `apps/api/src/create-app.ts`
  - `apps/api/test/helpers/test-app.ts` (`RevalidateHit.tags`), `apps/api/test/outfits-public-and-revalidation.test.ts`
- Delete: không

## Implementation Steps
1. Model `Collection` (slug, name, description, coverImage, status, order, seoDescription, timestamps) và `PageLayout` (`pageKey`, `draft { content }`, `draftUpdatedAt`, `published { content } | null`, `publishedAt`, `previous { published { content } | null, publishedAt } | null`, `schemaVersion`, `updatedBy`). Outfit thêm `collectionIds: [ObjectId]` + index. `ensureContentIndexes` giữ thông báo lỗi rõ ràng như hiện tại.
2. `collection-mapper.ts` + `collection-service.ts`: CRUD, kiểm key ảnh `public/`, luật publish cần ảnh bìa (zod đã kiểm, API kiểm lại khi ghép dữ liệu cũ), `usage` (đếm outfit, quét `draft`/`published` của bố cục tìm id).
3. `collection-membership-service.ts`: gán/gỡ (kiểm outfit tồn tại), move, đếm `outfitCount` cho một trang id.
4. Outfit: mapper xuất `collectionIds`; service kiểm id tồn tại khi có; `listAdminOutfits` thêm lọc `collectionId`. `admin-outfit-routes.ts` gửi thêm tag.
5. `public-collection-service.ts` + routes public (`/slugs` trước `/:slug`).
6. `home-layout-guards.ts`, `home-section-image-mapper.ts` (bỏ/gắn `url` cho `HeroSlider.slides[].image|mobileImage`, `TextWithImage.image`), `home-layout-service.ts` (get, saveDraft, revertDraft, preview) + `home-layout-publish-service.ts` (publish, restorePrevious, reset; tách để file < 200 dòng).
7. `home-section-resolver-service.ts`: mỗi loại một hàm nhỏ, `Promise.all`, bỏ section rỗng. Tách file theo loại nếu > 200 dòng.
8. Routes admin home + public home. `create-app.ts` gắn `admin.use('/collections', ...)`, `admin.use('/home', ...)`, `api.use('/public', ...)` cho 2 router public mới (cùng tiền tố `/api/public`).
9. Settings: model, `settings-chrome-service.ts` (tính `collectionsNavVisible`, `announcement` public, mặc định), `settings-service.ts` gọi sang, thêm `OPTIONAL_KEYS`.
10. Revalidate: `app-context.ts`, `revalidate-web-service.ts` (thêm hàm `collectionPaths`, `withTags`), test helper ghi nhận `tags`.
11. Test (dữ liệu thật trong mongodb-memory-server):
    - `collections-admin-crud`: 401 khi chưa đăng nhập; tạo, sửa, đổi slug, xoá; slug trùng → 409; publish thiếu ảnh bìa → 400 `fields.coverImage`; key ảnh ngoài `public/` → 400.
    - `collections-membership-and-order`: gán/gỡ, id lạ → 400, move đầu/cuối, `outfitCount` đúng, xoá bộ sưu tập thì outfit hết tham chiếu.
    - `collections-public`: chỉ `published`, phân trang + `total`, `size` kẹp trần, slug nháp → 404, outfit nháp trong bộ sưu tập bị ẩn, `/slugs`.
    - `outfit-collection-ids`: PUT có/không `collectionIds`, id lạ → 400, lọc `collectionId` ở list admin.
    - `home-layout-admin`: nháp mặc định khi chưa có; lưu → đọc lại; `baseUpdatedAt` lệch → 409; `javascript:` → 400 kèm đường dẫn field; `count` vượt trần → 400; revert; key lạ bị bỏ; 401 cho mọi route khi chưa đăng nhập.
    - `home-layout-publish-restore`: chưa đăng lần nào → restore 409 `NO_PREVIOUS`; publish lần đầu → `previous: { publishedAt: null }`, restore → `/api/public/home` về `source: 'default'`; publish 2 lần → restore trả bản 1 và nháp không đổi; restore 2 lần → về bản 2; `basePublishedAt` cũ → 409; publish với `baseUpdatedAt` lệch → 409; reset → restore được; mỗi publish/restore/reset có revalidate hit `paths ['/']` + `tags ['public-home']`; `GET /api/public/home` phản ánh bản sau restore.
    - `home-layout-public-resolve`: chưa đăng → `source: 'default'`; section ẩn/rỗng bị bỏ; thứ tự chọn tay giữ nguyên; `excludeFeatured`; tab theo bộ sưu tập + `href`; id đã xoá bị bỏ qua; section hỏng trong DB bị bỏ, phần còn lại vẫn render; không lộ nháp.
    - `settings-chrome-fields`: footer lưu/đọc, link xấu → 400, `collectionsNavVisible` đổi khi đăng bộ sưu tập đầu tiên; `announcement` bật/tắt → public trả object/`null`, `href` `javascript:` → 400 `fields["announcement.href"]`, PUT không gửi `announcement` → về mặc định (đúng hành vi thay cả document).
    - Sửa `outfits-public-and-revalidation.test.ts` theo body mới.
12. `pnpm lint && pnpm typecheck && pnpm test`. Đo thời gian `GET /api/public/home`. Không commit (commit một lần cuối đợt, khi chủ repo yêu cầu).

## Todo List
- [x] Model + index + `ensureContentIndexes`
- [x] Bộ sưu tập: CRUD, membership, move, public + test
- [x] Outfit `collectionIds` + lọc + test
- [x] Bố cục: guard, ảnh, service, resolver, routes + test
- [x] Publish giữ bản trước, restore-previous, reset lưu bản trước + test
- [x] Settings footer/nav/dải thông báo + test
- [x] Revalidate tags + sửa test cũ
- [x] lint, typecheck, test xanh; đo `GET /api/public/home`

## Success Criteria
- Toàn bộ test API cũ (102 tính tới 2026-11-07) vẫn pass, cộng ≥ 40 test mới.
- `curl $API/api/public/home` khi DB trống → `source: "default"`, không lỗi.
- `PUT /api/admin/home/draft` với `ctaHref: "javascript:alert(1)"` → 400 `VALIDATION_ERROR`, có `fields` chỉ đúng section.
- Hai lần lưu với cùng `baseUpdatedAt` → lần hai 409.
- Đăng bản 2 rồi `POST /api/admin/home/restore-previous` → `GET /api/public/home` trả bản 1, bản nháp giữ nguyên (test).
- `GET /api/public/collections/<slug-nháp>` → 404. `?size=1000` → `size` = `PUBLIC_PAGE_SIZE_MAX`.
- Khởi động API trên DB có sẵn dữ liệu: index mới được tạo, không lỗi.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Editor outfit gửi `collectionIds` cũ, ghi đè lần gán từ trang bộ sưu tập | Thấp × Thấp | Thường chỉ một admin. Ghi vào docs. P3 chỉ gửi `collectionIds` khi người dùng đổi picker |
| Resolver chậm khi nhiều section | Thấp × Trung bình | Guard 40 section, ≤6 tab. Chạy `Promise.all`, có index, `.select()` chỉ lấy trường thẻ. Đo ở bước 12 |
| Cache fetch của trang `force-dynamic` không bị path revalidate làm mới | Trung bình × Trung bình | Fetch trang chủ và bộ sưu tập gắn tag (P3/P4). API luôn gửi tag. e2e P7 kiểm đổi dữ liệu → trang mới |
| Nội dung Mixed lệch schema sau này | Thấp × Trung bình | `safeParse` khi đọc, lưu `schemaVersion`. Bản sau thêm hàm migrate theo version |
| Move đồng thời tạo `order` trùng | Thấp × Thấp | Sort `(order, _id)` vẫn ổn định. Bấm move lần nữa là sửa được |
| Pipeline update (`$set: '$published'`) không chạy trên mongodb-memory-server bản cũ | Thấp × Trung bình | Pipeline update có từ MongoDB 4.2. Kiểm version của memory-server trong test đầu tiên. Nếu thiếu: đọc + ghi có điều kiện `publishedAt` (vẫn là lock) |
| Hai admin cùng bấm "Hoàn tác" | Thấp × Thấp | Lock `basePublishedAt`: người sau nhận 409, UI tải lại trạng thái |

## Security Considerations
- Mọi route ghi nằm sau `requireAdmin` (router `admin` trong `create-app.ts`) và qua kiểm `Origin` sẵn có.
- Zod ở biên cho body, query, params. Section parse theo từng loại. Link chỉ `http(s)` hoặc đường dẫn nội bộ. Key ảnh phải thuộc `public/`.
- Endpoint public chỉ đọc bản đăng và dữ liệu `published`. Preview và restore chỉ admin gọi được. `previous` không bao giờ lộ ra public.
- Lỗi 500 không lộ stack (middleware sẵn có). Không thêm env, không thêm secret.

## Rollback
- Chỉ thêm. Hoàn tác bằng git (xoá file mới, `git restore` file đã sửa): collection `collections`, `page_layouts` và field `outfits.collectionIds`, `settings.announcement` còn trong DB nhưng vô hại (code cũ không đọc). Muốn dọn: drop 2 collection và `$unset collectionIds` bằng `mongosh`, xác nhận đúng host và DB trước khi chạy.
- Hoàn tác sau P3–P6 (theo thứ tự ngược).

## Next Steps
- P3, P4, P5 chạy tích hợp thật rồi đóng phase. P6 dùng `home`, `homeDraft`, `homePublish`, `homeRestorePrevious`, `homePreview`. P5 dùng `announcement` của settings.
