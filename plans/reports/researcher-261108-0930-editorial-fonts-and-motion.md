# Research: font hiển thị, marquee, mosaic, campaign banner (editorial monochrome)

Ngày: 2026-11-08 | Phạm vi: `apps/web` (Next.js 16 / React 19, CSS Modules + custom properties)
Ngân sách lookup: vượt nhẹ. Đã dùng 7: 4 WebFetch, 2 curl, 1 WebSearch. Ghi nhận để chủ repo biết.

## Nguồn đã kiểm chứng

| Ký hiệu | Nguồn | Dùng cho |
|---|---|---|
| [G1] | `https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&family=Cormorant+Garamond:wght@400..700&family=Bodoni+Moda:wght@400..900&family=Noto+Serif+Display:wght@400..900&family=Prata&display=swap` (curl với User-Agent trình duyệt, lưu tại `C:\Users\LENOVO\AppData\Local\Temp\claude\a0157126994b7d90\2e8097ca-9afa-4295-9630-d736c4ae22cf\scratchpad\gf-css.txt`) | Subset tiếng Việt, weight |
| [N1] | `https://nextjs.org/docs/app/api-reference/components/font` (lastUpdated 2026-09-24) | `next/font/google` options |
| [N2] | `https://nextjs.org/docs/app/api-reference/components/image` (lastUpdated 2026-11-06) | `sizes`, `fill`, `preload` |
| [W1] | WebSearch trỏ tới `https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html` và `https://www.w3.org/TR/wcag2mobile-22/` | WCAG 2.2.2 |
| [R1] | `apps/web/src/app/layout.tsx` | Font hiện tại |
| [R2] | `apps/web/src/styles/design-tokens.css`, `apps/web/src/styles/client-theme-tokens.css` | Token |
| [R3] | `apps/web/src/components/home-sections/hero-slider.module.css` | Pattern pause, overlay |

Lưu ý: trang WCAG 2.2 gốc (`w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html`) bị Cloudflare chặn ("Just a moment..."). Dùng bản 2.1 Understanding và WCAG2Mobile (ghi WCAG 2.2 Level A) thay thế.

---

## 1. Font hiển thị có dấu tiếng Việt

### Bằng chứng [G1]
Chỉ khi gửi User-Agent trình duyệt, API mới trả block `/* vietnamese */` có `unicode-range`. Không có UA thì không có subset (WebFetch lần đầu trả 23 block không subset, kết quả đó bị loại).

Dải `vietnamese` (giống nhau ở mọi font có subset này):
`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB`

| Font | Subset `vietnamese` | Weight có trong block vi | Đánh giá |
|---|---|---|---|
| Playfair Display | Có | 400–900 (variable) | Ứng viên 1 |
| Noto Serif Display | Có | 400–900 (variable) | Ứng viên 2 |
| Cormorant Garamond | Có | 400–700 | Ứng viên 3: nét mảnh, x-height thấp, yếu ở cỡ nhỏ (đánh giá cá nhân) |
| Prata | Có | 400 only | Loại: chỉ 1 weight, ít lựa chọn |
| Bodoni Moda | KHÔNG (chỉ latin, latin-ext, cyrillic-ext, math, symbols) | — | Loại: thiếu subset tiếng Việt, dấu thanh sẽ rơi về fallback |

### Xếp hạng
1. **Playfair Display** (variable, chọn). Đủ subset VN, một file variable phủ 400–900, chất editorial tương phản cao hợp fashion luxury (đánh giá thẩm mỹ là ý kiến, cần duyệt bằng mắt).
2. **Noto Serif Display** (dự phòng). Trung tính hơn, phủ weight tốt, ít cá tính.
3. Cormorant Garamond. Chỉ dùng nếu chấp nhận cỡ chữ lớn.

Rủi ro adoption: cả ba đều Google Fonts, hệ sinh thái ổn định. Chưa kiểm giấy phép OFL từng font trong lần này (xem Unresolved).

### Call `next/font/google` đề xuất [N1]
Doc xác nhận: variable font không cần `weight`; `subsets` được preload khi `preload` true (mặc định); `display` mặc định `swap`; `adjustFontFallback` mặc định true (giảm CLS).

```ts
// apps/web/src/app/layout.tsx
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';

const beVietnamPro = Be_Vietnam_Pro({ /* giữ nguyên */ });

const playfairDisplay = Playfair_Display({
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--font-playfair-display',
});

// <html lang="vi" className={`${beVietnamPro.variable} ${playfairDisplay.variable}`}>
```

Token (thêm vào `design-tokens.css` cạnh `--font-sans`, [R2] dòng 18):
```css
--font-display: var(--font-playfair-display), serif;
```

Trade-off: gọi trong root layout thì preload trên mọi route, mỗi subset thêm 1 link preload. Chấp nhận cho trang fashion vì tiêu đề là nhận diện. Nếu muốn gọn hơn, có thể `preload: false` và chỉ gọi ở layout trang chủ/campaign (doc: font gọi ở page chỉ preload trên route đó). Không đề xuất thêm font thứ ba.

---

## 2. Marquee CSS-only, truy cập được

### Căn cứ
- WCAG 2.2.2 (Level A) [W1]: nội dung chuyển động, tự chạy, kéo dài trên 5 giây, đi kèm nội dung khác thì phải có cơ chế pause/stop/hide. Ngoại lệ: chuyển động là thiết yếu. Marquee trang trí không thuộc ngoại lệ.
- Repo đã có pattern [R3] dòng 159–164: nút pause ẩn khi `prefers-reduced-motion: reduce`. Giữ đúng pattern này.
- Chưa kiểm chứng qua nguồn đã fetch: hành vi `prefers-reduced-motion` (MDN), `inert` (hỗ trợ trình duyệt). Dùng như thực hành chuẩn, cần xác nhận.

### Pattern đề xuất (không JS)
Nút pause dùng `<input type="checkbox">` + `<label>`: bàn phím thao tác được (Space trên label), không cần JS.

```html
<section class="marquee" aria-label="Thông điệp thương hiệu">
  <input id="marquee-pause" class="marquee__toggle" type="checkbox" />
  <label class="marquee__control" for="marquee-pause">
    <span class="marquee__label-pause">Tạm dừng</span>
    <span class="marquee__label-play">Tiếp tục</span>
  </label>
  <div class="marquee__viewport">
    <div class="marquee__track">
      <ul class="marquee__group">
        <li>Bộ sưu tập thu 2026</li>
        <li>Giao hàng toàn quốc</li>
      </ul>
      <ul class="marquee__group" aria-hidden="true">
        <li>Bộ sưu tập thu 2026</li>
        <li>Giao hàng toàn quốc</li>
      </ul>
    </div>
  </div>
</section>
```

```css
.marquee {
  position: relative;
  min-height: var(--marquee-height); /* giữ chiều cao, không shift */
}
.marquee__toggle {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%);
}
.marquee__viewport { overflow: hidden; }
.marquee__track {
  display: flex; width: max-content;
  animation: marquee var(--marquee-duration) linear infinite;
}
.marquee__group {
  display: flex; flex-shrink: 0; gap: var(--marquee-gap);
  margin: 0; padding: 0 var(--marquee-gap) 0 0; list-style: none;
}
.marquee__label-play { display: none; }
.marquee__toggle:checked ~ .marquee__control .marquee__label-pause { display: none; }
.marquee__toggle:checked ~ .marquee__control .marquee__label-play { display: inline; }
.marquee__toggle:checked ~ .marquee__viewport .marquee__track { animation-play-state: paused; }
.marquee__toggle:focus-visible ~ .marquee__control { outline: var(--focus-ring-width) solid var(--color-focus); outline-offset: var(--focus-ring-offset); }

@keyframes marquee { to { transform: translate3d(-50%, 0, 0); } }

@media (prefers-reduced-motion: reduce) {
  .marquee__track { animation: none; width: auto; flex-wrap: wrap; }
  .marquee__group[aria-hidden='true'] { display: none; }
  .marquee__control, .marquee__toggle { display: none; }
}
```

Điểm kỹ thuật:
- Seamless: hai group giống nhau, mỗi group có padding-end = gap, `translate -50%` đúng bằng một group.
- Chỉ animate `transform`: không kích layout. Chiều cao cố định bằng token `--marquee-height` để không CLS.
- Nội dung trong nhóm `aria-hidden` không được có link/nút (tab vẫn vào được). Chỉ để text tĩnh. Nếu buộc phải có link, thêm `inert` cho group thứ hai (chưa kiểm hỗ trợ).
- Không dùng hover để pause: hover không có đường vào cho bàn phím. Checkbox đã bao phủ.
- Dữ liệu: chữ trong marquee là nội dung nghiệp vụ, lấy từ cấu hình home section (DB/admin), không hardcode trong component (luật cấu hình động của chủ repo).
- Token mới đề xuất trong `client-theme-tokens.css`: `--marquee-duration`, `--marquee-gap`, `--marquee-height`. Giá trị mặc định 30s / `var(--space-6)` / theo line-height.

### Xếp hạng
1. CSS marquee + checkbox pause (trên). Đạt 2.2.2, không JS, không dependency.
2. Hàng chữ tĩnh cuộn ngang (`overflow-x: auto`), không chuyển động. Rủi ro a11y bằng 0, chọn nếu không cần hiệu ứng mạnh (YAGNI).
3. Marquee JS hoặc thư viện animation: loại (thêm JS/dependency, không cần thiết).

---

## 3. Mosaic gallery bằng CSS grid (6–9 ảnh, span hỗn hợp, 320–1440px)

### Pattern
Dùng row cố định theo `clamp()` để ô có chiều cao biết trước (không CLS). Span dạng class, không dùng `dense`.

```css
.mosaic {
  display: grid;
  gap: var(--mosaic-gap);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: clamp(160px, 40vw, 220px);
}
.cell { position: relative; overflow: hidden; }
.image { object-fit: cover; }

/* Breakpoints hardcode (CSS không đọc custom property trong @media), theo [R2] dòng 80-94 */
@media (max-width: 639.98px) {
  .wide { grid-column: 1 / -1; }
}
@media (min-width: 1024px) {
  .mosaic {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: clamp(200px, 18vw, 300px);
  }
  .wide { grid-column: span 2; }
  .tall { grid-row: span 2; }
}
```

```tsx
<figure className={`${styles.cell} ${styles[variant]}`}>
  <Image src={src} alt={alt} fill sizes={sizes} className={styles.image} preload={isFirstRow} />
</figure>
```

Căn cứ [N2]:
- `fill` yêu cầu parent có `position: relative|fixed|absolute` (dòng doc: "the parent element must be positioned").
- Không có `sizes` với `fill`, srcset tính như ảnh 100vw, tải thừa. Phải truyền `sizes`.
- `width`/`height` suy ra aspect ratio để tránh layout shift. Ở đây ô đã có kích thước từ grid, nên `fill` là đủ.

`sizes` cho từng biến thể: lấy từ độ rộng ô thật khi render. Ở 1440px viewport, container bị cap bởi `--client-container-max` (1200px, [R2] dòng 17), mỗi ô 1 cột khoảng 280px, ô `wide` khoảng 580px. Viết `sizes` theo số này, không dùng `25vw` cho cả trang (sẽ tải ảnh to hơn cần thiết ở 1440). Kiểm tra bằng DevTools Network.

Ưu tiên ảnh: chỉ ảnh hàng đầu có thể là LCP. Dùng `preload` cho ảnh đó (xem mục 4). Các ảnh còn lại giữ `loading` lazy mặc định [N2].

Mobile 320px: 2 cột, mỗi cột khoảng 150px sau gap và padding. Cần kiểm tra thực tế ở 320 vì padding container chưa đọc trong lần này.

### Xếp hạng
1. CSS grid, row cố định + span class (trên). Không dependency, chiều cao biết trước, đúng DOM order.
2. `aspect-ratio` cho từng ô: đơn giản hơn, nhưng span hỗn hợp dễ tạo khoảng trống giữa các hàng.
3. Thư viện masonry/JS layout: loại (dependency, dễ CLS).

Rủi ro: `grid-auto-flow: dense` đổi thứ tự hiển thị khỏi thứ tự DOM/tab. Không dùng (đây là thực hành chuẩn, chưa kiểm chứng qua nguồn đã fetch).

---

## 4. Campaign banner full-bleed, chia ảnh/chữ

### Quy tắc LCP [N2]
- Banner nằm trong viewport đầu tiên (above the fold): ảnh là LCP, dùng `preload`. Doc: "The image is the LCP element" và "above the fold, typically the hero image".
- Banner ở dưới fold: giữ `loading` lazy mặc định, KHÔNG preload.
- Không preload nếu có nhiều ảnh có thể là LCP tùy viewport (doc: "When you have multiple images that could be considered the LCP element depending on the viewport"). Dùng một `<Image>` duy nhất cho mọi viewport, dùng `sizes` để chọn độ phân giải.
- Doc đánh dấu `priority` đã deprecated từ Next 16, dùng `preload` [N2]. Không dùng `priority` trong code mới.
- `sizes` đề xuất cho split 50/50: `(min-width: 768px) 50vw, 100vw`.

### Contrast chữ đè ảnh (đo bằng công thức WCAG relative luminance trên token thật)
Tính bằng awk từ hex trong [R2] (lần chạy này, không fetch):

| Cặp | Tỷ lệ |
|---|---|
| `--client-ink` #3b2f2a trên `--client-bg` #f6f1ea | 11.49:1 |
| `--client-ink-muted` #6b5d54 trên `--client-bg` | 5.63:1 |
| `--client-accent` #8a5a3c trên `--client-bg` | 5.18:1 |
| `--client-on-ink` #ffffff trên `--client-ink` | 12.92:1 |
| Chữ trắng trên overlay `--client-hero-overlay` rgba(59,47,42,0.45) đặt lên ảnh NỀN TRẮNG (trường hợp xấu nhất) | **2.54:1** (composite ~ rgb(167,161,159)) |

Hệ quả: overlay 0.45 của hero-slider ([R1] `client-theme-tokens.css` dòng 32, [R3] dòng 41) không đủ contrast khi ảnh sáng. Ngưỡng 4.5:1 (chữ thường) và 3:1 (chữ lớn) là WCAG 1.4.3 (AA), chưa lấy từ nguồn đã fetch trong lần này. Cần xác nhận. Đây là rủi ro cho hero hiện tại, đáng báo cho chủ repo.

### Xếp hạng
1. **Split: ảnh + panel chữ nền solid** (`--client-bg` hoặc `--client-ink`). Contrast cố định theo token, không phụ thuộc ảnh. Mobile xếp chồng: ảnh trên, chữ dưới. Đề xuất chọn.
2. Chữ đè ảnh + gradient: chỉ khi ảnh được art-direct và đã test worst case (ảnh sáng nhất). Phải đo, không ước lượng bằng mắt.
3. Video nền: loại (chuyển động + a11y + nặng, đi ngược WCAG 2.2.2 nếu tự chạy).

Ảnh full-bleed: khung ảnh giữ `aspect-ratio` (token có sẵn `--client-hero-ratio`, `--client-hero-ratio-mobile`) để không CLS.

---

## Unresolved / chưa kiểm chứng
- Giấy phép OFL của Playfair Display và Noto Serif Display: chưa kiểm (cần xác nhận trước khi chốt font).
- Chọn font cuối là đánh giá thẩm mỹ, cần duyệt bằng mắt với ảnh thật (Playfair vs Noto Serif Display).
- Nội dung WCAG 1.4.3 (ngưỡng contrast), `prefers-reduced-motion` (MDN), `inert` và cú pháp `min()`/`calc()` trong `sizes`: không lấy từ nguồn đã fetch, cần xác nhận.
- Nguồn chữ marquee (bảng/model nào trong home section config): chưa khảo sát code.
- Hành vi preload khi có nhiều font gọi ở root layout: chưa đo số request thật.
- Padding container ở 320px chưa đọc, nên con số 150px cột mobile chỉ là ước lượng.

**Status:** DONE_WITH_CONCERNS
**Summary:** Playfair Display là font headline tốt nhất (có subset `vietnamese`, variable 400–900, xác nhận từ CSS Google Fonts). Bodoni Moda bị loại vì không có subset tiếng Việt. Marquee dùng checkbox pause CSS-only, mosaic dùng grid row cố định + span class, banner split với panel solid. Có concern: overlay hero 0.45 cho contrast 2.54:1 với ảnh trắng; cần test trước khi giữ. Vượt ngân sách lookup (7 thay vì ~5), WCAG 2.2 gốc bị chặn nên dùng 2.1 Understanding và WCAG2Mobile.
