# Phase 4: Section trang chủ (restyle 7 + 4 view mới + form đăng ký)

## Context Links
- Contract P1: 4 schema mới, `eyebrow`, `ResolvedHomeSection`, `newsletter-contract.ts` (`newsletterFormSchema`, `NEWSLETTER_RESULTS`), fixture `sampleResolvedEditorialSections`, module nút (Q1), token marquee/mosaic/banner/scrim.
- API P2: `GET /api/public/home`, `POST /api/public/newsletter`.
- Research font/motion mục 2 (marquee), 3 (mosaic), 4 (banner, LCP); research newsletter mục 4 (Server Action + PRG).
- Code: `components/home-sections/*`, `section-shell.tsx:20-58`, `home-section-list.tsx`, `hero-image-props.ts:27`, `hero-slider.module.css`, `app/(public)/page.tsx:10` (`force-dynamic`), `lib/api-client-server.ts:20-40` (chỉ có `apiGet`), `app/admin/_lib/admin-preference-actions.ts` (mẫu Server Action).
- Next docs: https://nextjs.org/docs/app/guides/forms (`useFormStatus`, `aria-live`), https://nextjs.org/docs/app/api-reference/components/image (`preload`, `sizes`).

## Overview
- Priority: P1. Status: Completed (e2e 23 test mới xanh; rà mắt 5 mốc chưa làm). Effort: 16h. Chờ P1, code song song P2 bằng fixture, đóng khi chạy thật với API P2.
- Restyle 7 view cũ theo editorial; 4 view mới; form đăng ký nhận tin chạy không JS; thay nhánh rỗng của P1 trong `home-section-views.ts`.

## Key Insights
- 8/14 chỗ pill tự viết nằm ở P4 (`hero-slider.module.css:64,83,131,144`, `outfit-list.module.css:26`, `scroll-rail.module.css:35`, `section-shell.module.css:28`, `text-with-image.module.css:33`). Q1 đã chốt: CTA dùng module nút; nút icon (trước/sau/tạm dừng) dùng `.icon`; chấm slider + tab giữ class riêng.
- Hero hiện overlay phẳng `--client-hero-overlay` 0.45 = 2.54:1 trên ảnh trắng (research mục 4). Tính lại: scrim ink `#111` alpha 0.6 cho 4.95:1 trên ảnh trắng, 0.58 = 4.61:1 (script node, checklist G1). Quy tắc: chữ chỉ nằm trong vùng scrim alpha >= 0.6 (desktop); mobile < 768px chữ nằm panel nền ink dưới ảnh. Không phụ thuộc ảnh thật.
- LCP: `<picture>` art-direct của hero (`hero-image-props.ts`) có 2 nguồn → giữ `loading="eager"` + `fetchPriority="high"`, không `preload` (Next docs: không preload khi nhiều ảnh có thể là LCP theo viewport). CampaignBanner/Gallery là một `<Image>` → dùng `preload` khi là section có ảnh đầu tiên. Không dùng `priority` (deprecated Next 16).
- Form public đầu tiên (grep `<form` trong `components/public`, `components/home-sections`, `app/(public)`: 0 file). Dùng validate HTML gốc (`type="email"`, `required` ở ô email và checkbox) để báo lỗi tại field cả khi tắt JS; server validate lại bằng zod. Khác admin (`noValidate` + zod, `settings-form.tsx:59`), lý do: yêu cầu chạy không JS.
- `redirect()` trong Server Action ném lỗi điều hướng: không đặt trong `try/catch`. Kết quả gọi API map trước, `redirect` sau cùng.
- Chưa kiểm chứng: PRG + hash `#newsletter-<id>` khi tắt JS trên Next 16 (research mục 4 ghi cần spike). Làm spike ở bước 1 trước khi viết form thật.
- View phải client-safe: `views-client-safe.test.tsx:34-40` đọc mọi file trong `components/home-sections` và cấm `next/headers|api-client-server|web-env` (red team H2). Vì vậy:
  - Server Action nằm ở `apps/web/src/lib/newsletter/subscribe-newsletter-action.ts` (P4), không trong thư mục view;
  - không file nào trong `components/home-sections` import action: `app/(public)/page.tsx` import rồi truyền xuống `HomeSectionList` qua prop `newsletter: { action, result }`, `SectionViewProps` thêm `newsletter?` (optional);
  - `newsletter-client-ip.ts` là hàm thuần (nhận chuỗi header, trả IP), phần đọc `headers()` nằm trong action;
  - **không sửa regex** của `views-client-safe.test.tsx`.
- `mode='preview'` (hoặc không có `newsletter.action`): form không gắn `action`, nút disabled, ghi chú "Xem trước, không gửi"; marquee vẫn chạy (có nút tạm dừng).
- Ảnh LCP: `TEXT_ONLY_TYPES` viết tay (`home-section-list.tsx:18`) đổi thành suy từ `HOME_SECTION_META[type].hasImage` (cờ P1), để Marquee/NewsletterSignup đứng đầu không chiếm LCP (red team F4).
- Mosaic Gallery xác định cho mọi `n` 1-12, không lỗ, không `dense` (red team F9): chia nhóm 3 ô; nhóm chẵn `[rộng, thường, thường]`, nhóm lẻ `[thường, thường, rộng]`; desktop 4 cột (rộng = span 2), mobile 2 cột (rộng = span 2). Mỗi nhóm đủ lấp 1 hàng desktop / 2 hàng mobile. Nhóm cuối thiếu: 1 ô → span hết hàng; 2 ô → desktop span 2 + 2, mobile 1 + 1. Không dùng ô cao (mockup có, bỏ vì dễ thủng lưới). Viết thành hàm thuần `galleryMosaicSpans(n)`.
- 409 (câu đồng ý đổi hoặc cache trang chủ cũ): action gọi `revalidateTag(PUBLIC_CACHE_TAGS.home, { expire: 0 })` (cùng cách `app/api/revalidate/route.ts:54`) trước `redirect`, để lần tải lại có câu mới (red team F11).

## Requirements
### Functional
| View | Hiển thị | Ghi chú |
|---|---|---|
| `SectionShell` | eyebrow (chữ hoa nhỏ) + `h2` serif + "Xem tất cả" dạng text link bên phải, hairline dưới tiêu đề | thêm prop `eyebrow`, `action` |
| `HeroSliderView` | eyebrow, tiêu đề `--display-title-size`, mô tả, CTA; scrim gradient; mobile panel dưới ảnh; điều khiển vuông, bộ đếm `01 / 03` | giữ autoplay/pause/reduced-motion |
| `OutfitListView` | tab chữ hoa gạch chân (radio + CSS giữ nguyên), thẻ P3 | |
| `CollectionTiles`, `TextWithImage`, `Faq` | eyebrow + tiêu đề serif, hairline thay bóng/bo | |
| `Commitments`, `FeaturedLookbook` | chỉ restyle phần đang có (tên cam kết serif, 3-4 cột vạch dọc; lookbook giữ layout). Không eyebrow/tiêu đề mới (YAGNI, contract không có) | |
| `CampaignBannerView` (mới) | ảnh + panel chữ nền đặc (eyebrow, h2, body, CTA đen), trái/phải theo `imagePosition`, mobile ảnh trên chữ dưới | khung `--client-banner-ratio` |
| `MarqueeView` (mới) | dải chữ chạy 2 nhóm, nhóm 2 `aria-hidden`, checkbox + label "Tạm dừng / Tiếp tục", reduced-motion: tĩnh, ẩn nhóm 2 + nút | `--marquee-duration` từ `durationSeconds` (style inline) |
| `GalleryView` (mới) | `h2` + note, lưới mosaic theo `galleryMosaicSpans(n)` (2 cột mobile, 4 cột >= 1024px), mỗi ô link `/look/[slug]`, `alt` = tên outfit | không `grid-auto-flow: dense`; `sizes` theo bề rộng ô thật (thường / rộng / cả hàng) |
| `NewsletterSignupView` (mới) | khung hairline giữa trang: eyebrow, h2, body, ô email có nhãn hiện, checkbox đồng ý (chữ + link chính sách từ `data.consent`), nút, finePrint, vùng thông báo | `ok` hiện `successMessage` (prop) hoặc câu mặc định; xem luồng dưới |
- Luồng form: `subscribeNewsletter(formData)` ('use server', `lib/newsletter/subscribe-newsletter-action.ts`):
  1. `website` có giá trị → kết quả `ok` (không gọi API).
  2. `newsletterFormSchema.safeParse` lỗi → `invalid`.
  3. `apiPost(API_PATHS.public.newsletter, body, { headers: { 'x-forwarded-for': clientIp } })`, `clientIp = pickClientIp((await headers()).get('x-forwarded-for'))` (phần tử cuối; không có thì không gửi header).
  4. 202 → `ok`; 400 → `invalid`; 429 → `rate`; 409 → expire tag `home` rồi `error`; khác/mạng → `error` (log `console.error` không kèm email).
  5. `redirect('/?newsletter=<kết quả>#newsletter-<sectionId mã hoá>')`.
- Trang `/`: đọc `searchParams.newsletter`, chỉ nhận giá trị trong `NEWSLETTER_RESULTS`, truyền `{ action: subscribeNewsletter, result }` xuống `HomeSectionList` → view. Thông báo trong `p[role=status][aria-live=polite][tabindex=-1]` có `id` = anchor. Canonical giữ `/`.
- `apiPost<T>(path, body, { headers })` trong `api-client-server.ts`: JSON, `cache: 'no-store'`, dùng lại `readApiResponse`.
- `HomeSectionList`: ảnh LCP = section đầu tiên có `hasImage`; truyền `newsletter` cho mọi view (view khác bỏ qua).

### Non-functional
- Mọi chữ hiển thị nghiệp vụ lấy từ props/settings (gồm câu báo thành công `successMessage`); nhãn UI cố định (Email, Tạm dừng, câu mặc định khi `successMessage` trống, 3 câu `invalid/rate/error`) nằm `home-section-copy.ts`.
- Marquee: chỉ animate `transform`, chiều cao cố định token (không CLS), tự đặt `animation: none` khi reduced-motion.
- Không cuộn ngang ở 320-1440. Vùng chạm 44px (nút tạm dừng, checkbox + label, nút gửi).
- File < 200 dòng; `hero-slider.module.css` (175 dòng) tách phần mobile panel nếu vượt.

## Architecture
```
app/(public)/page.tsx (server, force-dynamic)
  searchParams.newsletter -> parse enum
  Promise.all(getHomePage(), getPublicSettings()) -> HomeSectionList({ sections, newsletter: { action: subscribeNewsletter, result } })
HOME_SECTION_VIEWS (client-safe) += CampaignBannerView | MarqueeView | GalleryView | NewsletterSignupView
NewsletterSignupView (server-safe markup)
  <form action={mode==='public' ? newsletter?.action : undefined}>
    hidden: sectionId, consentTextVersion, source ; honeypot website ; email ; consent checkbox
    NewsletterSubmitButton ('use client', useFormStatus -> disabled + "Đang gửi")
    p#newsletter-<id>[role=status]
lib/newsletter/subscribe-newsletter-action.ts ('use server') -> pickClientIp(header) -> apiPost -> map kết quả (409: revalidateTag home) -> redirect (PRG)
```

## Related Code Files
- Create (`apps/web/src/components/home-sections/`):
  - `campaign-banner-view.tsx`, `campaign-banner.module.css`
  - `marquee-view.tsx`, `marquee.module.css`
  - `gallery-view.tsx`, `gallery-mosaic.module.css`, `gallery-image-sizes.ts`, `gallery-mosaic-layout.ts`
  - `newsletter-signup-view.tsx`, `newsletter-signup.module.css`, `newsletter-submit-button.tsx`
  - Ngoài thư mục view: `apps/web/src/lib/newsletter/subscribe-newsletter-action.ts`, `apps/web/src/lib/newsletter/newsletter-client-ip.ts`
  - Test `apps/web/test/home-sections/`: `campaign-banner-view.test.tsx`, `marquee-view.test.tsx`, `gallery-view.test.tsx`, `gallery-mosaic-layout.test.ts`, `newsletter-signup-view.test.tsx`; `apps/web/test/lib/newsletter/subscribe-newsletter-action.test.ts`, `apps/web/test/lib/newsletter/newsletter-client-ip.test.ts`, `apps/web/test/lib/api-client-server-post.test.ts`
- Modify:
  - `home-section-views.ts` (tuần tự 2/2), `home-section-list.tsx`, `home-section-copy.ts`, `section-shell.tsx`, `section-shell.module.css`
  - `hero-slider-view.tsx`, `hero-slider.module.css`, `hero-slider-autoplay.tsx` (bộ đếm), `hero-image-props.ts` (nếu cần), `outfit-list.module.css`, `outfit-list-tabs.tsx`, `scroll-rail.module.css`, `text-with-image-view.tsx`, `text-with-image.module.css`, `faq.module.css`, `commitments-view.tsx`, `commitments.module.css`, `collection-tiles-view.tsx`, `outfit-list-view.tsx`, `faq-view.tsx`; nếu cần: `featured-lookbook-view.tsx`, `outfit-card-rail.tsx`, `scroll-rail.tsx`
  - Tạm (xoá trước khi đóng phase): `apps/web/src/app/newsletter-prg-spike/page.tsx`
  - `apps/web/src/app/(public)/page.tsx`, `apps/web/src/lib/api-client-server.ts`
  - Test: `apps/web/test/home-sections/{views-client-safe,home-section-list,hero-slider,outfit-list-view,faq-view,commitments-view,text-with-image-view}.test.tsx`, `apps/web/test/app/home-page.test.tsx`, `apps/web/test/lib/public-home-loaders.test.ts` (nếu cần)
- Delete: không.

## Implementation Steps
1. Spike (30 phút, route tạm `app/newsletter-prg-spike/page.tsx`, xoá ngay sau spike): form Server Action + `redirect('/?x=1#a')` trên `next dev`, thử JS bật/tắt. Ghi kết quả vào báo cáo phase. Nếu hash bị mất khi tắt JS: giữ query, bỏ hash, thông báo đặt ngay trên form (vẫn đọc được).
2. Đọc checklist H, I. `SectionShell` (eyebrow, action phải, hairline) + test.
3. Restyle 7 view; hero scrim + panel mobile + bộ đếm; chuyển CTA sang module nút (Q1) và xoá rule pill.
4. `MarqueeView` (pattern research mục 2, id checkbox theo section) + test reduced-motion (class/thuộc tính, nhóm 2 `aria-hidden`).
5. `CampaignBannerView`; `galleryMosaicSpans` + test (n = 1..12: mỗi hàng desktop tổng span = 4, mobile = 2, không hàng thiếu); `GalleryView` (+ `sizes` đo bằng DevTools ở 390/1440) + test link `/look/<slug>`, `alt`.
6. `apiPost` + test; `newsletter-client-ip.ts` (hàm thuần) + test (chuỗi XFF nhiều phần tử, rỗng, `null`).
7. `NewsletterSignupView` + `NewsletterSubmitButton` + `subscribeNewsletter` + test (mock `next/headers`, `next/navigation`, `next/cache`, `fetch`: 202/400/429/409/mạng, 409 gọi `revalidateTag`, honeypot không gọi fetch, redirect cuối cùng). `views-client-safe.test.tsx` vẫn xanh mà không sửa regex.
8. `home-section-views.ts` thay nhánh rỗng; `HomeSectionList` LCP theo `hasImage` + prop `newsletter`; `page.tsx` đọc query + truyền action. Cập nhật `views-client-safe.test.tsx` thêm `sampleResolvedEditorialSections` (cả `mode` public/preview).
9. Chạy thật với API P2: lưu câu đồng ý trong Cài đặt (form chỉ hiện sau đó), đăng bố cục 11 type bằng `curl` (draft + publish), xem 320/390/768/1024/1440, tắt JS (gửi form: ok/invalid), reduced-motion (marquee đứng). Nhánh `rate` đã phủ bằng test unit; nếu thử tay thì khởi động lại API sau đó (bộ đếm RAM).
10. `pnpm lint && pnpm typecheck && pnpm test`; spec visual. Không commit.

## Todo List
- [x] Spike PRG no-JS
- [x] SectionShell eyebrow/action
- [x] Restyle 7 view + hero contrast
- [x] Marquee
- [x] CampaignBanner, Gallery
- [x] Mosaic spans + test
- [x] apiPost + client IP (thuần)
- [x] Form newsletter + action (`lib/newsletter`) + test (gồm 409)
- [x] Đăng ký view, LCP, page query
- [x] Chạy thật với API (no-JS, reduced-motion): e2e `content-newsletter-signup` (JS tắt) và `content-editorial-sections-render` (reduced-motion, không cuộn ngang 320-1440) xanh. Chưa làm: rà mắt 320/390/768/1024/1440
- [x] lint/typecheck/test; visual 4/4 sau re-baseline

## Success Criteria
- Bố cục 11 type render đúng thứ tự; HTML `/` một `h1`, mỗi section có tiêu đề `h2` hoặc `aria-label`.
- Tắt JS: gửi email hợp lệ + tick → URL có `newsletter=ok`, thông báo hiện trong form; không tick → trình duyệt chặn tại checkbox.
- Reduced-motion: `getComputedStyle(track).animationName === 'none'`, nhóm 2 + nút tạm dừng ẩn.
- Chữ hero: vùng chữ nằm hoàn toàn trong phần scrim alpha >= 0.6 (desktop), panel nền ink ở mobile; tỉ lệ tối thiểu 4.95:1 theo công thức (không phụ thuộc ảnh).
- Chỉ một ảnh có `preload`/`fetchPriority="high"` trên `/`, kể cả khi Marquee hoặc NewsletterSignup đứng đầu (test).
- Gallery n = 1..12 không có ô trống (test `galleryMosaicSpans`).

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| PRG/hash không chạy như mong đợi khi tắt JS | Trung bình × Trung bình | Spike bước 1, phương án dự phòng đã ghi |
| Trình duyệt tự điền ô honeypot `website` → đăng ký bị nuốt | Thấp × Trung bình | `autoComplete="off"`, `tabIndex=-1`, ẩn bằng CSS; e2e P6 với autofill tắt; theo dõi tỉ lệ |
| Email đã nhập mất sau redirect lỗi (PRG không mang email) | Trung bình × Thấp | Validate HTML gốc chặn phần lớn lỗi trước khi gửi; không đưa email lên URL (riêng tư) |
| Marquee nhấp nháy do rule toàn cục 0.01ms | Thấp × Trung bình | `animation: none` trong module, test computed style |
| Ảnh người mẫu dọc bị cắt xấu trong ô rộng | Trung bình × Thấp | `object-position: top`, 1/3 số ô là ô rộng; duyệt bằng ảnh thật |
| Bundle `/` tăng (nút submit client) | Thấp × Thấp | Một island nhỏ dùng `useFormStatus`; P6 đo, ngân sách +15 KiB |

## Security Considerations
- Server Action chỉ gọi một endpoint cố định; không nhận URL redirect từ client (đích luôn `/`, anchor từ `sectionId` đã `encodeURIComponent`, chặn open redirect).
- Chỉ chuyển IP lấy từ header proxy; không log email/IP.
- `privacyHref` qua `PublicSmartLink` (đã `safeHrefSchema` ở API). Chữ đồng ý render như text (React escape).
- Next kiểm Origin/Host cho Server Action (theo tài liệu bảo mật Server Actions của Next; chưa kiểm lại trong đợt này). API vẫn có limiter + validate riêng.

## Rollback
- `git restore`/xoá file theo ma trận P4. `home-section-views.ts` về bản P1 (nhánh rỗng) thì section mới không render, trang chủ vẫn chạy. Đăng ký đã lưu trong DB không ảnh hưởng.

## Next Steps
- P5 import `HOME_SECTION_VIEWS` cho khung xem trước (đã có), P6 e2e form + section.
