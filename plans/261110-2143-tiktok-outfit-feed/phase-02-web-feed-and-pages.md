# Phase 02 — Web: feed + gắn vào trang

**Ưu tiên:** cao · **Song song với:** 01, 03 · **Trạng thái:** pending
**Sở hữu:** `apps/web/src/components/feed/**` (mới), `components/public/**`, `components/lookbook/**`, `app/(public)/**`, `lib/seo/**`, `lib/feed/**` (mới), `styles/**`, `apps/web/test/{public,app,feed,lookbook}/**`. Không sửa `components/admin/**`, `components/home-sections/**`.

## Trải nghiệm (góc người dùng)

- Mở trang → thấy trọn 1 lookbook vừa khung, khỏi cuộn mới thấy hết.
- Vuốt/cuộn 1 nhịp → khung kế nằm gọn (scroll-snap). Desktop: 2 nút tròn ▲▼ bên phải như TikTok web; phím ↑↓/PageUp/PageDown dùng được.
- Dưới lookbook 1 dòng: tên outfit, link qua trang chi tiết.
- Gần cuối lô → tự tải lô kế (hiện trạng thái đang tải). Hết outfit → footer hiện ở cuối feed.
- Bấm món đồ → đi thẳng link affiliate (giữ hành vi lookbook).

## Kiến trúc

- **Bố cục kiểu app:** trang có feed thì shell cao đúng `100dvh` (CSS `:has([data-feed])` trong `public-shell.module.css`): thông báo + header ở trên, feed là vùng cuộn riêng chiếm phần còn lại; footer của shell ẩn, feed tự render footer ở cuối khi hết outfit (truyền qua prop/slot, tái dùng `SiteFooter`). Lý do: khung đầu vừa ngay khi load, khung nào cũng cao bằng nhau, snap ổn định.
- **Thu lookbook (`components/feed/lookbook-fit.tsx`, client):** đo cao thật của lookbook ở bề ngang hiện tại → đặt bề ngang = ngang × (cao khung / cao thật), lặp tối đa 3 lần (chữ không co đều), chặn dưới bằng `--feed-lookbook-min-width`, chặn trên bằng `--lookbook-max-width`. Chạy lại khi khung đổi cỡ (ResizeObserver). Tách phép tính thành hàm thuần `compute-fit-width.ts` để unit test. Mũi tên nối tự đo lại (đã có ResizeObserver trong `lookbook-interactions.tsx`).
- **Tải thêm:** `lib/feed/load-feed-page-action.ts` (`'use server'`) nhận `{ collection?: string; page: number }`, gọi API feed, trả `{ slides: ReactNode; nextPage: number | null }` — slide render trên server. `components/feed/feed-load-more.tsx` (client) dùng IntersectionObserver trên mốc là `<a href="?page=N+1">` (không JS vẫn sang trang được). **Làm thử cái này đầu tiên**; Next 16.4 trả JSX từ server action trục trặc thì đổi sang route handler trả HTML và báo lead.
- **Ảnh:** slide đầu `preload`, các slide sau lazy (prop `preload` có sẵn của `LookbookLayout`).
- **Loader:** `lib/seo/public-feed-loaders.ts` → `getOutfitFeedPage({ page, size?, collection? })` gọi `API_PATHS.public.outfitFeed` (cache tag như loaders hiện có).
- Files mới trong `components/feed/`: `outfit-feed.tsx` (server), `outfit-feed-slide.tsx`, `lookbook-fit.tsx`, `compute-fit-width.ts`, `feed-load-more.tsx`, `feed-step-buttons.tsx`, `outfit-feed.module.css`. Mỗi file < 200 dòng.

## Gắn vào trang

1. `/looks`: thay `OutfitCardGrid` + `LooksPagination` bằng `OutfitFeed`; h1 "Tất cả outfit" sr-only. `?page=N` → feed bắt đầu từ lô N; quá số trang → `notFound()` như cũ. Metadata giữ.
2. `/collections/[slug]`: bỏ `CollectionHeader` (ảnh bìa + mô tả) và breadcrumb hiển thị; tên bộ sưu tập thành h1 sr-only; feed lọc `collection`. Rỗng → giữ thông báo rỗng. Metadata vẫn dùng mô tả bộ sưu tập.
3. `/`: `(settings.homeMode ?? DEFAULT_HOME_MODE) === 'sections'` → render như cũ; `feed` → `OutfitFeed` toàn bộ (nổi bật đầu), h1 sr-only = `seoTitle`; không có outfit → `PublicMessage` rỗng có sẵn.
4. Header mobile trên trang feed: nav về 1 dòng (giảm khoảng chữ, nav tự cuộn ngang nếu tràn, trang không cuộn ngang). Kiểm 360/390/430px.
5. Xoá code chết (grep trước): `CollectionHeader`, `LooksPagination`… nếu không còn ai dùng. `OutfitCardGrid` còn dùng ở home sections → giữ.

## Giá trị cấu hình

- Số outfit mỗi lô = `looksPageSize` (admin chỉnh được).
- `--feed-*` (khoảng tải trước, cao dòng chú thích, cỡ nút ▲▼, min width lookbook) trong `styles/design-tokens.css`.
- Chữ giao diện ("Đang tải thêm outfit", "Xem tiếp", "Outfit trước", "Outfit kế tiếp") trong `components/public/public-copy.ts`.

## Xong khi

- Unit test web vùng sở hữu pass, `tsc` web sạch, lint sạch.
- Chụp Playwright 390×844 và 1440×860 cho `/`, `/looks`, `/collections/streetwear-he`: khung đầu vừa màn hình, không cuộn ngang. Lưu ảnh vào `plans/261110-2143-tiktok-outfit-feed/visuals/`.
- Nếu API phase 01 chưa xong lúc kiểm tra: báo rõ, lead ghép sau.

## Rủi ro

- iOS Safari `100dvh` + vùng cuộn lồng → test viewport mobile.
- Lookbook nhiều món thu nhỏ quá → min width; dưới mức đó cho khung cuộn nhẹ bên trong.
