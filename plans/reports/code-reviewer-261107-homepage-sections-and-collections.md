# Code review — Trang chủ section + Bộ sưu tập (đợt chưa commit)

Ngày: 2026-11-07 · Phạm vi: toàn bộ `git diff HEAD` + file untracked (72 file sửa, ~100 file mới) · Spec: `plans/261107-1341-homepage-sections-and-collections/`

## Điểm: 8/10

Kiểm chứng đã chạy: `pnpm typecheck` xanh, `pnpm lint` xanh (0 lỗi). Không chạy `pnpm test` / `pnpm e2e` trong review này (để cho bước test gate).

## Critical (bắt buộc sửa)

Không có lỗi bảo mật / mất dữ liệu chặn merge.

## Warning (nên sửa)

1. **Đăng lại bản không đổi làm mất bản "hoàn tác"** — `apps/api/src/services/home-layout-publish-service.ts:31-37`. Filter chỉ khoá `draftUpdatedAt`; publish lần 2 với cùng nháp (tab thứ hai, client retry, gọi API trực tiếp) ghi `previous = published` (giống hệt) → bản đăng trước thật bị mất. UI chặn (`home-editor-toolbar.tsx:52`) nhưng server không.
   Sửa: thêm điều kiện vào filter `$expr: { $ne: ['$draft', '$published'] }` (trả 409/200 no-op khi trùng), hoặc thêm `basePublishedAt` vào `publishHomeRequestSchema` và lock theo `publishedAt`.
2. **e2e teardown phá dữ liệu thật nếu trỏ nhầm DB** — `e2e/content.teardown.ts:12-17`. `resetHome` gỡ bản đăng hiện tại (bản gốc đã bị các spec publish đè, `previous` chỉ giữ 1 bản nên không khôi phục được), và unset footer/announcement/collections nav. `E2E_BASE_URL` có thể trỏ stack dùng chung.
   Sửa: (a) thêm project `content-setup` chạy trước `content-collections`: GET `/api/admin/home` + `/api/admin/settings` → ghi `test-results/content-snapshot.json`; (b) teardown khôi phục: nếu snapshot `usingDefault` → reset, ngược lại PUT draft = nội dung đã đăng → publish → PUT draft = nháp cũ; settings dùng `restoreSettings(snapshot)` có sẵn trong `e2e/support/admin-settings.ts:80`; (c) chặn chạy chuỗi content khi host khác `localhost` trừ khi đặt `E2E_ALLOW_CONTENT_RESET=1`. Lưu ý API hiện không có cách khôi phục y nguyên `previous` / `publishedAt` — chấp nhận được.
3. **N+1 request khi hiện tên outfit/bộ sưu tập trong editor** — `apps/web/src/components/admin/home-editor/use-entity-labels.ts:12-33`. Mỗi id một GET (tối đa 48 outfit/section), mỗi `GET /api/admin/collections/:id` lại tính `collectionUsage` (count + đọc layout, `collection-service.ts:46-53`). Lỗi mạng bị hiện thành "có thể đã bị xoá".
   Sửa: thêm `ids` (mảng objectId, max 48) vào `adminOutfitListQuerySchema` / `adminCollectionListQuerySchema`, tải tên một lần; lỗi mạng giữ trạng thái "Đang tải…"/retry thay vì "đã bị xoá". Gộp luôn logic tên trùng lặp ở `pickers/collection-picker.tsx:8-9`.
4. **Thêm outfit vào bộ sưu tập bỏ qua `MAX_COLLECTIONS_PER_OUTFIT`** — `apps/api/src/services/collection-membership-service.ts:26-31`. Outfit có thể vượt 24 → editor outfit sau đó lưu bị zod từ chối khi đổi membership.
   Sửa: `updateMany({ _id: { $in }, 'collectionIds.23': { $exists: false } }, ...)` hoặc kiểm và trả 400 có field.
5. **TOCTOU thêm outfit vs xoá bộ sưu tập** — `collection-membership-service.ts:27-30` + `collection-service.ts:121-125`. Kiểm `exists` rồi mới `$addToSet`; xoá chen giữa để lại id chết trên outfit, sau đó `assertCollectionsExist` (`outfit-service.ts:116`) chặn lưu outfit với lỗi khó hiểu.
   Sửa: sau `updateMany`, kiểm lại `exists`; nếu đã mất thì `$pull` lại. Hoặc `assertCollectionsExist` bỏ qua id chết đã có sẵn trên outfit.

## Suggestion

- `home-layout-publish-service.ts:64` `resetHome` / `home-layout-service.ts:107` `revertHomeDraft` không lock: tab cũ có thể xoá nháp mới của người khác. Thêm `baseUpdatedAt` như save/publish.
- `collection-delete-action.tsx:28` câu "Khối dùng bộ sưu tập này ở trang chủ sẽ tự ẩn" sai khi khối có nhiều bộ sưu tập (chỉ bộ bị xoá biến mất). Đổi thành "Bộ sưu tập này sẽ tự biến mất khỏi các khối trang chủ đang dùng nó".
- `components/home-sections/faq-view.tsx:10`: nhiều khối FAQ → nhiều `FAQPage` JSON-LD trên một trang (Google chỉ nhận một). Gộp ở `home-section-list.tsx` thành một script.
- `packages/shared/src/settings-schemas.ts:84-87`: các field chrome của `publicSettingsSchema` để optional "tạm thời" — API luôn trả, nên chuyển required và bỏ `?? DEFAULT_COLLECTIONS_LABEL` rải ở các trang (YAGNI).
- `collection-membership-service.ts:24` `MEMBERSHIP_WRITE` dùng lại cho `moveCollection` (`:58`) — tên gây hiểu nhầm; đặt `NO_TIMESTAMPS`.
- DRY: `escapeRegex` (`collection-service.ts:20`, `outfit-service.ts:18`) và `isDuplicateKey` (3 nơi) nên gom vào `apps/api/src/lib/`.
- Kích thước file: `apps/web/src/components/admin/home-editor/home-editor.module.css` 205 dòng; test >200 dòng: `settings-footer-editor.test.tsx` (233), `use-home-layout-actions.test.tsx` (223), `outfit-editor.test.tsx` (215), `home-layout-public-resolve.test.ts` (211). Tách CSS preview/banner ra module riêng.
- `plan.md`: bảng phase vẫn "Pending" toàn bộ; `phase-07` còn 3 mục chưa tick (e2e đầy đủ, Lighthouse/bundle, ui-consistency). Cập nhật sau test gate.

## Đã kiểm chứng (không phải lỗi)

- Auth: router admin mới (`/collections`, `/home`) gắn sau `requireAdmin` + origin check (`create-app.ts:34-44`). Trang `/admin/home-preview` ngoài nhóm protected nhưng `adminGet` redirect login khi 401.
- Validation: mọi body qua `validateBody` (thay `req.body` bằng dữ liệu đã parse); query qua zod; id kiểm `isObjectId`; slug ép `String()`; `q` escape regex → không có NoSQL injection.
- Href: `safeHrefSchema` chặn `javascript:`, `data:`, `//host`, `/\host`, khoảng trắng/ký tự điều khiển; `PublicSmartLink` kiểm lại khi render. Không có `dangerouslySetInnerHTML` ngoài JSON-LD; `serializeJsonLd` escape `<`, U+2028/2029. Body TextWithImage render text thuần.
- Ảnh section: key kiểm `isPublicKey`, `url` client gửi bị strip và gắn lại khi đọc.
- Revalidate: tag theo enum `PUBLIC_CACHE_TAGS`, secret so sánh timing-safe.
- Lock publish/restore là một pipeline update nguyên tử; pipeline chỉ chèn nội dung người dùng qua `$literal` hoặc update thường → không bị diễn giải `$field`.
- Bản nháp/`previous` không lọt ra `/api/public/home`; bộ sưu tập/outfit nháp bị lọc ở resolver.
- Ranh giới server→client: không file `'use client'` nào ở public import value từ barrel `@under30ss/shared` (chỉ `public-nav-links.tsx` → `home-path.ts`). Các prop hàm (`pathForPage`, `hrefForPage`) chỉ truyền giữa Server Component hoặc trong cây client. Ba fix đã nêu đều đúng.
- Không đổi `package.json` / `pnpm-lock.yaml` (`@dnd-kit/*` có sẵn từ commit trước). Không có cụm xưng hô riêng tư trong file. Comment mới tiếng Anh, chủ yếu giải thích "vì sao".
- Touch target admin: `--admin-control-height: 44px`.

## Câu hỏi còn mở

- Có muốn server từ chối publish khi nháp trùng bản đăng (409) hay coi là no-op 200 giữ nguyên `previous`?
- e2e có bao giờ chạy lên stack dùng chung (server dev) không? Nếu có, mục Warning 2 nên làm trước khi merge.
