# Code review: UI refactor client + admin (P1–P6)

Plan: `plans/261107-0913-professional-ui-refactor-client-admin/`. Ngày: 2026-11-07. Chỉ đọc, không sửa source.

## Phạm vi
- Tracked: 80 file, +1139/−364 (`git diff --shortstat`). Untracked trong `apps/`, `packages/`: ~3.860 dòng (bao gồm test).
- Bỏ qua: `apps/web/next-env.d.ts`, `plans/**`, e2e spec do agent khác thêm.
- Kiểm chứng đã chạy:
  - `pnpm typecheck`: pass (shared, api, web).
  - `pnpm lint`: pass, 0 lỗi.
  - `pnpm test`: shared 37/37, api 102/102, web 255/255, tất cả pass.
  - Không chạy e2e (theo yêu cầu).
- Không có file code mới/sửa nào vượt 200 dòng (đã đếm `wc -l` toàn bộ file .ts/.tsx/.css thay đổi + mới).

## Điểm: 8/10
Chất lượng cao: API mới chỉ lấy outfit published, select đúng field, ceiling lấy từ env và clamp cả lúc đọc; Server Action có allow-list zod; redirect `/admin` không mở được open redirect; SSR không ẩn gì bằng `motion`; LazyMotion strict, chỉ dùng `m.*`; tab có roving tabindex + Home/End; icon đều `aria-hidden`; live region của toast được mount sẵn. Không có lỗi critical. Có 1 lỗi logic thật ở lookbook (đường nối có thể bị ẩn vĩnh viễn) và vài rủi ro UX/perf.

## Critical
Không có.

## High

### H1. Đường nối lookbook có thể ẩn vĩnh viễn khi ảnh eager lỗi
- `apps/web/src/components/lookbook/use-lookbook-ready.ts:31`: chỉ nghe `load` (capture). Ảnh lỗi phát `error`, không phát `load`.
- Tình huống: lúc mount, `check()` thấy ảnh model (`preload`, eager, `lookbook-model-figure.tsx:18`) còn đang tải nên return. Sau đó RustFS trả 404/timeout, ảnh bắn `error`. Không còn sự kiện nào gọi lại `check()`, nên `ready` mãi là `false`. `.connectors:not([data-ready]) { visibility: hidden }` (`lookbook-motion.module.css:5`) giấu toàn bộ đường nối, trái với chú thích "never stay hidden".
- Test `test/lookbook/lookbook-draw-once.test.tsx` chưa có case ảnh lỗi.
- Sửa: nghe thêm `error`, ví dụ:
  ```ts
  root.addEventListener('load', check, true);
  root.addEventListener('error', check, true);
  // cleanup: removeEventListener cho cả hai
  ```
  `img.complete` đã là `true` với ảnh lỗi nên `isPending` sẽ cho qua. Thêm 1 test dispatch `new Event('error')`.

## Medium

### M1. `revealOnScroll`: hàng card cuối có thể đứng mờ/lệch khi trang không cuộn đủ (chưa kiểm chứng bằng trình duyệt)
- `apps/web/src/styles/motion-primitives.module.css:20-22`: `animation-range: entry 0% cover 30%` + `backwards`, áp cho mọi cell ở `outfit-card-grid.tsx:15`.
- `cover 30%` buộc mép trên card phải đi lên được khoảng 0.3 × (chiều cao viewport + chiều cao card) tính từ đáy viewport. Ví dụ desktop cao 1400px, card 350px: cần ~525px. Nếu hàng cuối nằm sát footer thấp, hoặc trang `/looks` ít outfit nên không cuộn được, animation dừng giữa chừng: card đứng ở opacity < 1 và còn dịch xuống.
- Sửa: dùng range kết thúc khi phần tử đã vào hẳn viewport, ví dụ `animation-range: entry 0% entry 100%`. Kiểm tra lại bằng e2e ở viewport 1440×1400 với 2–5 outfit.

### M2. Trang 404 trong admin giờ hiện header/footer public
- `apps/web/src/app/not-found.tsx:9-15` bọc `PublicShell`. `adminGet` gọi `notFound()` (`app/admin/_lib/admin-api.ts:15`). Admin không có `not-found.tsx` riêng (`find app/admin -name "not-found*"` không ra file nào).
- Tình huống: mở `/admin/outfits/<id-đã-xoá>`. Theo cơ chế boundary của Next (đây là suy luận, chưa chạy thử), root `not-found` render bên dưới root layout, không đi qua admin layout. Người dùng thấy header "Trang chủ / Tất cả outfit" và footer public, không có sidebar và không theo dark mode. Trang còn gọi thêm `getPublicSettings`. Trước refactor trang này chỉ là `PublicMessage` trơn.
- Sửa: thêm `app/admin/(protected)/not-found.tsx` dùng `PublicMessage`/panel admin, có link về `ADMIN_PATHS.outfits`.

### M3. Lưới `/looks` và "Outfit khác" tải ảnh model full-size, và hàng đầu bị lazy
- `next.config.ts` để `images: { unoptimized: true }`, nên `sizes` (`outfit-card.tsx:26`) không sinh `srcset`. Mỗi card tải nguyên ảnh model (cạnh tối đa `IMAGE_MAX_EDGE_MODEL=1600`). Trang `/looks` mặc định có 12 card.
- Mọi card đều mặc định `loading="lazy"`, kể cả hàng đầu (đây là ứng viên LCP).
- Sửa: ngắn hạn, cho `preload`/eager khoảng 1 hàng đầu trên `/looks`. Dài hạn, API sinh biến thể thumbnail (cùng pipeline sharp đang có).

### M4. Lỗi lưu outfit bị screen reader đọc hai lần
- `apps/web/src/hooks/admin/use-outfit-actions.ts:35-37`: vừa `setMessage(text)`, được render qua `FormError role="alert"` (`field-error.tsx:24`), vừa `toast.error(text)`, cũng nằm trong vùng `role="alert"` (`admin-toast-provider.tsx:77`).
- Tình huống: bấm Lưu khi thiếu tiêu đề. NVDA/VoiceOver đọc cùng một câu 2 lần liên tiếp.
- Sửa: giữ một kênh. Lỗi validate field thì giữ inline. Toast chỉ dùng cho lỗi mạng/server, hoặc render toast lỗi với `aria-hidden` khi đã có `FormError`.

## Low

- **L1. `page` không có trần, có thể ra 500.** `packages/shared/src/public-outfit-list-contract.ts:6`: `?page=1e300` vẫn qua `.int()`. `skip((page-1)*size)` (`public-outfit-service.ts:44`) vượt int64 nên Mongo báo lỗi, trả 500 và ghi log lỗi cho endpoint public. Admin list (`admin-outfit-routes.ts:76`) có sẵn cùng pattern này. Sửa: thêm `.max(Number.MAX_SAFE_INTEGER / PUBLIC_PAGE_SIZE_MAX)` hoặc clamp ở service.
- **L2. Thiếu index compound cho truy vấn list public.** Filter `{status:'published'}` + sort `{updatedAt:-1,_id:-1}`, trong khi chỉ có index đơn `status` và `updatedAt` (`outfit-model.ts:62,71`). Nên thêm `outfitSchema.index({ status: 1, updatedAt: -1, _id: -1 })`, vì endpoint này public (qua Caddy `/api/*`) và không cache phía API.
- **L3. "Outfit khác" có thể thiếu 1 card khi set count bằng max.** `public-data-loaders.ts:50`: nếu `relatedOutfitsCount` = `PUBLIC_PAGE_SIZE_MAX` thì `count + 1` bị API clamp về max. Khi outfit hiện tại nằm trong trang 1, danh sách chỉ còn `max - 1` card.
- **L4. Form cài đặt không cho biết mặc định và trần.** `settings-listing-fields.tsx:4,32`: hint ghi "để trống dùng mặc định" nhưng không hiện số mặc định (12/8) hay trần 48, và không có `max`. Admin nhập 60 chỉ biết sai sau khi submit. Nên trả `defaults`/`max` trong `AdminSettingsDto` rồi hiện vào hint và `max`.
- **L5. `ADMIN_STATS_RECENT_COUNT` không qua `envSchema`.** Biến này đọc qua `runtime-defaults.ts:37`, nên không được validate lúc khởi động và không có trần. Đặt lớn sẽ khiến `find({}).lean()` tải nguyên document có `items` (`admin-stats-service.ts:18`). Nên đưa vào `envSchema` có ceiling và `.select()` đúng field `toAdminListItem` cần.
- **L6. Màu thô `rgba(0, 0, 0, 0.5)` cho `::backdrop`.** `admin-shell.module.css:97` bypass token `--admin-*`. Nên tạo `--admin-backdrop` (dark mode có thể cần đậm hơn).
- **L7. `THEME_COLOR` cứng.** `app/layout.tsx:15` lặp lại `--client-bg` (đã ghi chú là ngoại lệ). Admin dark mode vẫn nhận theme-color sáng. Có thể khai `viewport.themeColor` riêng cho admin layout.
- **L8. Drawer không đóng khi bấm link trỏ về trang hiện tại.** `admin-nav-drawer.tsx:15-17` chỉ đóng khi `pathname` đổi. Nên đóng thêm trong `onClick` của link.
- **L9. Fallback tên site là "Trang chủ".** Khi settings lỗi, brand header hiện "Trang chủ" (`public-shell.tsx:15`). Nên dùng env `DEFAULT_SITE_NAME` phía web, hoặc ẩn brand.
- **L10. Còn chỗ nhãn tiếng Anh.** `public-copy.ts`: `breadcrumb: 'Breadcrumb'` (aria-label) chưa Việt hoá.
- **L11. Snapshot visual chỉ có bản `-win32`.** CI Linux sẽ thiếu baseline. Plan đã ghi nhận việc này; cần chốt môi trường chạy visual.
- **L12. `login-form.tsx:21` và `outfit-create-form.tsx:37` còn hardcode `/admin`, `/admin/outfits/${id}`.** Chạy vẫn đúng (`/admin` giờ là Tổng quan), nhưng nên dùng `ADMIN_PATHS` cho nhất quán. Hai file này không nằm trong diff.

## Đã kiểm và thấy ổn (theo focus được giao)
- `GET /api/public/outfits`: zod coerce, `page ≥ 1`, `size ≥ 1`, `size` clamp theo `PUBLIC_PAGE_SIZE_MAX`. Query `page=abc` hoặc mảng `page` ra `ZodError`, map thành 400 (`error-handler-middleware.ts:26`). Chỉ lấy `status:'published'`, `select` đúng 4 field, không lộ `items`/affiliate/draft.
- `GET /api/admin/stats`: mount trong router `admin.use(requireAdmin)` (`create-app.ts:36-38`), có test 401 (`admin-stats.test.ts:28`).
- Settings: `looksPageSize`/`relatedOutfitsCount` là int dương (zod), ceiling check ở API, clamp lúc đọc (`resolveListingSettings`). `validateBody` thay `req.body` bằng dữ liệu đã parse nên vòng `Object.entries(required)` không bị mass-assignment. Env check `≤ PUBLIC_PAGE_SIZE_MAX` lúc khởi động.
- Revalidate: `outfitPaths` có `/looks`. Settings đổi thì `scope:'all'`, chạy `revalidatePath('/', 'layout')`.
- Server Actions (`admin-preference-actions.ts`): allow-list bằng `z.enum`, sai giá trị thì bỏ qua. Cookie `httpOnly`, `sameSite=lax`, `path=/admin`, `secure` theo `x-forwarded-proto`. Caddy `reverse_proxy` ghi đè header này nên client không giả mạo được khi đi qua Caddy; nếu gọi thẳng web thì người gọi chỉ tự hại cookie của mình. CSRF: Next tự so Origin/Host cho Server Action. Không cần auth vì action chỉ ghi cookie hiển thị của chính người gọi.
- Redirect `/admin?q|status|page`: path cố định `ADMIN_PATHS.outfits`, query encode bằng `URLSearchParams`, nên không có open redirect hay header injection. Chú thích giải thích lý do không đặt `loading.tsx` là hợp lý.
- SSR/no-JS: `HideOnScrollHeader` dùng `initial={false}` nên SSR luôn hiện header. Animation lúc tải là CSS với `backwards`, delay của template bằng 0. Reduced motion được xử lý ở CSS (`motion-primitives`, `globals.css:40`) và `MotionConfig reducedMotion="user"`.
- LazyMotion `strict`: grep `from 'motion` chỉ ra `m`, `AnimatePresence`, hook. Không có `motion.*`.
- Lookbook: listener/timer đều được cleanup, `cancelled` chặn setState muộn, `ready` không quay lại `false`, path giữ nguyên node khi resize. Vấn đề duy nhất là H1.
- A11y: drawer dùng `<dialog>`, `showModal()`, trả focus về opener, đóng khi đổi route. Tab có `aria-selected`/`aria-controls`/`tabIndex` roving, Arrow/Home/End. Ở ≥1024px CSS bỏ `[hidden]` nên first paint đúng. Rail ẩn text bằng kỹ thuật sr-only, không dùng `display:none`. Bảng có thêm `role` tường minh, giữ ngữ nghĩa khi đổi sang card mode.
- Dark mode admin: ngoài L6, grep `#hex|rgba|hsl` trong `components/admin`, `app/admin` (css) không ra màu thô nào khác.

## Thứ tự đề xuất
1. H1: thêm listener `error` và test.
2. M2: thêm `not-found` cho admin.
3. M1: đổi `animation-range`, kiểm bằng e2e.
4. M4: bỏ báo lỗi trùng.
5. M3: cho hàng đầu `/looks` tải eager, lên kế hoạch thumbnail.
6. L1, L2 trước khi lên production.

## Câu hỏi chưa giải đáp
- M1, M2 mới là suy luận từ spec CSS / cơ chế boundary của Next, chưa chạy trình duyệt. Agent e2e có thể xác nhận nhanh (`/admin/outfits/000000000000000000000000`; `/looks` với 2–5 outfit ở viewport cao).
- Visual baseline chỉ có bản win32: CI có chạy project `visual` không?
- Thumbnail cho card (M3): có muốn mở rộng phạm vi sang API media pipeline không?
