# Research: Homepage section builder cho admin (Next 16 + Express 5 + Mongo)

Ngày: 2026-11-07. Phạm vi: chọn cơ chế cho admin sắp xếp/bật-tắt section trang chủ (hero, carousel outfit theo rule, category tile, promo, text, FAQ), render server-side.

## Bối cảnh repo (đã đọc)
- `apps/web/package.json`: next `^16.4.5`, react `^19.3.1`, `@dnd-kit/*` đã có, zod `^4.6.7`.
- `apps/api/package.json`: express `^5.3.0`, mongoose `^9.12.0`, express-session + connect-mongo (auth admin đã có).
- `packages/shared`: zod schema dùng chung (`settings-schemas.ts`, `outfit-schemas.ts`).
- Model hiện có: `admin-user-model.ts`, `outfit-model.ts`, `settings-model.ts`. Chưa có model homepage/section.
- Trang chủ `apps/web/src/app/(public)/page.tsx` đã server-render, data lấy từ Express API.
- `package.json` root khai `engines.node >=22.12.0`; `docs/system-architecture.md` dòng 28: api chạy Node 24 trong Docker.

## Kết quả kiểm chứng từng ứng viên

### 1. Puck (`@puckeditor/core`) — ƯU TIÊN 1
| Mục | Kết quả đã kiểm chứng | Nguồn |
|---|---|---|
| License | MIT | npm `@puckeditor/core` (2026-11-07); github.com/puckeditor/puck (gh API: `license: MIT`) |
| Bản mới nhất | 0.24.0, publish 2026-10-29 | npm `time`; GitHub release `v0.24.0` 2026-10-29 |
| Nhịp phát hành | 0.22.1 (07-13) → 0.22.4 (07-29) → 0.23.0 (08-07) → 0.24.0 (10-29) | npm `time` |
| Hoạt động repo | pushed 2026-11-06; 13.6k stars; 207 open issues | `gh api repos/puckeditor/puck` |
| Tên gói | `@measured/puck` đã deprecated: "Puck has moved. Please use @puckeditor/core" | `npm view @measured/puck deprecated` |
| React | peer `react ^18 \|\| ^19` | npm peerDependencies |
| Next 16 | Official template `create-puck-app` dùng `next ^16.0.8`; `recipes/next` dùng `next ^16.4.3` | `gh search code` trên puckeditor/puck (`packages/create-puck-app/templates/next/package.json.hbs`, `recipes/next/package.json`) |
| RSC render | Có entry `./rsc` (condition `react-server`), file `rsc.mjs` không có `"use client"`. Docs: `<Render>` và `resolveAllData` chạy server; config phải "RSC-friendly" | `npm pack` tarball 0.24.0 + https://puckeditor.com/docs/integrating-puck/server-components |
| Chạy thử RSC | Tự test: `Render` từ `@puckeditor/core/rsc` + `renderToStaticMarkup` trong Node thuần (không DOM) → `<section><h1>Hello</h1></section>`, exit 0 | scratchpad `puck-render-test/test.mjs` (tái lập: npm i @puckeditor/core@0.24.0 react@19 react-dom@19) |
| Bundle public | Đường RSC: `rsc.mjs` 3.8KB + 6 chunk ≈ 47KB unminified; phụ thuộc `react`, `fast-equals`, `flat`. KHÔNG kéo tiptap/zustand. Gzip: CHƯA đo | tarball 0.24.0, grep import từng chunk |
| Bundle admin | Gói core unpacked 2.9MB (gồm CSS/d.ts, không phải bundle); deps nặng: tiptap, zustand, @dnd-kit/react, happy-dom (chỉ nằm trong editor) | `npm view` dependencies; tarball |
| Data model | JSON `{content:[{type, props}], root:{props}}` — tự lưu, không có backend riêng. Test trên đã chạy đúng shape này | docs server-components; tự test |
| Auth | KHÔNG có auth/user management. Phải tự gắn editor vào session admin hiện có | docs.puckeditor.com (không thấy tính năng auth) — suy ra từ index docs, mức chắc chắn trung bình |
| Versioning | "Puck follows semantic versioning. Major releases may introduce breaking changes for your Data payload." Có helper `migrate()`, `transformProps` | https://puckeditor.com/docs/integrating-puck/data-migration |

Rủi ro:
- Pre-1.0 (0.x): theo quy ước semver 0.x, bản minor có thể break (suy luận, chưa kiểm chứng trong changelog). Cần pin version chính xác.
- Đổi tên gói đã xảy ra (`@measured` → `@puckeditor`): cho thấy churn.
- Schema field của Puck (`fields`) không phải zod: phải viết lại shape ở 2 nơi (Puck config + zod validate phía Express) → vi phạm DRY một phần. Giảm bằng cách map `type → zod schema` trong `packages/shared`.
- Không tự kiểm chứng: giới hạn canvas về 1 cột tuyến tính (chỉ cho sắp xếp dọc, không kéo tự do) — cần spike.
- Không tự kiểm chứng: custom field (image picker dùng `/api/admin/media`, picker outfit theo rule) — docs có mục "Custom Fields" nhưng chưa đọc chi tiết.

### 2. Payload CMS 3 — LOẠI
| Mục | Kết quả | Nguồn |
|---|---|---|
| License | MIT; 3.93.0 publish 2026-11-04; repo pushed 2026-11-07 | npm; `gh api repos/payloadcms/payload` |
| Mongo | `@payloadcms/db-mongodb` MIT, peer `payload 3.93.0` (pin chặt), dep `mongoose 8.24.1` | npm |
| Next | `@payloadcms/next` peer `next >=16.3.3 <17` — repo `^16.4.5` tương thích | npm peerDependencies |
| Node | Payload yêu cầu `^22.23.4 \|\| >=24.22.1`; repo `engines >=22.12.0` → lệch. Docker API dùng Node 24 nên prod OK, dev máy có Node 22.12 sẽ lỗi | npm engines; repo package.json |
| Blocks field | Có block array, sắp xếp được, custom admin component; KHÔNG render ra frontend — phải tự viết renderer theo `blockType` | https://payloadcms.com/docs/fields/blocks |
| Express | v3 thiết kế Next-first: Admin Panel chạy trên Next App Router. Không tìm được tài liệu chính thức v3 cho Express độc lập (kết quả tìm kiếm chỉ có v2 + blog bên thứ ba) → UNVERIFIED | payloadcms.com docs; web search |

Lý do loại: Payload sẽ có admin (`/admin`), bảng `users`, session riêng → trùng hoàn toàn với admin custom + `admin-user-model` + express-session đang có. Hai hệ auth, hai nguồn DB. Vi phạm DRY và tăng surface bảo mật. Chỉ đáng xem nếu cả dự án chuyển sang Payload làm backend — ngoài phạm vi.

### 3. Strapi v5 — LOẠI
- Docs chính thức: "Strapi does not support MongoDB (or any NoSQL databases)". DB hỗ trợ: MySQL, MariaDB, PostgreSQL, SQLite. Nguồn: https://docs.strapi.io/snippets/supported-databases (fetch 2026-11-07).
- Repo strapi/strapi pushed 2026-11-07, 73k stars. License GitHub báo `NOASSERTION`, docs không nêu license → license UNVERIFIED (không ảnh hưởng quyết định vì đã loại do DB).

### 4. Builder.io — LOẠI (SaaS-first)
- SDK `@builder.io/sdk-react` 5.4.2 (npm, 2026-10-20). Repo BuilderIO/builder MIT (gh API).
- Nội dung nằm trên cloud Builder; điều kiện self-host không kiểm chứng được → UNVERIFIED. Với dữ liệu affiliate nội bộ, đưa content ra SaaS bên ngoài là rủi ro không cần thiết.

### 5. Craft.js — LOẠI (bỏ hoang)
- `@craftjs/core` 0.2.12, publish 2025-02-14; repo prevwong/craft.js pushed 2025-02-14, không archived nhưng không có commit 21 tháng (tính đến 2026-11-07). MIT.
- Không có React 19 / Next 16 verification. Không có đường đi rõ về RSC render saved JSON.

### 6. Baseline — custom "section registry"
Thiết kế gợi ý (YAGNI: chỉ làm đúng loại section đang cần):
- Mongo: 1 document `homepage` `{ sections: [{ id, type, enabled, props, schemaVersion }], updatedAt }`. Hoặc collection `page_sections` nếu sau này nhiều trang.
- `packages/shared`: zod schema cho từng type (hero, outfitCarousel, categoryTiles, promoBanner, richText, faq). Một nguồn duy nhất cho API validate + form admin.
- Express: `GET /api/public/home` (đã cắt, không lộ draft/affiliate link), `GET/PUT /api/admin/home` (có session, validate zod, check `updatedAt` để chống ghi đè).
- Web public: server component map `type → renderer`; outfitCarousel gọi `getPublicOutfits` theo rule.
- Admin: list có reorder (`@dnd-kit/sortable` đã có), toggle bật/tắt, form theo từng type, nút preview.
- Effort (ước lượng của em, KHÔNG phải số đo): core registry + API + list admin ~4 dev-day; mỗi type (schema + form + renderer + test) ~0.5–1 dev-day × 6 ≈ 4–5 dev-day; tổng ~8–9 dev-day.
- Rủi ro: không có WYSIWYG — admin thấy form, không thấy trang thật. Muốn preview phải tự làm. Không có dependency mới (0 rủi ro vendor).

## Bảng so sánh

| Tiêu chí | Puck | Custom registry | Payload 3 | Strapi 5 | Builder.io | Craft.js |
|---|---|---|---|---|---|---|
| License | MIT | Không áp dụng | MIT | Chưa rõ (NOASSERTION) | MIT (SDK) | MIT |
| Self-host | Có (npm lib, data tự giữ) | Có | Có | Có nhưng SQL | SaaS-first, chưa rõ | Có |
| Mongo | Tự lưu JSON | Có (sẵn) | Adapter chính thức | KHÔNG | Lưu cloud | Tự lưu |
| Next 16 / React 19 | Có (template chính chủ) | Có | Có (peer khớp) | n/a | SDK có | Không kiểm chứng |
| RSC render | Có (đã test Node) | Có (tự viết) | Tự viết renderer | n/a | Có | Không rõ |
| Admin UX non-tech | Tốt nhất (WYSIWYG) | Form, không preview | Tốt (Admin Panel) | Tốt | Tốt | Trung bình |
| Trùng auth/admin | Không | Không | CÓ (trùng hoàn toàn) | CÓ | Không | Không |
| Ops/maintenance | Hoạt động cao, 0.x | Tự chịu | Hoạt động cao, pin chặt | Hoạt động | Hoạt động | Bỏ hoang |
| Effort (ước lượng) | ~6–8 dev-day + spike 1–2 | ~8–9 dev-day | >15 (sửa auth/DB) | — | — | — |
| Rủi ro lớn nhất | Breaking 0.x, 2 nơi định nghĩa field | Thiếu preview, tự làm hết | Hai hệ admin | Không hỗ trợ Mongo | Dữ liệu ra SaaS | Không maintain |

Effort ở trên là ước lượng chủ quan, chưa đo.

## Khuyến nghị (xếp hạng)

1. **Puck `@puckeditor/core` 0.24.0 (pin chính xác `0.24.0`)** — chọn nếu spike 1–2 ngày pass.
   - Được: WYSIWYG cho admin không rành kỹ thuật; render server đã kiểm chứng; MIT; data là JSON nên lưu Mongo dễ; bundle public nhẹ (~47KB unminified, không kéo editor); có template Next 16 chính chủ.
   - Mất: thêm dependency lớn chỉ dùng trong admin; 0.x có thể breaking; phải duy trì map `type → zod` trong `packages/shared`.
   - Điều kiện spike (phải pass trước khi commit):
     a. Khóa được canvas thành danh sách dọc 1 zone (không kéo tự do).
     b. Custom field: image picker gọi `/api/admin/media` và picker outfit theo rule.
     c. `next build` của `apps/web` chạy với entry `@puckeditor/core/rsc` trên trang chủ.
     d. Editor mount trong admin đang có, lưu qua Express với session hiện tại, không tạo auth thứ hai.
   - Nếu spike fail → chuyển sang #2.

2. **Custom section registry** — fallback, và là lựa chọn nếu team không muốn thêm dependency vendor.
   - Được: 0 dependency mới; tận dụng zod, dnd-kit, Express API, auth hiện có; đúng YAGNI với 6 loại section.
   - Mất: không có preview WYSIWYG; admin phải tự làm form từng type.

3–6. Payload, Strapi, Builder, Craft.js — không đưa vào. Lý do ở các mục trên.

Lưu ý theo luật repo: "chức năng lớn → tìm giải pháp có sẵn" — Puck đáp ứng. Nếu chọn #2 phải nêu lý do (Puck không đạt điều kiện spike).

## Giới hạn (chưa làm)
- Chưa build thử `apps/web` với Puck; mới test RSC `Render` trong Node thuần, chưa test trong Next 16 App Router thật.
- Chưa đo gzip bundle; số 47KB là unminified.
- Chưa đọc docs Custom Fields, resolveData, và cách khóa layout 1 cột.
- Payload Express standalone: không có tài liệu v3 chính thức.
- Builder self-host: chưa kiểm chứng.
- Strapi license: chưa kiểm chứng (không ảnh hưởng quyết định).
- Effort là ước lượng, không có số đo.
- Không khảo sát các thư viện nhỏ khác (ví dụ Plasmic, GrapesJS) — ngoài yêu cầu.

## Câu hỏi chưa giải quyết
1. Admin có cần preview WYSIWYG (kéo-thả) hay form là đủ? Quyết định này quyết định Puck hay custom.
2. Ngoài trang chủ, có trang nào khác cần section builder trong 6 tháng tới không? Nếu có, nên làm `page_sections` theo `pageKey`.
3. Chấp nhận dependency pre-1.0 (0.x) với cam kết pin version không?
4. Có cần đa ngôn ngữ cho nội dung section không? (ảnh hưởng schema).

**Status:** DONE_WITH_CONCERNS
**Summary:** Khuyến nghị Puck `@puckeditor/core` 0.24.0 (MIT) nếu spike 1–2 ngày pass (khóa layout 1 cột, custom field media/outfit, build Next 16 OK). Fallback là custom section registry (zod + Mongo JSON + dnd-kit có sẵn). Loại Payload (trùng admin/auth), Strapi (không hỗ trợ Mongo, đã xác minh docs), Builder (SaaS), Craft.js (bỏ hoang từ 2025-02-14).
**Concerns/Blockers:** Chưa build Next 16 thật với Puck; gzip chưa đo; effort là ước lượng; Puck 0.x có rủi ro breaking; các mục UNVERIFIED nêu trên.
