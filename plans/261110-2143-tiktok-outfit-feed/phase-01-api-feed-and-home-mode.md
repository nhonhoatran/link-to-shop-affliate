# Phase 01 — API feed + `homeMode`

**Ưu tiên:** cao · **Song song với:** 02, 03 · **Trạng thái:** pending
**Sở hữu:** `apps/api/**` (không sửa file khác)

## Bối cảnh

- `GET /api/public/outfits` và `/collections/:slug` chỉ trả card (`slug, title, modelImage`) — không đủ vẽ lookbook.
- Đọc: `apps/api/src/services/public-outfit-service.ts`, `public-collection-service.ts`, `routes/public-outfit-routes.ts`, `models/settings-model.ts`, `services/settings-service.ts`, `models/collection-model.ts` (`PUBLISHED_COLLECTION_FILTER`).

## Việc

1. File mới `services/public-outfit-feed-service.ts`: `listPublishedOutfitFeed(query, env): Promise<PublicOutfitFeedResponse | null>`.
   - Không `collection`: mọi outfit `status: 'published'`. Có `collection`: tìm collection published theo slug, không có → `null` (route trả 404 `'Không tìm thấy bộ sưu tập'`); lọc `collectionIds: collection._id`.
   - Sort `{ featured: -1, updatedAt: -1, _id: -1 }`; `size = min(query.size ?? looksPageSize, PUBLIC_PAGE_SIZE_MAX)` (tái dùng `getListingSettings`).
   - Map `toPublicOutfitDto(toOutfit(record), createMediaUrlResolver(env))`.
2. Route `GET /outfits/feed` trong `public-outfit-routes.ts`, khai **trước** `/outfits/:slug`, parse bằng `publicOutfitFeedQuerySchema`.
3. `homeMode`: thêm vào settings model (Mongoose `String`, enum `HOME_MODES`), đọc/ghi trong `settings-service.ts`, trả trong public settings (vắng → không set; web tự hiểu là `DEFAULT_HOME_MODE`) và admin settings.
4. Lưu settings đã có revalidate web? Kiểm `revalidate-web-service.ts`: đổi `homeMode` phải làm mới trang chủ (`/`).
5. Test `apps/api/test/public-outfit-feed.test.ts`: featured đứng đầu, phân trang + total, lọc collection, collection nháp/lạ → 404, outfit draft bị loại, món không anchor bị bỏ. Test settings `homeMode` lưu/đọc + giá trị sai → 400.

## Xong khi

- `pnpm --filter <api> test` và typecheck pass. Báo kèm output.
