# Phase 2: API (resolver section mới, newsletter, settings đồng ý)

## Context Links
- Contract P1: `home-sections/{gallery,newsletter-signup,campaign-banner,marquee}-section.ts`, `home-layout-contract.ts`, `newsletter-contract.ts`, `settings-schemas.ts` (`newsletterConsent`), `api-contract.ts`.
- Research newsletter: mục 3 (chống abuse), 4 (submit), 5 (admin, CSV), "Cấu hình động".
- Code mẫu: `apps/api/src/middleware/login-rate-limit-middleware.ts:38-47` (limiter IP), `lib/runtime-defaults.ts:9-24` (env), `services/collection-service.ts:20-77` (list, `escapeRegex`, lỗi 11000), `routes/admin-collection-routes.ts`, `services/home-section-outfit-list-resolver.ts` (latest/manual/collection), `services/settings-service.ts:19,71` (`OPTIONAL_KEYS`, `updateSettings`), `create-app.ts:31` (`trust proxy` production).
- Hạ tầng: `infra/caddy/Caddyfile:27-28`, `infra/docker-compose.yml:99-102` (env limiter đăng nhập).
- Caddy `reverse_proxy` bỏ qua `X-Forwarded-*` từ client khi không khai `trusted_proxies` (https://caddyserver.com/docs/caddyfile/directives/reverse_proxy, đọc 2026-11-08).

## Overview
- Priority: P1. Status: Completed. Effort: 12h. Chờ P1. Song song P3, P4, P5.
- Resolver thật cho Gallery, NewsletterSignup, Marquee, CampaignBanner. Model + API newsletter (public subscribe, admin list/CSV/huỷ/xoá). Settings đồng ý có version tự tăng. Env limiter + docs env.

## Key Insights
- Đường IP: trình duyệt → Caddy (đặt XFF = IP thật, bỏ giá trị client gửi) → web Server Action → API (XFF do web chuyển). API production `trust proxy` = 1 nên `req.ip` = phần tử cuối của XFF = IP thật. Dev không có Caddy: mọi request chung một bucket (chấp nhận, ghi docs).
- Endpoint public newsletter vẫn gọi thẳng được qua Caddy `/api/*`: cùng limiter, cùng validate, nên an toàn. Bắt buộc `consent === true` ở API, không tin web.
- Trùng email: lỗi 11000 phải bắt trong service, không để rơi xuống handler (thành 409 lộ email đã tồn tại, `error-handler-middleware.ts:32`).
- `escapeRegex`/`isDuplicateKey` đang chép 3 nơi (`collection-service.ts:20,22`, `outfit-service.ts:18,63`, `home-layout-service.ts:50`). Newsletter là nơi thứ 4 → gom vào `lib/mongo-query-helpers.ts` (follow-up (c) của plan trước).
- Version câu đồng ý do API quản: lưu settings mà `text` hoặc `privacyHref` khác bản đã lưu thì `version + 1`. Admin không phải nhớ tăng version. Tăng nguyên tử bằng update có điều kiện (`$or` các trường `$ne` + `$inc`), không đọc-rồi-ghi (`settings-service.ts:71-92` hiện ghi không điều kiện; red team F10).
- `newsletterConsent` **không** vào `OPTIONAL_KEYS` (`settings-service.ts:19-27`): request thiếu key thì giữ nguyên, không `$unset` (form cũ chưa có nhóm Bản tin không xoá mất câu đồng ý). **Đã đổi 2026-11-08:** công tắc bật/tắt form. PUT thiếu `newsletterConsent` thì xoá câu (`settings-service.ts:91`), `newsletterConsentVersion` vẫn giữ và tăng đơn điệu. Xem plan.md, mục Kết quả.
- Bố cục mặc định (Q3 đã chốt) có NewsletterSignup, nhưng form chỉ hiện khi settings đã có `newsletterConsent` do admin chủ động lưu (red team H3). Câu mặc định shared không bao giờ tự bật form.
- Featured tối đa 1 outfit, nên Gallery dùng `latest | collection | manual` (Q5 đã chốt), dùng lại query của outfit-list resolver.
- Gallery `latest` và OutfitList `latest` cùng bố cục mặc định sẽ trùng outfit. Cách rẻ: resolve hai lượt; lượt 2 chỉ gồm Gallery `latest`, loại slug đã hiện ở OutfitList trong cùng bố cục, lấy dư số lượng bằng số slug bị loại. Thêm ~15 dòng, không thêm prop.
- Lịch sử đồng ý chỉ ghi nối (red team F6): mảng `events[]` trong bản ghi (`type`, `at`, `actor`, `source?`, `textVersion?`, `consentText?` cho subscribe). Mảng chỉ dài thêm khi trạng thái đổi; mỗi vòng cần một lần huỷ (admin) nên không cần cắt. Đăng ký lại sau khi huỷ được phép (chủ repo chốt) với đồng ý mới; lần đồng ý và lần huỷ cũ vẫn còn trong `events`.

## Requirements
### Functional
- Resolver (`home-section-resolver-service.ts`, tuần tự 2/2 sau P1):
  - `Marquee`: `items.length > 0` thì giữ, không thì bỏ.
  - `CampaignBanner`: `attachSectionImageUrls` (như TextWithImage).
  - `Gallery`: `data.items` = `PublicOutfitCardDto[]` theo `source`, `count` kẹp `MAX_GALLERY_ITEMS`; `latest` loại outfit đã hiện ở OutfitList cùng bố cục (lượt 2); rỗng thì bỏ section.
  - `NewsletterSignup`: settings chưa có `newsletterConsent` đã lưu → bỏ section. Có thì `data.consent` = câu đã lưu + version. Lấy một lần mỗi request (lazy trong `ResolveContext`).
- Model `NewsletterSubscriber`: `email` (unique, lowercase), trạng thái hiện tại (`status`, `source`, `consentedAt`, `consentText`, `consentTextVersion`, `unsubscribedAt?`), `events[]` chỉ ghi nối, timestamps. Index `{ status: 1, createdAt: -1 }`. Không lưu IP.
- `POST /api/public/newsletter` (limiter → validate → service):
  - honeypot `website` có giá trị: trả 202, không ghi DB;
  - `consentTextVersion` khác bản hiệu lực: 409 `CONFLICT` (web hiện "thử lại", trang tải lại có câu mới);
  - chưa có: insert `subscribed` + snapshot + `events: [subscribe]`; đã `subscribed`: không đổi; đã `unsubscribed`: chuyển `subscribed`, snapshot hiện tại mới, `$push` event subscribe (event unsubscribe cũ giữ nguyên);
  - luôn `202 { ok: true }` khi hợp lệ; 400 chỉ khi sai định dạng; 429 khi vượt limiter.
- Admin (dưới router `requireAdmin`):
  - `GET /api/admin/newsletter?q&status&page&size`: `q` chứa (escape regex, lowercase), sort `createdAt` giảm, size theo `ADMIN_PAGE_SIZE_DEFAULT/MAX`.
  - `GET /api/admin/newsletter/export.csv?q&status` (cột cuối "Lịch sử": chuỗi gọn các event): stream `cursor()`, BOM `\uFEFF`, header cột tiếng Việt, ô bắt đầu `= + - @ \t \r` thêm `'`, bọc `"`, nhân đôi `"`. `Content-Disposition: attachment; filename="newsletter-YYYYMMDD.csv"`, `Cache-Control: no-store`.
  - `PATCH /api/admin/newsletter/:id/unsubscribe`: đổi status, đặt `unsubscribedAt`, `$push` event `unsubscribe` `actor: 'admin'` (idempotent: đã huỷ thì không thêm event).
  - `DELETE /api/admin/newsletter/:id`: xoá cứng, 204; log 1 dòng email đã che (mẫu `maskEmail`).
- Settings: lưu `newsletterConsent` (validate shared), tăng `newsletterConsentVersion` nguyên tử khi text/link đổi; thiếu key thì giữ nguyên; `getAdminSettings` trả version (`null` khi chưa lưu). Đổi settings đã revalidate `scope: 'all'` (`admin-settings-routes.ts:17`), trang chủ nhận câu mới.
- Env (đọc qua `runtime-defaults.ts`, mặc định là ví dụ): `NEWSLETTER_RATE_LIMIT_WINDOW_MINUTES=15`, `NEWSLETTER_RATE_LIMIT_MAX_PER_IP=10`.

### Non-functional
- Không dependency mới (CSV tự viết ~30 dòng). File < 200 dòng.
- Export không nạp hết vào RAM (cursor + `res.write`, tôn trọng backpressure bằng `once('drain')`).
- Thông điệp lỗi tiếng Việt như các route khác.

## Architecture
```
POST /api/public/newsletter
  newsletterRateLimit (ipKeyGenerator(req.ip), env)
  validateBody(newsletterSubscribeRequestSchema)
  newsletter-subscribe-service: honeypot? -> consent version check -> upsert theo trạng thái -> 202
GET /api/public/home -> resolveHomeSections
  lượt 1: mọi section trừ Gallery latest ; ctx.consent() lazy (null khi chưa lưu -> bỏ NewsletterSignup)
  lượt 2: Gallery latest -> home-section-gallery-resolver(exclude = slug OutfitList lượt 1)
Admin router /newsletter -> admin-newsletter-routes -> newsletter-admin-service (list, unsubscribe, delete)
                                                    -> newsletter-csv-export (cursor -> escape -> res.write)
PUT /api/admin/settings -> settings-service.updateSettings -> settings-newsletter-consent-service.saveConsent() (update có điều kiện + $inc)
```

## Related Code Files
- Create:
  - `apps/api/src/models/newsletter-subscriber-model.ts`
  - `apps/api/src/services/newsletter-subscribe-service.ts`, `newsletter-admin-service.ts`, `newsletter-csv-export.ts`, `settings-newsletter-consent-service.ts`, `home-section-gallery-resolver.ts`
  - `apps/api/src/routes/public-newsletter-routes.ts`, `admin-newsletter-routes.ts`
  - `apps/api/src/middleware/newsletter-rate-limit-middleware.ts`
  - `apps/api/src/lib/mongo-query-helpers.ts`
  - Test: `apps/api/test/newsletter-subscribe.test.ts`, `newsletter-rate-limit.test.ts`, `newsletter-admin.test.ts`, `newsletter-csv-export.test.ts`, `home-layout-new-sections-resolve.test.ts`, `settings-newsletter-consent.test.ts`
- Modify:
  - `apps/api/src/services/home-section-resolver-service.ts` (tuần tự 2/2), `home-section-resolve-context.ts`, `home-section-outfit-list-resolver.ts` (export `latestRecords`/manual dùng chung)
  - `apps/api/src/services/settings-service.ts`, `apps/api/src/models/settings-model.ts`
  - `apps/api/src/services/collection-service.ts`, `outfit-service.ts`, `home-layout-service.ts` (import helper chung)
  - `apps/api/src/lib/runtime-defaults.ts`, `apps/api/src/create-app.ts`, `apps/api/src/db/mongo-connection.ts` (`NewsletterSubscriberModel.init()`)
  - `apps/api/test/helpers/test-app.ts` (nếu cần dọn collection mới)
  - `.env.example`, `apps/api/.env.example`, `infra/docker-compose.yml` (truyền 2 env mới), `docs/deployment-guide.md`:
    - mục "Tham chiếu biến môi trường" > API: 2 env limiter;
    - mục "Xử lý sự cố": dev không có Caddy nên mọi request chung một bucket; khi chạy e2e đặt `NEWSLETTER_RATE_LIMIT_MAX_PER_IP` cao cho API dev và khởi động lại API sau khi thử tay (bộ đếm nằm trong RAM);
    - mục triển khai: đặt CDN/LB phía trước Caddy thì phải khai `trusted_proxies`, nếu không mọi khách chung IP của CDN (red team F8).
- Delete: không.

## Implementation Steps
1. `lib/mongo-query-helpers.ts` + đổi 3 service sang import. Chạy test API (không đổi hành vi).
2. `runtime-defaults.ts`: `getNewsletterRateLimit()`; middleware theo mẫu login (`standardHeaders: 'draft-8'`, handler `AppError(429, 'RATE_LIMITED', ...)`).
3. Model + `mongo-connection.ts` init. Service subscribe (3 nhánh trạng thái, `events` chỉ `$push`, bắt 11000 khi race = thành công).
4. Settings: model thêm `newsletterConsent` (`Mixed`) + `newsletterConsentVersion` (Number); service đồng ý (`getSavedConsent` trả `null` khi chưa lưu; `saveConsent` update có điều kiện + `$inc`). `updateSettings` gọi `saveConsent` khi có key, **không** đưa vào `OPTIONAL_KEYS`.
5. Route public + admin, đăng ký trong `create-app.ts` (`api.use('/public', ...)`, `admin.use('/newsletter', ...)`).
6. CSV export: escape theo OWASP, BOM, stream, test có ô `=cmd`, `"`, dấu tiếng Việt.
7. Resolver: Gallery (dùng lại query outfit-list, lượt 2 loại trùng OutfitList), NewsletterSignup (`ctx.consent()`, bỏ khi chưa lưu), Marquee, CampaignBanner; xoá 4 nhánh rỗng của P1.
8. Test:
   - subscribe: mới / trùng / huỷ rồi đăng ký lại (`events` còn đủ subscribe → unsubscribe(admin) → subscribe) / honeypot / thiếu consent (400) / sai version (409);
   - settings: lưu 2 lần đồng thời cùng text mới (`Promise.all`) → version chỉ +1; đổi `privacyHref` → +1; PUT thiếu `newsletterConsent` → giữ nguyên;
   - limiter: `startTestApp({ NODE_ENV: 'production' })` + `X-Forwarded-For` như `test/auth-rate-limit.test.ts:42`, hai IP khác bucket;
   - admin: list lọc `q`/`status`, phân trang, huỷ idempotent, xoá 204, 401 khi chưa đăng nhập;
   - resolve: bố cục đủ 11 type qua `GET /api/public/home`, Gallery rỗng bị bỏ, consent có version; DB trống (bố cục mặc định) + chưa lưu đồng ý → không có NewsletterSignup; Gallery mặc định không trùng slug với OutfitList.
9. Env: 2 file `.env.example`, `infra/docker-compose.yml`, `docs/deployment-guide.md`.
10. `pnpm lint && pnpm typecheck && pnpm test`. `curl` thử thật: subscribe 202, 11 lần liên tiếp cùng IP → 429, rồi khởi động lại API (xoá bộ đếm RAM trước khi phase khác thử). Không commit.

## Todo List
- [x] Helper Mongo chung
- [x] Limiter + env
- [x] Model + service subscribe
- [x] Settings đồng ý + version tự tăng
- [x] Route public/admin + create-app
- [x] CSV stream + escape
- [x] Resolver 4 type (thay nhánh rỗng)
- [x] Test + env docs + compose
- [x] lint/typecheck/test + curl (smoke compose PASS, xem tester-261108-editorial-redesign-e2e.md, mục Prod verification)

## Success Criteria
- Mọi test API cũ + mới xanh. `POST` hợp lệ luôn 202 (mới, trùng, honeypot); không có response nào phân biệt email đã tồn tại.
- Request thứ `MAX_PER_IP + 1` trong cửa sổ từ cùng IP nhận 429; IP khác vẫn 202 (test).
- CSV mở bằng Excel thấy đúng tiếng Việt (BOM), ô `=1+1` hiện dạng chữ `'=1+1` (test so chuỗi).
- `GET /api/public/home` với bố cục 11 type trả đúng thứ tự, Gallery có `data.items`, Newsletter có `data.consent.version`; chưa lưu đồng ý thì không có Newsletter.
- Huỷ → đăng ký lại: `events` dài 3, không event nào bị sửa.

## Risk Assessment
| Rủi ro | Khả năng × Tác động | Giảm thiểu |
|---|---|---|
| Sai IP sau proxy, mọi người chung bucket ở production | Trung bình × Trung bình | Test production-mode với XFF; P6 smoke test trên stack compose prod (qua Caddy); docs `trusted_proxies` khi có CDN |
| Spam phân tán vượt limiter IP | Thấp × Trung bình | Honeypot + unique; theo dõi số bản ghi; CAPTCHA để sau (YAGNI) |
| Nhiều replica API, limiter đếm riêng | Thấp × Thấp | Hiện 1 instance; ghi docs |
| Export lớn làm nghẽn | Thấp × Trung bình | Cursor + backpressure; filter theo status |
| Đổi câu đồng ý giữa lúc người dùng đang điền, hoặc cache trang chủ cũ | Thấp × Thấp | 409 → web expire tag `home` rồi báo thử lại (P4); trang tải lại có câu mới |
| Form thu email chạy trước khi câu đồng ý được duyệt | Trung bình × Cao | Resolver bỏ NewsletterSignup tới khi admin lưu đồng ý; test DB trống |

## Security Considerations
- Admin route sau `requireAdmin` (`create-app.ts:39-40`). Public route không cần auth, có limiter + honeypot + validate.
- Không lưu IP thô; email chỉ ở collection newsletter. Log xoá dùng email đã che.
- CSV chống formula injection (OWASP CSV Injection). `Cache-Control: no-store` cho file export.
- Không lộ email đã tồn tại (202 đồng nhất, bắt 11000 trong service).

## Rollback
- Xoá file mới, `git restore` file sửa. Collection `newsletter_subscribers` còn trong DB: giữ (dữ liệu đồng ý) hoặc xoá theo yêu cầu chủ repo; không ảnh hưởng phần khác. Field settings mới bị bỏ qua.

## Next Steps
- P4 đóng phase khi submit thật qua API. P5 đóng phase khi list/CSV/huỷ/xoá chạy thật. P6 e2e.
