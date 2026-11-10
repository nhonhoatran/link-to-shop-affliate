# Phase 00 — Contract chung (`packages/shared`)

**Ưu tiên:** chặn mọi phase khác · **Người làm:** lead · **Trạng thái:** done (2026-11-10, shared test 173/173 pass)

Làm trước để 3 phase song song code theo cùng một kiểu dữ liệu.

## Thay đổi

1. `api-contract.ts` → `API_PATHS.public.outfitFeed = '/api/public/outfits/feed'`.
2. `public-outfit-list-contract.ts`:
   ```ts
   export const publicOutfitFeedQuerySchema = publicOutfitListQuerySchema.extend({
     collection: <slug schema hiện có của collection>.optional(),
   });
   export type PublicOutfitFeedQuery = z.input<typeof publicOutfitFeedQuerySchema>;
   export type PublicOutfitFeedResponse = Paginated<PublicOutfitDto>;
   ```
3. `settings-schemas.ts`:
   ```ts
   export const HOME_MODES = ['feed', 'sections'] as const;
   export type HomeMode = (typeof HOME_MODES)[number];
   export const DEFAULT_HOME_MODE: HomeMode = 'feed';
   // settingsInputSchema: homeMode: z.enum(HOME_MODES).optional()
   // publicSettingsSchema: homeMode: z.enum(HOME_MODES).optional()  (vắng = DEFAULT_HOME_MODE)
   ```
4. Slug outfit: route `/outfits/feed` khai trước `/outfits/:slug`. Thêm `RESERVED_OUTFIT_SLUGS = ['featured', 'slugs', 'feed']` chặn ở schema slug outfit (giống `RESERVED_COLLECTION_SLUGS`). Kiểm DB local không có outfit nào trùng.
5. Test `settings-schemas.test.ts`, `outfit-schemas.test.ts` cho field mới; `pnpm --filter @under30ss/shared build/test`.
