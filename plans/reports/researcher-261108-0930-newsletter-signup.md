# Research: Form đăng ký nhận tin (newsletter signup)

Ngày: 2026-11-08 | Phạm vi: apps/api (Express + mongoose + zod + express-rate-limit + helmet), apps/web (Next.js 16), packages/shared

## Tóm tắt

- **Pháp lý:** Luật Bảo vệ dữ liệu cá nhân 2025 (số 91/2025/QH15 theo nguồn thứ cấp) có hiệu lực 01/01/2026, đang áp dụng. Consent phải rõ ràng, cụ thể, bên thu chịu chứng minh. Chưa đọc được nguyên văn, cần đối chiếu.
- **Chọn:** single opt-in + checkbox không tick sẵn + lưu bằng chứng consent. Double opt-in để sau, vì chưa có provider gửi mail xác nhận.
- **Chống abuse:** honeypot + per-IP rate limit (tái dùng pattern có sẵn) + unique index + response đồng nhất. Không CAPTCHA bên thứ ba.
- **Submit:** Server Action (web) gọi API server-to-server. Không browser POST trực tiếp, không native form POST tới API.
- **Admin:** list phân trang server-side theo pattern collections. CSV stream + escape công thức. "Hủy" = đổi status, giữ suppression. Xóa cứng chỉ cho yêu cầu xóa dữ liệu.
- **Dependency mới:** không cần.

---

## 1. Pháp lý Việt Nam

| Hạng mục | Kết quả | Nguồn | Mức tin cậy |
|---|---|---|---|
| Luật BVDLCN 2025, hiệu lực 01/01/2026 | Có hiệu lực | https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html | Trung bình (snippet, chưa đọc toàn văn) |
| Số hiệu 91/2025/QH15 | Đúng theo snippet | cùng nguồn trên | Trung bình |
| ND 13/2023 còn hiệu lực | Nguồn tháng 8/2025 nói chưa bị bãi bỏ rõ ràng | https://lsvn.vn (tag "luat bao ve du lieu ca nhan 2025") | Thấp, cần kiểm tra |
| Nghị định hướng dẫn mới (tên trong URL: 356/2025/NĐ-CP) | Chưa xác minh nội dung | https://lsvn.vn/tag/nghi-dinh-3562025ndcp.html | Chưa xác minh |
| ND 13 Điều 11: consent rõ ràng, cụ thể; hình thức gồm đánh dấu ô đồng ý | Có | Hướng dẫn Ban QL KCN Hà Nam (PDF, không phải văn bản gốc): https://bqlckcn.hanam.gov.vn/... | Trung bình |
| ND 13 Điều 11: bên kiểm soát chịu trách nhiệm chứng minh consent | Có | https://hethongphapluat.com/nghi-dinh-13-2023-nd-cp-ve-bao-ve-du-lieu-ca-nhan/dieu-11 (snippet) | Trung bình |
| Quyền rút consent, ngừng xử lý sau khi rút | Có, nhưng các nguồn dẫn số khoản khác nhau (Điều 9 khoản 4 hoặc Điều 12) | https://hethongphapluat.com/nghi-dinh-13-2023-nd-cp-ve-bao-ve-du-lieu-ca-nhan/dieu-12 (snippet) | Thấp-trung bình |

**Mức tối thiểu đề xuất** (suy ra từ các nguồn trên, không phải tư vấn pháp lý):

1. Checkbox **không tick sẵn**, kèm câu mục đích cụ thể. Ví dụ: "Nhận email về bộ sưu tập và ưu đãi mới. Xem [chính sách bảo mật]". Nút submit một mình không đủ làm consent.
2. Mục đích khai rõ: chỉ email marketing/newsletter. Không dùng cho mục đích khác mà không hỏi lại.
3. Có cách hủy trong mọi email, và endpoint hủy không cần đăng nhập. Hủy phải dễ như đăng ký.
4. Bản ghi consent: `email`, `consentedAt`, `consentTextVersion`, `consentText` (snapshot), `source` (vị trí form), `status`, `unsubscribedAt`.
5. **Không lưu IP thô** trong bản ghi. IP chỉ dùng trong bộ nhớ của limiter (mục 3). Đây là đề xuất để giảm dữ liệu thu thập.
6. Nội dung consent lưu trong settings DB (admin sửa được), không hard-code (xem mục "Cấu hình động").

**Chưa xác minh:** PDPL 2025 có yêu cầu gì khi dùng provider nước ngoài (chuyển dữ liệu ra nước ngoài, hồ sơ đánh giá tác động). Cần luật sư.

---

## 2. Single vs double opt-in

| | Single opt-in | Double opt-in |
|---|---|---|
| Được | Đăng ký 1 bước, tỷ lệ đăng ký cao. Không cần mail provider | Bằng chứng mạnh: chủ email tự xác nhận. Ít email giả, ít spam complaint |
| Mất | Email của người khác có thể bị đăng ký (rủi ro spam, bằng chứng yếu hơn) | Cần provider gửi mail xác nhận ngay. Thêm 1 bước |
| Điều kiện hiện tại | Chạy được ngay | **Bị chặn**: không có provider nên không gửi được mail xác nhận |

**Xếp hạng:**
1. **Single opt-in + checkbox + bản ghi consent** (chọn). Khi có provider, thêm `status: 'pending'` và token xác nhận, bật bằng env. Mongo không cần migration cho field mới.
2. Double opt-in ngay: đúng về pháp lý hơn, nhưng không triển khai được khi chưa có provider.
3. Single opt-in không lưu bằng chứng: loại, vì không chứng minh được consent.

**Mở rộng:** tách `subscriber store` (mongoose) khỏi `gửi mail`. Giai đoạn gửi mail sau chỉ thêm 1 service gọi provider. Không thêm abstraction trước khi cần (YAGNI).

---

## 3. Chống abuse (không CAPTCHA bên thứ ba)

| Biện pháp | Thực hiện | Bằng chứng trong repo | Ghi chú |
|---|---|---|---|
| Honeypot | Input `website` ẩn (CSS, `tabIndex=-1`, `autoComplete="off"`). Có giá trị thì trả success giả, không ghi DB | Không có sẵn | Chặn bot đơn giản. Yếu với bot nhắm đích |
| Per-IP limiter | Dùng `rateLimit` + `ipKeyGenerator` như login | `apps/api/src/middleware/login-rate-limit-middleware.ts:38-47` | Tách config riêng, không dùng chung limiter login |
| Config limiter | Hàm `getNewsletterRateLimit()` đọc env, theo mẫu `getLoginRateLimit` | `apps/api/src/lib/runtime-defaults.ts:9-24` | Mặc định đề xuất 10 yêu cầu/15 phút (ví dụ, chỉnh được) |
| Normalize email | `normalizeEmail` (trim + lowercase) + zod `.email()` + max 254 | `apps/api/src/lib/device-cookie.ts:8` | Không bỏ dấu chấm/`+` của Gmail (làm sai định danh) |
| Unique index | `unique: true` trên `email`, theo mẫu slug | `apps/api/src/models/collection-model.ts:20` | Insert bằng `updateOne({email}, {$setOnInsert}, {upsert:true})` |
| Race / trùng | Bắt lỗi 11000 trong service, coi là thành công | `apps/api/src/services/collection-service.ts:22,30-37` (mẫu) | Nếu để rơi xuống handler sẽ thành 409 "CONFLICT", lộ email đã tồn tại (`error-handler-middleware.ts:32`) |
| Response đồng nhất | Luôn `202 {ok:true}` + cùng thông điệp, kể cả trùng hoặc honeypot | — | 400 chỉ cho định dạng sai, không lộ thông tin về email đã tồn tại |
| Body size | JSON limit 1mb đã có | `apps/api/src/create-app.ts:14` | Đủ |
| Origin | Chỉ chặn khi có header `Origin` không hợp lệ | `apps/api/src/middleware/origin-check-middleware.ts:17-19` | Server-to-server không gửi `Origin`, nên qua được (xem mục 4) |

**Rủi ro IP khi đi qua Server Action:** `trust proxy` = 1 chỉ ở production (`create-app.ts:31`). Caddy chuyển `/api/*` trực tiếp tới API (`infra/caddy/Caddyfile:27-28`). Nếu web gọi API, `req.ip` là IP container web. Khi đó mọi người dùng chung một bucket. Cần forward `X-Forwarded-For` (mục 4). Cần test: suy luận từ cách Express xử lý hop count, chưa chạy thử.

**Giới hạn:** `express-rate-limit` mặc định lưu bộ nhớ theo process. Ổn khi có 1 instance API. Nhiều replica thì mỗi instance đếm riêng.

---

## 4. Cách web submit form

| Phương án | Ưu | Nhược | Xếp hạng |
|---|---|---|---|
| **A. Server Action** (`'use server'`) gọi API server-to-server | Hoạt động không cần JS (form `action` của React). Không CORS. API không lộ cho form. Khớp repo: `apps/web/src/app/admin/_lib/admin-preference-actions.ts:1` | Thêm 1 hop. Phải forward IP. Cần thêm helper POST | **1** |
| B. Browser `fetch` tới `/api/public/newsletter` | Đơn giản, IP đúng. Mẫu sẵn: `apps/web/src/lib/api-client-browser.ts:10` | Không hoạt động khi tắt JS | 2 |
| C. Native `<form method=post action=/api/...>` | Không cần JS | API chỉ parse JSON (`create-app.ts:14`), không parse form-urlencoded. Người dùng thấy JSON thô | Loại |

**Thiết kế đề xuất (A):**

1. Component server (public) render `<form action={subscribeNewsletter}>` với `name="email"`, `name="website"` (honeypot), `name="source"` (hidden), checkbox consent.
2. `subscribeNewsletter` (Server Action): parse `FormData` bằng zod schema trong `packages/shared`, gọi `apiPost` mới trong `apps/web/src/lib/api-client-server.ts` (hiện chỉ có `apiGet`, dòng 20-40). Gửi kèm `X-Forwarded-For` lấy từ `headers()`.
3. Kết quả: **PRG (Post/Redirect/Get)**: `redirect('/<trang>?newsletter=ok|invalid|rate|error')`. Trang đọc query và render thông báo trong vùng form (`aria-live="polite"`). Cách này chạy cả khi không có JS.
4. Nút submit dùng `useFormStatus` (client nhỏ) để disable khi đang gửi. Docs Next.js xác nhận mẫu này: https://nextjs.org/docs/app/guides/forms (fetched 2026-11-08; có `useActionState`, `useFormStatus`, `aria-live`).

**Chưa xác minh:** hành vi `redirect()` và trả state khi tắt JS. Nguồn thứ cấp (DEV Community, PrimeStack) nêu có vấn đề với trả error state ở chế độ no-JS. Nên làm spike 1 form trước khi chốt. Docs chính thức trong lần fetch không khẳng định rõ phần no-JS.

---

## 5. Admin

**API** (theo `apps/api/src/routes/admin-collection-routes.ts` và `collection-service.ts:54-77`):

- `GET /api/admin/newsletter?q&status&page&size`: skip/limit, `size` theo `ADMIN_PAGE_SIZE_DEFAULT/MAX` (đã có trong env, `env-config.ts:34-35`), `escapeRegex` cho `q` (dùng lại helper, `collection-service.ts:20`).
  - Index `{status:1, createdAt:-1}`. Tìm email kiểu prefix (`^`) dùng được index. Tìm "chứa" phải quét. Chấp nhận được ở quy mô nhỏ.
- `GET /api/admin/newsletter/export.csv?status=`: stream bằng `find().lean().cursor()`, ghi từng dòng. Không tải hết vào RAM.
- Route nằm dưới router `admin` đã có `requireAdmin` (`create-app.ts:39-40`), không cần viết thêm auth.
- Link tải trực tiếp tới API qua Caddy, cookie same-origin. Không cần route proxy trong Next.

**CSV escape** (theo OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection, và WSTG: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Injection_Testing/21-Testing_for_CSV_Injection):

```ts
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const csvCell = (value: string): string => {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};
// Output: '﻿' (BOM, để Excel đọc đúng tiếng Việt) + header + rows, Content-Type text/csv; charset=utf-8
```

Lưu ý từ OWASP: Excel có thể bỏ quote khi lưu lại, nên escape có thể mất tác dụng. Phương án thay thế là thêm tab vào đầu field trong dấu nháy. Email hợp lệ hiếm khi bắt đầu bằng ký tự đó, nhưng vẫn escape để có quy tắc đơn giản.

**Hủy và xóa:**

| Thao tác | Hành vi | Trade-off |
|---|---|---|
| Hủy (`PATCH /:id/unsubscribe`) | Đổi `status` thành `unsubscribed`, giữ bản ghi | Giữ suppression: email không bị thêm lại khi import CSV cũ. **Khuyến nghị mặc định** |
| Xóa cứng (`DELETE /:id`) | Xóa bản ghi | Mất suppression. Dùng khi có yêu cầu xóa dữ liệu, cần ghi lý do |

**UI:** trang `apps/web/src/app/admin/(protected)/newsletter/page.tsx` theo mẫu `collections/page.tsx` (parse `searchParams`, fetch server-side). Tái dùng components trong `apps/web/src/components/admin/collections/` (filters, table, pagination). Pagination và filters đang gắn với collection. Khi thêm màn hình thứ 2, tách thành component chung (DRY), không làm trước.

**Nút xóa:** theo mẫu `collection-delete-action.tsx`, có xác nhận trước khi xóa.

---

## Cấu hình động (theo luật dự án)

| Giá trị | Nơi lưu | Ghi chú |
|---|---|---|
| Nội dung consent, version, mục đích, link chính sách | Settings singleton (`apps/api/src/models/settings-model.ts:4-18`), thêm field, admin sửa qua admin-settings | Mỗi lần đổi nội dung tăng version. Bản ghi lưu snapshot |
| Rate limit: window, max | Env, theo mẫu `runtime-defaults.ts` | Giá trị ví dụ: 10 / 15 phút |
| Page size admin | Env `ADMIN_PAGE_SIZE_*` (đã có) | Dùng lại |
| Bật double opt-in | Env | Bật khi có provider |
| Danh sách `source` hợp lệ | Settings hoặc enum cấu hình | Chỉ cho phép giá trị trong danh sách |
| Tên field honeypot | Hằng số code | Ngoại lệ: không phải giá trị nghiệp vụ |
| Email tối đa 254 ký tự | Hằng số code (RFC 5321) | Ngoại lệ: giới hạn kỹ thuật |

---

## Dependency

Không thêm npm dependency. Dùng lại `express-rate-limit`, `zod`, `mongoose`, `node:crypto`. CSV tự viết khoảng 20 dòng, không cần `csv-stringify`.

## Trade-off và adoption risk

- `express-rate-limit`: đang dùng trong repo, không phải dependency mới.
- Next.js 16 Server Actions: đang dùng trong repo (`admin-preference-actions.ts`). Docs cập nhật 2026-10-06 (fetched).
- Honeypot + rate limit không đủ với botnet phân tán. Nếu spam tăng, lúc đó mới cân nhắc CAPTCHA (Turnstile có free tier). Đây là dependency bên ngoài, ngoài phạm vi hiện tại (YAGNI).

## Hạn chế của nghiên cứu này

- Không đọc toàn văn Luật 91/2025/QH15 và ND 13/2023. Chỉ dùng snippet từ trang thứ cấp (luatvietnam, lsvn, hethongphapluat). Điều khoản cụ thể có thể sai số hiệu.
- Không chạy spike cho hành vi no-JS của Server Action với `redirect()`.
- Không test luồng `X-Forwarded-For` qua web → API. Có sẵn mẫu test: `apps/api/test/auth-rate-limit.test.ts`.
- Không so sánh provider cụ thể (chưa có).
- Không đánh giá PDPL về chuyển dữ liệu ra nước ngoài.

## Câu hỏi chưa giải quyết

1. Nguyên văn điều khoản consent và rút consent theo Luật 91/2025 và nghị định hướng dẫn mới. Cần luật sư xác nhận trước khi go-live.
2. Có cần hồ sơ đánh giá tác động / thông báo cho cơ quan chức năng khi xử lý email marketing không. Chưa xác minh.
3. Tên pháp nhân, địa chỉ liên hệ hiển thị trong email và trang chính sách. Cần chủ repo cung cấp.
4. Chọn email provider nào. Ảnh hưởng đến double opt-in và chuyển dữ liệu ra nước ngoài.
5. Có chạy nhiều API replica không. Ảnh hưởng đến rate limit lưu bộ nhớ.
6. Chốt "hủy" là mặc định, "xóa cứng" chỉ cho yêu cầu xóa dữ liệu. Cần chủ repo xác nhận.
7. Có cần lưu IP thô làm bằng chứng consent không. Đề xuất: không lưu.
8. Spike no-JS: Server Action + PRG `redirect()` có hoạt động khi tắt JS trên Next 16 không.

**Status:** DONE_WITH_CONCERNS

**Summary:** Khuyến nghị single opt-in + checkbox không tick + bản ghi consent (text version, timestamp, source), server action PRG gọi API với forwarded IP, honeypot + per-IP limiter tái dùng pattern login, unique index với idempotent response, admin list/CSV stream theo pattern collections, không thêm dependency. Pháp lý dựa trên nguồn thứ cấp, cần đối chiếu nguyên văn và spike no-JS trước khi triển khai.
