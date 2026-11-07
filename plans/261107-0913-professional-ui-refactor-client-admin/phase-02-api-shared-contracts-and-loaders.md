# Phase 2: API + shared contracts + web loaders

## Context Links
- Brainstorm mục "Backend cần thêm".
- Code đã đọc: `apps/api/src/routes/public-outfit-routes.ts`, `admin-outfit-routes.ts`, `services/outfit-service.ts` (list admin có `total`, sort `updatedAt,_id`), `services/public-outfit-service.ts`, `services/settings-service.ts` (mẫu `uploadMaxMb` + trần env), `services/revalidate-web-service.ts`, `lib/runtime-defaults.ts`, `config/env-config.ts`, `models/settings-model.ts`, `models/outfit-model.ts`, `create-app.ts`; `packages/shared/src/{api-contract,settings-schemas,public-outfit-dto,revalidate-contract}.ts`; `apps/web/src/lib/seo/public-data-loaders.ts`, `apps/web/src/app/admin/_lib/admin-api.ts`; test `apps/api/test/outfits-public-and-revalidation.test.ts`, `settings-and-admin-users.test.ts`, `helpers/test-app.ts`.
- `docs/code-standards.md` mục "Cấu hình, không fix cứng" (checklist env).

## Overview
- Priority: P1. Status: Done (2026-11-07). Effort: 6h. Chạy sau P1. Có thể chạy cùng P4.
- Thêm endpoint list outfit public, endpoint stats admin, 2 setting mới, revalidate `/looks`. Thêm loader phía web để P3/P5/P6 chỉ việc dùng.

## Key Insights
- Router public gắn ở `/api/public`. `GET /outfits` khớp đúng chuỗi nên không đụng `/outfits/:slug`, `/outfits/featured`, `/outfits/slugs`. Chọn `GET /api/public/outfits` (Decision 4).
- Query sai (vd `page=abc`) → `ZodError` → `error-handler-middleware.ts` trả 400 `VALIDATION_ERROR` sẵn. Không cần code thêm.
- `outfitPaths()` đang trả `['/', '/look/<slug>', '/sitemap.xml']`. Test revalidation so khớp **chính xác** mảng này (dòng 63, 67), nên phải sửa test cùng lúc.
- Settings mới theo đúng mẫu `uploadMaxMb`: trường tuỳ chọn. Không lưu thì dùng mặc định từ env. Kẹp lại khi đọc theo trần env. Vượt trần khi lưu → 400 kèm thông báo tiếng Việt.
- `PublicSettingsDto` thêm 2 trường bắt buộc (`looksPageSize`, `relatedOutfitsCount`, đã quy đổi xong). Web không phải tự biết mặc định. Fixture có kiểu trong `apps/web/test/public/build-outfit-metadata.test.ts` sẽ lỗi typecheck → sửa ở phase này.
- Đếm "thiếu link": `{ status: 'published', 'items.affiliateUrl': '' }`. Mongo khớp nếu **bất kỳ** phần tử mảng có `''`. Schema item có `default: ''` (`outfit-model.ts:51`), nên chuỗi rỗng là đúng trạng thái "chưa có link".
- Sort list public `updatedAt:-1, _id:-1` (index `updatedAt` có sẵn, `_id` để phân trang ổn định).
- `/looks?page=n` là trang dynamic (đọc `searchParams`). Fetch dùng `next.revalidate`. Việc `revalidatePath('/looks')` có làm mới data cache của `/looks?page=2` hay không: **chưa kiểm chứng** (theo cơ chế implicit tag theo pathname thì có). P7 có e2e kiểm thật.

## Requirements
- Functional:
  - `GET /api/public/outfits?page&size` → `Paginated<PublicOutfitCardDto>`, chỉ `published`. `size` mặc định = `looksPageSize` đã quy đổi. Kẹp `[1, PUBLIC_PAGE_SIZE_MAX]`. `page` ≥ 1.
  - `PublicOutfitCardDto = { slug, title, modelImage: ImageWithUrl, updatedAt }`.
  - `GET /api/admin/stats` (sau `requireAdmin`) → `AdminStatsResponse`:
    ```ts
    interface AdminStatsResponse {
      counts: { total: number; published: number; draft: number; publishedMissingAffiliate: number; draftMissingAffiliate: number };
      featured: AdminOutfitListItemDto | null;
      recent: AdminOutfitListItemDto[]; // ADMIN_STATS_RECENT_COUNT, mặc định 5, sort updatedAt desc
    }
    ```
  - Settings: `looksPageSize?`, `relatedOutfitsCount?` (int dương). Admin DTO trả giá trị đã lưu (không có = trống). Public DTO trả giá trị đã quy đổi.
  - Revalidate khi ghi outfit: thêm `/looks`.
  - Hằng `LOOKS_PAGE_PATH = '/looks'` trong shared. API và web cùng dùng.
  - Web loader: `getPublicOutfitPage(page, size?)`, `getRelatedOutfits(excludeSlug, count)`, `getAdminStats()`.
- Non-functional: không migration (Mongo, trường optional). Route mỏng, logic ở service. File < 200 dòng.

## Architecture
```
GET /api/public/outfits?page&size
  route: publicOutfitListQuerySchema.parse(req.query)
  service listPublishedOutfitCards(query, env):
     sizeDefault = (await getListingSettings(env)).looksPageSize
     size = clamp(query.size ?? sizeDefault, 1, env.PUBLIC_PAGE_SIZE_MAX)
     find({status:'published'}).sort({updatedAt:-1,_id:-1}).skip.limit + countDocuments
  -> { items: PublicOutfitCardDto[], total, page, size }

GET /api/admin/stats -> admin-stats-service.getAdminStats(env)
  Promise.all([count all, count published, count draft, count pub+missing, count draft+missing,
               findOne featured&published, find recent limit N]) -> toAdminListItem

settings-service.getListingSettings(env) = {
  looksPageSize: min(stored ?? env.PUBLIC_LOOKS_PAGE_SIZE, env.PUBLIC_PAGE_SIZE_MAX),
  relatedOutfitsCount: min(stored ?? env.PUBLIC_RELATED_OUTFITS_COUNT, env.PUBLIC_PAGE_SIZE_MAX) }

web: public-data-loaders.getRelatedOutfits(exclude, count)
  = getPublicOutfitPage(1, count + 1).items.filter(slug != exclude).slice(0, count)
```
Data flow: Settings (Mongo) → `getListingSettings` → (a) mặc định `size` của list, (b) `PublicSettingsDto` → web đọc `relatedOutfitsCount`, `looksPageSize` để gọi list.

## Related Code Files
- Modify:
  - `packages/shared/src/api-contract.ts` (`API_PATHS.public.outfits`, `API_PATHS.admin.stats`, export type)
  - `packages/shared/src/settings-schemas.ts`, `packages/shared/src/revalidate-contract.ts` (`LOOKS_PAGE_PATH`), `packages/shared/src/index.ts`
  - `apps/api/src/routes/public-outfit-routes.ts`, `apps/api/src/create-app.ts`
  - `apps/api/src/services/public-outfit-service.ts`, `apps/api/src/services/settings-service.ts`, `apps/api/src/services/revalidate-web-service.ts`
  - `apps/api/src/models/settings-model.ts`, `apps/api/src/lib/runtime-defaults.ts`, `apps/api/src/config/env-config.ts`, `apps/api/src/config/env-config.test.ts`
  - `apps/api/test/outfits-public-and-revalidation.test.ts`
  - `apps/api/.env.example`, `.env.example`, `infra/docker-compose.yml`, `docs/deployment-guide.md` (bảng env)
  - `apps/web/src/lib/seo/public-data-loaders.ts`, `apps/web/src/app/admin/_lib/admin-api.ts`
  - `apps/web/test/app/admin-api.test.ts`, `apps/web/test/public/build-outfit-metadata.test.ts`
- Create:
  - `packages/shared/src/public-outfit-list-contract.ts`, `packages/shared/src/admin-stats-contract.ts`, `packages/shared/src/settings-schemas.test.ts`
  - `apps/api/src/routes/admin-stats-routes.ts`, `apps/api/src/services/admin-stats-service.ts`
  - `apps/api/test/public-outfit-list.test.ts`, `apps/api/test/admin-stats.test.ts`, `apps/api/test/settings-listing-fields.test.ts`
  - `apps/web/test/lib/public-data-loaders.test.ts`
- Delete: không

## Implementation Steps
1. Shared:
   - `public-outfit-list-contract.ts`: `publicOutfitListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).optional() })`, `PublicOutfitCardDto`, `PublicOutfitListResponse = Paginated<PublicOutfitCardDto>`.
   - `admin-stats-contract.ts`: `AdminStatsResponse` như trên.
   - `settings-schemas.ts`: input thêm `looksPageSize: z.number().int().positive().optional()`, `relatedOutfitsCount` tương tự. Comment một dòng: trần do API kiểm theo env, giống `uploadMaxMb`. `publicSettingsSchema` thêm 2 trường `z.number().int().positive()`.
   - `api-contract.ts`: `API_PATHS.public.outfits = '/api/public/outfits'`, `API_PATHS.admin.stats = '/api/admin/stats'`.
   - `revalidate-contract.ts`: `export const LOOKS_PAGE_PATH = '/looks'`.
   - `settings-schemas.test.ts`: nhận số hợp lệ, từ chối 0 / số âm / số lẻ / chuỗi.
   - Chạy `pnpm --filter @under30ss/shared build`.
2. Env API (`env-config.ts`): `PUBLIC_LOOKS_PAGE_SIZE` (12), `PUBLIC_RELATED_OUTFITS_COUNT` (8), `PUBLIC_PAGE_SIZE_MAX` (48). Kiểm chéo trong `parseEnv`: hai giá trị mặc định không được vượt `PUBLIC_PAGE_SIZE_MAX` (giống `ADMIN_PAGE_SIZE_DEFAULT`). `runtime-defaults.ts`: `getAdminStatsRecentCount()` đọc `ADMIN_STATS_RECENT_COUNT` (5). Thêm test vào `env-config.test.ts`.
3. Checklist env (`docs/code-standards.md`): thêm vào `apps/api/.env.example`, `.env.example`, `environment:` của service api trong `infra/docker-compose.yml` (`${VAR:-default}`), bảng env trong `docs/deployment-guide.md`. Không phải biến prod bắt buộc nên không thêm vào `infra/.env.prod.example`.
4. `settings-model.ts`: `looksPageSize: Number`, `relatedOutfitsCount: Number`. `settings-service.ts`:
   - `updateSettings`: kiểm trần (`> PUBLIC_PAGE_SIZE_MAX` → `badRequest('Tối đa N outfit', { looksPageSize: 'Tối đa N' })`). Trường bỏ trống → `$unset`. Viết helper chung với `uploadMaxMb` để không lặp code.
   - `getAdminSettings`: trả giá trị đã lưu nếu có.
   - `getListingSettings(env)` (export): quy đổi và kẹp khi đọc.
   - `getPublicSettings`: spread `getListingSettings`.
   - Nếu file vượt 200 dòng → tách `settings-listing-service.ts` (hiện 61 dòng, dự kiến ~95).
5. `public-outfit-service.ts`: `listPublishedOutfitCards(query, env)`. Map ảnh bằng `createMediaUrlResolver`. Route `router.get('/outfits', ...)` đặt **trước** `/outfits/:slug` cho dễ đọc.
6. `admin-stats-service.ts` + `admin-stats-routes.ts`. Gắn `admin.use('/stats', createAdminStatsRoutes(ctx))` trong `create-app.ts`. Featured chỉ lấy khi `published` (đúng bất biến hiện có). Dùng lại `toAdminListItem`.
7. `revalidate-web-service.ts`: `outfitPaths` → `['/', LOOKS_PAGE_PATH, ...look paths, '/sitemap.xml']`. Sửa kỳ vọng trong `outfits-public-and-revalidation.test.ts`.
8. Test API (supertest + mongodb-memory-server, không mock):
   - `public-outfit-list.test.ts`: draft bị ẩn; sort mới nhất; `total`; `size` kẹp theo trần; mặc định theo setting; `page` quá lớn → `items: []` và `total` đúng; `page=0` → 400; không lộ `status`/`items`.
   - `admin-stats.test.ts`: 401 khi chưa đăng nhập; đếm đúng 5 con số với dữ liệu trộn; featured null / có; `recent` đúng số lượng và thứ tự.
   - `settings-listing-fields.test.ts`: lưu, đọc lại, bỏ trống → về mặc định env, vượt trần → 400, public DTO luôn có số.
9. Web:
   - `public-data-loaders.ts`: `getPublicOutfitPage = cache((page: number, size?: number) => apiGet<PublicOutfitListResponse>(..., safetyRevalidate()))`. `getRelatedOutfits(excludeSlug, count)` như sơ đồ. Lỗi API khác 404 → ném lên error boundary, giống loader hiện có. Mục "Outfit khác" là phụ: P3 bọc lỗi, xem P3.
   - `admin-api.ts`: `getAdminStats = () => adminGet<AdminStatsResponse>(API_PATHS.admin.stats)`.
   - Sửa fixture `PublicSettingsDto` trong `build-outfit-metadata.test.ts`. Thêm test cho `admin-api.test.ts`, `public-data-loaders.test.ts` (dựng URL đúng, lọc slug, cắt đúng số).
10. `pnpm lint && pnpm typecheck && pnpm test`. Commit: `feat: add public outfit list, admin stats and listing settings`.

## Todo List
- [x] Shared contracts + test + build
- [x] Env + runtime-defaults + checklist env (4 file)
- [x] Settings model/service + kẹp + test
- [x] List public + test
- [x] Stats admin + test
- [x] Revalidate `/looks` + sửa test
- [x] Loader web + admin-api + test
- [x] lint, typecheck, test xanh (chốt: shared 37 / api 102 / web 265 passed, 2026-11-07)
- [ ] Commit `feat: add public outfit list, admin stats and listing settings`: bỏ theo quyết định chủ repo

## Success Criteria
- `curl "$API/api/public/outfits?page=1&size=1000"` → `size` = `PUBLIC_PAGE_SIZE_MAX`. `?page=abc` → 400.
- `GET /api/admin/stats` khi chưa đăng nhập → 401. Khi đã đăng nhập → đủ trường, số khớp DB.
- PUT settings `looksPageSize: 49` (trần 48) → 400 có `fields.looksPageSize`.
- Test revalidation thấy `/looks` trong `paths`.
- Toàn bộ test cũ (api 83, shared 32, web 166 tính tới 2026-11-07) vẫn pass, cộng thêm test mới.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Đổi `PublicSettingsDto` làm lỗi chỗ dùng ở web | Trung bình × Thấp | Typecheck bắt được. Chỉ fixture test có kiểu cần sửa (đã grep: `build-outfit-metadata.test.ts`) |
| Count 5 lần mỗi lần tải Tổng quan | Thấp × Thấp | Dữ liệu nhỏ, có index `status`. Đổi sang `$facet` nếu sau này chậm |
| `revalidatePath('/looks')` không làm mới trang `?page=n` | Trung bình × Thấp | Bị chặn trên bởi `PUBLIC_REVALIDATE_SECONDS`. P7 có e2e. Nếu fail: thêm tag cho fetch + mở rộng route revalidate (báo lead) |
| Mục "Outfit khác" trên trang look khác bị cũ | Trung bình × Thấp | Decision 8 |

## Security Considerations
- Stats nằm sau `requireAdmin`. List public chỉ lộ outfit `published` và chỉ các trường của thẻ (không lộ `status`, `featured`, items, affiliate).
- Zod kiểm query/body ở biên. `size` kẹp phía server, không tin client.
- Không thêm secret. Biến env mới không nhạy cảm.

## Rollback
- Thay đổi chỉ thêm (endpoint mới, trường tuỳ chọn). Revert commit là xong. Document Settings có thêm trường cũng vô hại: service chỉ đọc các trường đã biết. Web P3/P5 phụ thuộc nên phải revert theo thứ tự ngược (P6 → P5 → P3 → P2).

## Next Steps
- Mở khoá P3 (dùng `getPublicOutfitPage`, `getRelatedOutfits`, `LOOKS_PAGE_PATH`) và P5 (dùng `getAdminStats`). P6 dùng field settings mới.
