# Báo cáo tester: P7 e2e, visual, SEO (Under30ss shop-the-look)

Ngày: 2026-11-06 17:37. Stack: Docker/WSL2 đang chạy tại http://localhost:8080 (caddy, web, api, rustfs, mongo). Không down, không rebuild, không đụng dữ liệu Mongo ngoài UI/API.

## 1. Tổng quan kết quả

| Hạng mục | Kết quả |
|---|---|
| E2E Playwright (chromium, 2 workers) | 13/13 pass, 2 run liên tiếp với code cuối |
| Web unit test (vitest) | 28 file, 164 test pass (sau tách file) |
| Lint (`pnpm lint`) | 0 error, 1 warning có sẵn (không thuộc phạm vi) |
| Typecheck (`pnpm typecheck`, 3 workspace) | pass |
| Typecheck root (`tsc -p tsconfig.json`, gồm e2e + playwright.config) | pass |
| Lighthouse SEO | 100 cả 4 lần đo (home/look × desktop/mobile) |
| Lighthouse Accessibility | 100 cả 4 lần đo |
| Visual vs reference | Lệch rõ ở connector (đầu mũi tên bị che, độ cong), subtitle không nghiêng, cột text hẹp hơn |

## 2. Lệnh đã chạy

Mật khẩu admin đọc từ file scratchpad qua biến môi trường `E2E_ADMIN_PASSWORD` trong shell, không ghi vào repo hay báo cáo.

```
export E2E_ADMIN_PASSWORD="$(cat <scratchpad>/local-admin-password.txt)"
pnpm e2e                       # run 1: 13 passed (7.6s); run 2: 13 passed (7.3s)
pnpm --filter @under30ss/web test   # 28 files, 164 tests passed
pnpm lint                      # exit 0, 1 warning (xem mục 9)
pnpm typecheck                 # exit 0
pnpm exec tsc -p tsconfig.json # exit 0 (root, gồm e2e/** và playwright.config.ts)
```

Lần chạy e2e đầu tiên có 1 test fail do lỗi assertion của tôi (`data-hotspot` là `"true"` do React render, không phải chuỗi rỗng). App không lỗi. Đã sửa expectation, các run sau pass hết.

## 3. E2E (playwright.config.ts, thư mục e2e/)

Project và chuỗi phụ thuộc:
- `admin-flow` (1 test): `e2e/admin-outfit-flow.spec.ts`. Login → tạo outfit (slug `e2e-<stamp>`) → upload model `assets-source/cut/mesh-84/model.png` → upload 3 món (`ao-mesh-the-thao`, `quan-short-jean-rong`, `giay-sneaker-den`) qua input file → đặt link https://shopee.vn/... → đặt điểm trên canvas → Lưu → Đăng → polling `/look/<slug>` tối đa 10s → thấy h1 và h2 các món. Teardown: `cleanup`.
- `public` (7 test, phụ thuộc admin-flow):
  - `public-lookbook-links-and-hover.spec.ts`: ảnh (naturalWidth > 0), tên, hotspot đều có `href` đúng, `target=_blank`, `rel` chứa `sponsored`, cùng `data-item-id`.
  - Hover 2 chiều: hover card hoặc hotspot → `[data-lookbook][data-active-id]`, `data-active` trên card, hotspot và `path[data-item-id]` đều set; món khác có opacity < 1; rời chuột thì xoá.
  - `public-viewport-and-no-js.spec.ts`: 390px và 320px, cho outfit test và `dramatic`: `scrollWidth <= innerWidth`, không text nào dưới 11px.
  - Không JS (`javaScriptEnabled: false`): tên, mô tả, link (`href`, `target`, không `aria-disabled`) có đủ.
  - 404 cho slug không tồn tại: status 404 và thông báo "Không tìm thấy trang".
- `visual` (4 test): `e2e/visual-reference-screenshots.spec.ts`, chụp full page `dramatic` và `mesh-84` ở 1440 và 390.
- `cleanup` (teardown): `e2e/cleanup.teardown.ts`. Login API, `DELETE /api/admin/outfits/:id`, kiểm tra public trả 404, xoá file state. Sau 2 run, `/api/public/outfits/slugs` chỉ còn `mesh-84` và `dramatic`, không sót outfit test.

Số liệu đo thực tế (Chromium headless, script đo riêng cùng logic test):

| Outfit | Viewport | scrollWidth / innerWidth | Font nhỏ nhất (px) |
|---|---|---|---|
| dramatic | 390 | 390 / 390 | 11 (h2 "ÁO THUN IN CHỮ") |
| dramatic | 320 | 320 / 320 | 11 |
| mesh-84 | 390 | 390 / 390 | 11 (h2 "ÁO MESH THỂ THAO") |
| mesh-84 | 320 | 320 / 320 | 11 |

Ghi chú: đạt ngưỡng 11px nhưng không có dư. Nguyên nhân là `--lookbook-title-size: clamp(11px, 2.1vw, 20px)` (`apps/web/src/styles/design-tokens.css:21`), chạm sàn ở mọi viewport dưới ~524px.

Thời gian: mỗi test 0.2 đến 4.4s. Admin flow chậm nhất (upload + đặt điểm), khoảng 3 đến 4s. Không có test flaky trong 3 lần chạy cuối.

## 4. Visual so với ảnh mẫu

File tạo ra trong `plans/261106-1201-under30ss-shop-the-look/visuals/`:
- `e2e-dramatic-1440.png`, `e2e-dramatic-390.png`, `e2e-mesh-84-1440.png`, `e2e-mesh-84-390.png` (full page, do playwright chụp).
- `e2e-compare-dramatic-1440-vs-ref.png`, `e2e-compare-mesh-84-1440-vs-ref.png`: ảnh mẫu bên trái, ảnh chụp 1440 bên phải, cùng chiều cao (Pillow). Ảnh mẫu chỉ có bản desktop, không có mẫu mobile nên 390 không có so sánh.
- `e2e-curve-ratio-experiment-mesh-84-1440.png`: thí nghiệm `--lookbook-curve-ratio` (xem 4.2).

### 4.1 Khác biệt cụ thể so với ảnh mẫu (quan sát trên ảnh, không đo pixel)

1. **Mũi tên connector bị che.** Đường kết thúc tại tâm hotspot. Hotspot (`.hotspot`, z-index 2, 24px, viền 1.5px) đè lên SVG (`.connectors`, z-index 1). Arrowhead (`--lookbook-arrow-size: 7px`) nằm trong vòng tròn nên không thấy. Ảnh mẫu có mũi tên rõ ở đầu vào món.
2. **Hình dạng đường cong.** `computeConnectorPath` (`apps/web/src/components/lookbook/compute-connector-paths.ts`) dùng quadratic Bezier, điểm điều khiển luôn nằm phía trên. Mọi đường đều vồng lên. Ảnh mẫu có đường vòng xuống (giày, quần, khăn), đường xuất phát ngang từ cạnh thẻ rồi uốn. Đổi ratio không sửa được chuyện này.
3. **Subtitle không nghiêng.** `.itemSubtitle` (`lookbook.module.css:72`) là regular, không italic. Ảnh mẫu dùng italic cho "MESH JERSEY", "CARGO DENIM SHORTS".
4. **Cột text hẹp hơn, chữ xuống dòng nhiều hơn.** Ví dụ "QUẦN SHORT JEAN RÁCH" ảnh mẫu một dòng, ảnh chụp hai dòng. Mô tả ảnh mẫu khoảng 3 dòng, ảnh chụp khoảng 4 dòng. Ước lượng do cột tỉ lệ `--lookbook-col-left/right: 29fr` (`design-tokens.css`).
5. **Ảnh món nhỏ hơn tương đối so với người mẫu.** Ước lượng bằng mắt: chiều rộng áo thun khoảng 0.8 lần người mẫu ở ảnh mẫu, khoảng 0.7 ở ảnh chụp. Chưa đo pixel.
6. **Mobile 390px.** Người mẫu nhỏ (khoảng 130px rộng). Các hotspot dồn cụm quanh hông và giày trên `dramatic`. Connector dài chéo qua người mẫu và chồng lên nhau. Mô tả bị ẩn dưới 640px (`--lookbook-hide-description-below`, có chủ ý), chỉ còn tên và dòng phụ. Ảnh mẫu không có bản mobile nên không đối chiếu được.
7. **Vị trí điểm neo** trong test là giá trị tôi đặt (không khớp ảnh mẫu) nên không so sánh được vị trí hotspot với ảnh mẫu.

### 4.2 Đề xuất `--lookbook-curve-ratio` (không sửa, chỉ khuyến nghị)

Thí nghiệm: override biến CSS trong runtime (không sửa app) cho `mesh-84` ở 1440, ratio 0.2 / 0.35 / 0.5 / 0.7, ảnh ghép trong `e2e-curve-ratio-experiment-mesh-84-1440.png`.

- 0.2: đường gần như phẳng, đường giày và tất hầu như không có độ vồng.
- 0.35 (hiện tại): độ vồng vừa, cân đối.
- 0.5: đường vồng rõ hơn, gần nhịp cong ảnh mẫu ở đường dài. Đường kính mắt vượt lên trên đỉnh đầu người mẫu.
- 0.7: đường kính mắt vồng quá cao, vượt khỏi khung ảnh.

**Khuyến nghị: giữ 0.35.** Ratio chỉ đổi biên độ vồng, không đổi hướng cong. Vấn đề lớn hơn là hướng cong (mục 4.1 số 2) và mũi tên bị che (mục 4.1 số 1). Nếu buộc phải đổi trước khi sửa thuật toán, 0.4 là mức an toàn nhất. Từ 0.5 trở lên thì đường đi qua đỉnh đầu người mẫu.

Giới hạn thí nghiệm: một outfit, điểm neo do tôi đặt, chỉ ở 1440.

## 5. Lighthouse (lighthouse@13.6.0, headless chromium từ Playwright)

Lệnh: `CHROME_PATH=<ms-playwright chromium-1248>/chrome.exe npx -y lighthouse@13.6.0 <url> [--preset=desktop] --only-categories=seo,accessibility --chrome-flags="--headless=new --no-sandbox" --output=json`.

| Trang | Form | SEO | Accessibility |
|---|---|---|---|
| / | desktop | 100 | 100 |
| / | mobile | 100 | 100 |
| /look/dramatic | desktop | 100 | 100 |
| /look/dramatic | mobile | 100 | 100 |

Các audit then chốt đều pass: `canonical`, `is-crawlable`, `meta-description`, `document-title`, `hreflang`, `robots-txt`, `link-text`, `image-alt`, `html-has-lang`, `heading-order`, `aria-allowed-attr`, `link-name`.

Lưu ý:
- `canonical` và `is-crawlable` pass vì container `web` có `SITE_URL=http://localhost:8080` (đọc qua `docker inspect`). Chưa kiểm được canonical trên domain HTTPS thật.
- `color-contrast`, `button-name`, `label` trả notApplicable, Lighthouse không tự kiểm được. Cần axe hoặc kiểm tay cho độ tương phản.
- `structured-data` là manual. Chưa kiểm bằng Rich Results Test.
- Báo cáo JSON nằm trong scratchpad, không đưa vào repo.

## 6. Chưa làm / ngoài phạm vi

- `ui-consistency:verifying` chưa chạy (không nằm trong acceptance của lần này).
- So sánh pixel tự động với ảnh mẫu chưa làm, chỉ so sánh bằng mắt.
- Lighthouse performance không đo (không trong yêu cầu).
- Không kiểm trên HTTPS / domain thật.

## 7. Vấn đề trong app (không sửa, báo cáo cho lead)

1. **Mũi tên connector bị che bởi hotspot.** Vị trí: `apps/web/src/components/lookbook/compute-connector-paths.ts` (endpoint = tâm hotspot), `apps/web/src/components/lookbook/lookbook.module.css` (`.hotspot` z-index 2, `.connectors` z-index 1).
   - Repro: mở `http://localhost:8080/look/mesh-84` ở 1440, phóng to một hotspot. Không thấy đầu mũi tên.
   - Gợi ý: rút điểm cuối đường về mép hotspot (bán kính 12px, lùi theo hướng đường) để marker nằm ngoài vòng tròn. Hoặc đặt SVG marker cao hơn hotspot, nhưng cách này làm đường cắt qua vòng tròn.
2. **Hướng cong luôn vồng lên.** `computeConnectorPath` (cùng file trên). Ảnh mẫu có đường vòng xuống và đường xuất phát ngang từ cạnh thẻ.
   - Gợi ý: đổi sang cubic Bezier, điểm điều khiển đầu nằm ngang với cạnh thẻ, điểm điều khiển cuối hướng về phía điểm neo. Cho phép hướng vồng theo dấu của chênh lệch y.
3. **Sàn 11px đúng ngưỡng ở mobile.** `apps/web/src/styles/design-tokens.css:21`. Đạt yêu cầu nhưng không có dư. Nếu muốn an toàn, đặt sàn 12px.
4. **Subtitle không italic** so với ảnh mẫu. `apps/web/src/components/lookbook/lookbook.module.css:72-77`. Thêm `font-style: italic` nếu xác nhận đó là ý thiết kế (ảnh mẫu cho thấy vậy).
5. **Cột text hẹp.** `--lookbook-col-left` và `--lookbook-col-right` (29fr) trong `design-tokens.css`. Thử 32fr và đo lại số dòng text.
6. **Mobile có hotspot dồn cụm và connector chồng lên người mẫu.** Gợi ý: ẩn connector dưới 640px, hoặc xếp hotspot cách nhau tối thiểu. Cần quyết định thiết kế.

## 8. Thay đổi file (chỉ trong phạm vi được giao)

- Tách test: xoá `apps/web/test/admin/settings-and-users.test.tsx` (207 dòng). Tạo:
  - `apps/web/test/admin/settings-form.test.tsx` (112 dòng, 6 test).
  - `apps/web/test/admin/login-and-users.test.tsx` (111 dòng, 7 test).
  - Tổng vẫn 13 test như gốc (đếm `git show HEAD:`). Không bớt test nào.
- Tạo `playwright.config.ts` (root).
- Tạo thư mục `e2e/`:
  - `e2e/admin-outfit-flow.spec.ts`
  - `e2e/public-lookbook-links-and-hover.spec.ts`
  - `e2e/public-viewport-and-no-js.spec.ts`
  - `e2e/visual-reference-screenshots.spec.ts`
  - `e2e/cleanup.teardown.ts`
  - `e2e/support/env.ts`, `e2e/support/admin-helpers.ts`, `e2e/support/outfit-state.ts`
- Tạo ảnh trong `plans/261106-1201-under30ss-shop-the-look/visuals/` (xem mục 4).
- Không sửa code app. Không commit. Không đụng `.env`.

## 9. Vấn đề phụ và hạn chế

- Root `pnpm typecheck` (`pnpm -r typecheck`) không chạy root tsconfig nên không kiểm e2e. Đã thêm `/// <reference lib="dom" />` vào 3 file e2e dùng DOM. Root `package.json` không thuộc phạm vi tôi. Đề xuất thêm `tsc -p tsconfig.json` vào script typecheck.
- Lint warning có sẵn: `apps/api/test/outfits-admin-crud.test.ts:29` (`publicApi` không dùng). File không đổi trong git, không thuộc phạm vi tôi.
- Teardown dùng API login + DELETE. Đây là đường cleanup qua API, không qua UI. Test xoá UI chưa được kiểm riêng.
- Playwright `retries: 0`. Không có test flaky trong 3 lần chạy cuối, nhưng số lần chạy còn ít.
- Admin login chỉ thành công (không thử sai), nên không đụng rate-limit 5 lần/15 phút. Mỗi run tốn 2 lần login thành công (admin-flow và cleanup).
- `test-results/` (gitignore) có thể chứa trace của lần fail đầu. Đã grep, không có chuỗi mật khẩu trong `test-results`, `e2e`, `playwright.config.ts`, `plans`.

## 10. Câu hỏi chưa giải quyết

1. Có sửa connector (mục 7 số 1, 2) trong phase này hay chuyển sang phase sau? Ảnh hưởng tiêu chí "giống ảnh mẫu desktop + mobile".
2. Có muốn đổi `--lookbook-curve-ratio` sang 0.4 không, hay giữ 0.35 cho đến khi đổi thuật toán?
3. Subtitle italic có phải ý thiết kế không? Ảnh mẫu cho thấy có, nhưng chưa xác nhận với thiết kế.
4. Ảnh người mẫu đang dùng là ảnh seed (model.png). Phase 7 ghi ảnh sạch từ bên Kim chưa có. Visual cuối sẽ đổi khi thay ảnh.
5. Ai thêm script typecheck cho root (`tsc -p tsconfig.json`)?
6. Cần thêm axe-core cho độ tương phản không? Lighthouse không kiểm được `color-contrast`.
7. Có cần chạy ui-consistency:verifying trước khi đóng P7 không?

**Status:** DONE_WITH_CONCERNS
**Summary:** E2E 13/13 pass 2 run liên tiếp (`pnpm e2e`), web test 164/164, lint và typecheck (cả root) sạch, Lighthouse SEO và a11y 100 ở cả 4 lần đo. Visual còn lệch ảnh mẫu ở connector (mũi tên bị hotspot che, đường luôn vồng lên), subtitle không italic, cột text hẹp. Khuyến nghị giữ `--lookbook-curve-ratio` 0.35.
**Concerns/Blockers:** Lỗi thiết kế connector cần quyết định trước khi đóng P7 (mục 7). Sàn 11px ở mobile không có dư. Root typecheck chưa bao phủ e2e (cần sửa `package.json` root, ngoài phạm vi). Ảnh người mẫu còn là ảnh seed.
