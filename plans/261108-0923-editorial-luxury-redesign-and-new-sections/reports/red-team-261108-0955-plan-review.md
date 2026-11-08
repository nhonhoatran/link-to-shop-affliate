# Red team: rà plan editorial monochrome + section mới

Ngày 2026-11-08. Rà plan, không rà code. Mọi nhận định đều đã đối chiếu với code thật (dẫn `file:dòng`). Có 3 góc nhìn: Bảo mật/lạm dụng, Chạy song song, Phạm vi/UX/đúng sai.

Tóm tắt: 0 Critical, 3 High, 6 Medium, 5 Low.

## Đã kiểm, KHÔNG phải lỗi (để khỏi rà lại)
- Đường đi IP qua proxy đúng như plan mô tả. Trong `infra/docker-compose.yml`, chỉ caddy mở cổng ra ngoài; api/web không có `ports` (bản prod `docker-compose.prod.yml:9,12` còn `!reset`). Next 16.4.5 chỉ tự đặt XFF khi request chưa có (`next/dist/server/base-server.js:604`, toán tử `??=`). Express `trust proxy` = 1 khi chạy production (`apps/api/src/create-app.ts:31`).
- Server Action gọi POST sang API thì không bị `origin-check` chặn. Đã chạy thử Node 24.15 `fetch` POST: không gửi header `Origin`, header `x-forwarded-for` tự đặt vẫn tới nơi nguyên vẹn. `origin-check-middleware.ts:18` cho qua request không có Origin.
- Route export nằm dưới `admin.use(requireAdmin)` (`create-app.ts:39-40`). Plan đã chống CSV injection đúng hướng OWASP. Đã bắt lỗi 11000 trước khi rơi xuống `error-handler-middleware.ts:32` (nơi trả 409 làm lộ email). Không thấy đường dò email nào.
- Lỗi xảy ra giữa chừng lúc stream CSV: `errorHandler` gọi `next(error)` khi `res.headersSent` (`error-handler-middleware.ts:43-45`), Express huỷ socket, file tải về sẽ báo lỗi chứ không ra file cụt mà trông như đủ.
- Next 16 có prop `preload` (`next/dist/shared/lib/get-img-props.d.ts:23`). Đã tính lại contrast bằng công thức WCAG, khớp bảng G1: 6.74, 3.56, 3.32, 7.49; scrim 0.6 → rgb(112) = 4.95; 0.58 = 4.61.
- Spec visual chụp phần tử `[data-lookbook]` (`e2e/visual-reference-screenshots.spec.ts:25`). Nền đổi từ `#f6f1ea` sang `#faf8f5`, độ lệch YIQ khoảng 25, dưới ngưỡng pixelmatch 0.2 (khoảng 1408). Vì vậy P1 nhiều khả năng vẫn xanh như plan dự đoán.

---

## Finding 1: P1 không thể xanh nếu không sửa fixture do P5 sở hữu (High)
- **Góc nhìn:** Chạy song song
- **Bằng chứng:** `apps/web/test/admin/home-editor/home-section-field-specs.test.ts:62-72` lặp qua mọi `HOME_SECTION_TYPES`; với mỗi field `select`, test gọi `sampleSection(type)`. Hàm `home-editor-fixture.ts:4-7` chỉ tìm trong `sampleHomeSections`, không thấy thì `throw new Error('No sample for …')`. Plan P1 thêm `Gallery.source` và `CampaignBanner.imagePosition` (đều là select), nhưng lại đặt sample mới ở export riêng `sampleEditorialHomeSections` (Key Insights P1).
- **Hậu quả:** Ở bước 10 của P1, `pnpm test` đỏ với lỗi "No sample for Gallery". Ma trận ghi test này là chỉ đọc ("P1 phải làm nó xanh mà không sửa"), còn `WT/admin/home-editor/*` thuộc P5 (M?). Như vậy P1 bị chặn ngay lối ra.
- **Sửa plan:** Giao `apps/web/test/admin/home-editor/home-editor-fixture.ts` cho P1. `sampleSection` tìm trong `[...sampleHomeSections, ...sampleEditorialHomeSections]`, còn `sampleContent()` giữ nguyên 7 section để `add-section-dialog.test.tsx:59` (`toHaveLength(8)`) không vỡ. Cập nhật ma trận, mục "Không ai sửa" và kết quả rà trùng.

## Finding 2: Đặt Server Action trong `components/home-sections/` làm vỡ test "client-safe" (High)
- **Góc nhìn:** Chạy song song + đúng sai
- **Bằng chứng:** `apps/web/test/home-sections/views-client-safe.test.tsx:34-40` đọc mọi file `.ts/.tsx` trong `src/components/home-sections` và cấm chuỗi `next/headers|api-client-server|web-env`. Theo ma trận P4, `newsletter-subscribe-action.ts` được tạo đúng thư mục đó, mà file này cần `headers()` (từ `next/headers`) và `apiPost` (từ `api-client-server`). `newsletter-client-ip.ts` cũng sẽ vỡ test nếu tự import `headers()`.
- **Hậu quả:** P4 đỏ. Muốn xanh thì người làm phải nới regex hoặc thêm ngoại lệ, tức là làm yếu chính lớp bảo vệ ngăn view kéo code server vào bundle của khung xem trước admin.
- **Sửa plan:** Chuyển action ra ngoài thư mục view, ví dụ `apps/web/src/lib/newsletter/subscribe-newsletter-action.ts` (`'use server'`), và ghi rõ P4 sở hữu. Hiện `W/lib/**` đang nằm trong danh sách "Không ai sửa", cần thêm ngoại lệ. Không đặt trong `app/(public)/` vì P3 sở hữu thư mục đó. Giữ `newsletter-client-ip.ts` là hàm thuần (nhận chuỗi header, trả IP); phần đọc `headers()` để trong action. Thêm bước "không sửa regex của `views-client-safe`".

## Finding 3: Bố cục mặc định (Q3) bật form thu email trước khi câu đồng ý được duyệt (High)
- **Góc nhìn:** Bảo mật/tuân thủ + UX
- **Bằng chứng:** Q3 khuyên đưa `NewsletterSignup` vào `DEFAULT_HOME_CONTENT` ngay ở P1. Q4 ghi "site chưa có trang chính sách", "nên có luật sư xem trước go-live", và "Chưa có: dùng câu mặc định trong P1, link để trống". Bố cục mặc định là thứ khách thấy khi chưa đăng gì (`default-home-content.ts:7`, `usingDefault`).
- **Hậu quả:** Deploy xong là trang chủ production tự hiện form và bắt đầu lưu email kèm câu đồng ý chưa ai duyệt, không có link chính sách, dù admin chưa thao tác gì. Kèm theo đó, `Gallery` (mới nhất) và `OutfitList` "Outfit khác" (cũng mới nhất) trong cùng bố cục mặc định sẽ hiện trùng outfit.
- **Sửa plan:** Bỏ `NewsletterSignup` khỏi `DEFAULT_HOME_CONTENT`. Resolver P2 bỏ section này khi settings chưa lưu `newsletterConsent`, nghĩa là admin phải chủ động lưu câu đồng ý thì form mới hiện; thêm test cho trường hợp này. Gallery trong bố cục mặc định: hoặc bỏ, hoặc đổi nguồn để không trùng `OutfitList`.

## Finding 4: Hai danh sách type cứng làm view mới phụ thuộc chéo P4↔P5 và chọn sai ảnh LCP (Medium)
- **Góc nhìn:** Chạy song song (phụ thuộc ngầm)
- **Bằng chứng:**
  - `use-section-preview-data.ts:16` có `DATA_TYPES` cứng, và `:76` trả section không có `data` với các type không nằm trong set. Plan để P5 thêm Gallery/NewsletterSignup vào set, trong khi view P4 lại đọc `section.data.items` / `section.data.consent`.
  - `home-section-list.tsx:18` có `TEXT_ONLY_TYPES = ['Faq','Commitments']`, và `:30` lấy section đầu tiên không nằm trong set làm LCP. Plan P4 chỉ nói "tính LCP cho CampaignBanner, Gallery", không nhắc Marquee hay NewsletterSignup.
- **Hậu quả:** (a) Khi P4 xong mà P5 chưa (hoặc P5 bị rollback riêng), khung xem trước admin lỗi `TypeError` ngay lúc thêm section Gallery hoặc Đăng ký nhận tin. (b) Bố cục có Marquee ở đầu (kiểu editorial hay làm) thì Marquee bị chọn làm LCP, hero bên dưới mất `fetchPriority`. P6 sẽ đỏ tiêu chí "một ảnh ưu tiên".
- **Sửa plan:** P1 thêm cờ vào `HOME_SECTION_META` (ví dụ `resolvesData`, `hasImage`). P4 và P5 suy hai set đó từ meta thay vì liệt kê tay; P1 tự thêm test. Cách khác: chuyển dòng `DATA_TYPES` sang P1 và yêu cầu view P4 chịu được `data` thiếu.

## Finding 5: Thiếu field cho eyebrow/tiêu đề của Commitments và FeaturedLookbook (Medium)
- **Góc nhìn:** Đúng sai (contract) + cấu hình động
- **Bằng chứng:** Bảng view P4 ghi "`CollectionTiles, TextWithImage, Faq, Commitments, FeaturedLookbook` | eyebrow + tiêu đề serif". P1 chỉ thêm `eyebrow?` cho CollectionTiles, OutfitList, TextWithImage, Faq và slide hero. `commitments-section.ts:31-36` không có title ở cấp section; view dùng `HOME_SECTION_META.Commitments.label` làm `aria-label` (`commitments-view.tsx:12`). `featured-lookbook-section.ts` cũng không có title.
- **Hậu quả:** Người làm P4 chỉ còn hai cách: viết cứng chữ eyebrow/tiêu đề (trái luật cấu hình động), hoặc đòi P1 sửa contract giữa Wave 2.
- **Sửa plan:** P1 thêm `eyebrow?` và `title?` cho Commitments, thêm `eyebrow?` cho FeaturedLookbook (tiêu đề vẫn là tên outfit), có field spec và test. Nếu không thêm thì xoá hai type này khỏi dòng bảng P4.

## Finding 6: Đăng ký lại xoá mất dấu vết đồng ý/huỷ (Medium)
- **Góc nhìn:** Bảo mật (toàn vẹn bản ghi đồng ý)
- **Bằng chứng:** Theo P2, khi email "đã `unsubscribed`" thì chuyển sang `subscribed`, ghi snapshot mới và xoá `unsubscribedAt`. Endpoint public gọi thẳng được qua Caddy `/api/*` (`Caddyfile:27-28`) và là single opt-in. Trong khi đó P5 giải thích lý do giữ bản ghi khi huỷ là "chặn thêm lại khi nhập CSV cũ".
- **Hậu quả:** Bất kỳ ai cũng đăng ký lại được một email đã huỷ (kể cả email do admin huỷ theo yêu cầu). Lần đồng ý cũ, thời điểm huỷ và người huỷ đều bị ghi đè, không còn gì để chứng minh khi có khiếu nại.
- **Sửa plan:** Thêm lịch sử chỉ ghi nối, không ghi đè: `consentEvents[]` có giới hạn số phần tử (`subscribe|unsubscribe`, `at`, `textVersion`, `actor: 'self'|'admin'`), hoặc tách collection riêng. Không xoá `unsubscribedAt` cũ. Test P2 kiểm lịch sử còn nguyên sau chuỗi huỷ → đăng ký lại. Xoá cứng vẫn xoá hết, đúng mục đích.

## Finding 7: e2e test 429 bất khả thi hoặc chập chờn trên môi trường dev (Medium)
- **Góc nhìn:** Chạy song song (có xanh độc lập được không) + test
- **Bằng chứng:** `playwright.config.ts:4` chạy vào server có sẵn (không có `webServer`), nên spec không đổi được env của API. Gate trong plan dùng `E2E_BASE_URL=http://localhost:3000` (`next dev`), lúc này API ở NODE_ENV development, không bật `trust proxy` (`create-app.ts:31`), nên mọi request chung một bucket. Bộ đếm của express-rate-limit nằm trong RAM, sống trọn cửa sổ 15 phút. Ngay trước đó, P4 bước 9 ("gửi 11 lần") và P2 bước 10 (curl 11 lần) cũng xài hết quota này.
- **Hậu quả:** P6 đã dùng hết lượt thì các spec "ok" lần chạy kế (hoặc lúc retry) nhận `rate`. Hướng "dùng env nhỏ riêng cho e2e" trong P6 không làm được từ phía test.
- **Sửa plan:** Bỏ case 429 khỏi e2e. 429 đã được phủ bởi vitest P2 (production mode + XFF) và test unit action (map 429 → `rate`). Ghi trong P6 tổng số lần submit của e2e phải nhỏ hơn `NEWSLETTER_RATE_LIMIT_MAX_PER_IP`. Trong `deployment-guide`, hướng dẫn chạy API dev với giới hạn cao khi chạy e2e, và nhắc khởi động lại API sau khi thử tay.

## Finding 8: Chuỗi IP thật (Caddy → web → API) không có bước nào kiểm chạy thật (Medium)
- **Góc nhìn:** Bảo mật (rate limit)
- **Bằng chứng:** Risk table P2 viết "P6 e2e kiểm request đi qua web", nhưng P6 chạy trên `next dev` không có Caddy và `trust proxy` tắt (xem Finding 7), nên không kiểm được. Test P2 chỉ gửi XFF thẳng vào API.
- **Hậu quả:** Nếu `newsletter-client-ip` lấy sai phần tử, hoặc sau này đặt CDN trước Caddy (Caddy sẽ ghi XFF = IP của CDN do chưa khai `trusted_proxies`), toàn bộ khách dùng chung một bucket: 10 lượt/15 phút cho cả site. Không test nào bắt được.
- **Sửa plan:** P6 thêm smoke test trên stack compose prod (`:8080` qua Caddy). Gửi từ 2 container khác nhau trên network docker, đi qua web (Server Action) và qua `/api/public/newsletter`, rồi kiểm header `RateLimit` giảm theo từng nguồn riêng. `deployment-guide` (P2) ghi rõ: có CDN/LB phía trước thì phải khai `trusted_proxies` cho Caddy.

## Finding 9: Plan mosaic Gallery mơ hồ, mẫu span cứng lệch với `count` mà admin chỉnh (Medium)
- **Góc nhìn:** Bước làm mơ hồ + UX
- **Bằng chứng:** P4 chỉ ghi "span theo vị trí, không `grid-auto-flow: dense`"; checklist I2 ghi "mẫu cố định trong view". `count` admin chỉnh được trong 1-12 (`MAX_GALLERY_ITEMS`), mặc định 7. Ngoài ra API có thể trả ít item hơn `count` (ít outfit, bộ sưu tập nhỏ).
- **Hậu quả:** Với n = 3, 5, 9..., mẫu cố định để lại lỗ trống, và vì không có `dense` nên lưới bị thủng thấy rõ. Người làm phải tự nghĩ ra thuật toán.
- **Sửa plan:** Định nghĩa mẫu là chu kỳ lặp, ví dụ span theo `index % 7`, kèm quy tắc cho hàng cuối chưa đủ (ô cuối giãn hết hàng). Thêm test unit render n = 1..12, kiểm không có cột trống ở hàng cuối, hoặc ít nhất kiểm class span theo bảng.

## Finding 10: Tự tăng version câu đồng ý bị race, và bị tăng ngầm qua `OPTIONAL_KEYS` (Low)
- **Góc nhìn:** Bảo mật (toàn vẹn đồng ý)
- **Bằng chứng:** `updateSettings` đọc, so sánh rồi ghi bằng `findOneAndUpdate` không có điều kiện (`settings-service.ts:71-92`). Plan dự định `nextVersion()` đọc version rồi cộng 1. Ngoài ra `OPTIONAL_KEYS` (`:19-27`) sẽ `$unset` key nào không được gửi lên. Nếu `newsletterConsent` cũng thuộc diện này thì form cũ lưu settings (lúc P2 đã xong mà P5 chưa) sẽ xoá câu đồng ý, câu quay về mặc định và version tăng mà không ai biết. Đổi `privacyHref` (đổi chính sách) cũng không làm tăng version.
- **Sửa plan:** Tăng version bằng update có điều kiện (`{ 'newsletterConsent.text': { $ne: text } }` + `$inc`), hoặc dùng pipeline update. Không `$unset` `newsletterConsent` khi request thiếu key này. Cho phần version bao gồm cả `privacyHref`. Viết test hai lần lưu đồng thời.

## Finding 11: Cache trang chủ cũ làm mọi lượt đăng ký dính 409 (Low)
- **Góc nhìn:** Đúng sai
- **Bằng chứng:** Trang chủ lấy section qua `apiGet` có tag `home` cộng `safetyRevalidate` (`public-home-loaders.ts:7-9`). Câu đồng ý mới chỉ tới khách khi webhook revalidate chạy thành công (`admin-settings-routes.ts:17`).
- **Hậu quả:** Nếu webhook lỗi, form vẫn gửi version cũ, mọi lượt bị 409 → `error`, kéo dài cho tới `PUBLIC_REVALIDATE_SECONDS`.
- **Sửa plan:** Khi gặp 409, action gọi `revalidateTag(PUBLIC_CACHE_TAGS.home, { expire: 0 })` trước khi `redirect`; thêm nhánh này vào test action.

## Finding 12: Đổi tên pagination tạo churn mà vẫn chưa hết trùng lặp (Low)
- **Góc nhìn:** YAGNI/DRY
- **Bằng chứng:** Hiện đã có 2 bản gần như giống hệt nhau: `components/admin/pagination-links.tsx` (outfit) và `collections/collection-pagination.tsx` (comment ghi "Same markup as the outfit list pager"). P5 chỉ đổi tên một bản rồi xoá file cũ, phải sửa 3 import và 1 test.
- **Sửa plan:** Chọn một trong hai: import thẳng `CollectionPagination` (0 churn), hoặc gom luôn `PaginationLinks` (sửa thêm `outfits/page.tsx`). Đừng dừng ở giữa.

## Finding 13: Ma trận sở hữu thiếu file mà P4 sẽ sửa (Low)
- **Góc nhìn:** Chạy song song
- **Bằng chứng:** P4 restyle cả FeaturedLookbook và rail, nhưng ma trận không liệt kê `components/home-sections/featured-lookbook-view.tsx`, `outfit-card-rail.tsx`, `scroll-rail.tsx`. Nghĩa là con số "228 đường dẫn, 2 trùng" chưa phủ đủ. Glob trong `plan.md` có phủ, nhưng script rà trùng chỉ đọc đường dẫn trong backtick.
- **Sửa plan:** Bổ sung 3 file này (M?) cho P4 rồi chạy lại script rà trùng.

## Finding 14: Câu báo đăng ký thành công bị viết cứng (Low)
- **Góc nhìn:** Cấu hình động
- **Bằng chứng:** Theo P4, "thông báo kết quả" nằm cố định trong `home-section-copy.ts`. Câu `ok` mang tính marketing (ví dụ "Kiểm tra hộp thư để nhận ưu đãi"), không phải nhãn kỹ thuật.
- **Sửa plan:** Thêm `successMessage?` (<= 160 ký tự) vào props của `NewsletterSignup` (P1), lấy câu trong `home-section-copy.ts` làm mặc định. Ba câu `invalid/rate/error` giữ cố định.

---

## Câu hỏi còn mở
- Khi đã có lịch sử đồng ý (F6), một email do admin huỷ có được tự đăng ký lại qua form public không, hay phải chặn? Cần chủ repo chốt.
- Spike PRG/hash khi tắt JS: kết quả có thể đổi vị trí vùng thông báo, cần cập nhật I4 sau spike.
- `Mail` trong `lucide-react@1.70.0`: hook chặn đường dẫn `node_modules` nên đợt này chưa kiểm lại, đang tin theo plan.
