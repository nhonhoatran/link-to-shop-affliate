# Editorial monochrome + 4 section trang chủ + bản tin: lỗi nằm ở đường nối giữa các agent (2026-11-08)

**Date**: 2026-11-08
**Severity**: High
**Component**: Public shell + home sections, admin (re-skin + Đăng ký nhận tin), API newsletter/settings, e2e content suite
**Status**: Resolved (code, e2e 111/111). Còn mở: axe, hero pixel, Q4 chữ đồng ý, Caddy encode

**Plan:** `plans/261108-0923-editorial-luxury-redesign-and-new-sections/plan.md` (mục "Kết quả")
**Review:** `plans/reports/code-reviewer-261108-editorial-redesign.md` (8/10, 0 critical)
**Test:** `plans/reports/tester-261108-editorial-redesign-e2e.md`, `plans/reports/fullstack-developer-261108-e2e-closeout.md`

## What Happened
Đổi token sang editorial monochrome (nền `#FAF8F5`, chữ `#111`, Playfair Display cho tiêu đề), re-skin shell public và admin, thêm 4 section (CampaignBanner, Marquee, Gallery, NewsletterSignup) và luồng bản tin single opt-in có bản ghi đồng ý. Chạy theo wave P1 → (P2 ∥ P3 ∥ P4 ∥ P5) → P6, chưa commit. Kết quả: unit shared 164 / api 223 / web 664, e2e 111/111, `git status` 200 mục thay đổi.

## The Brutal Truth
Parallel wave nghe thì nhanh, nhưng phần lớn lỗi không nằm trong code của từng agent. Mỗi agent xanh trong phạm vi file của mình, lỗi chỉ lộ khi ghép lại. P4 và P5 được phép "code song song theo contract" trong khi P2 chưa có route thật, nên hai bên tự đoán. Đây là lỗi đoán trước được. Thêm vào đó e2e tốn thêm một vòng: chạm login limit 20/15 phút hai lần, và teardown không restore được settings. Ngày này mệt, và cái mệt đó là do quy trình chưa đủ chặt, không phải do bài toán khó.

## Technical Details
- Preload LCP trên `/`: 5 → 1 sau sửa H1. Prod (compose :8080) đo DOM: 1 ở cả 1440 và 390.
- LCP 328–368 ms, CLS 0. First Load JS `/`: 199.8 KiB (baseline 199.1, budget +15).
- Smoke chuỗi IP prod: PASS. Bucket A 2 nguồn, XFF giả bị Caddy bỏ, Server Action đếm đúng IP.
- Caddy `encode zstd gzip`: zstd 208.8 KiB, gzip 199.5 KiB. Chưa đổi.

Lỗi ở đường nối:
1. **Duplicate import từ agent song song làm dev server hỏng.** Ghi nhận từ điều phối. Không tìm thấy trong report nào, nên không có stack trace để dẫn chứng.
2. **Unsubscribe POST vs PATCH.** Report P5 ghi `POST adminNewsletterUnsubscribe(id)` vì P2 chưa có route. Đặc tả P2 (`phase-02-...md:42`) là PATCH. Hiện cả hai đầu đều PATCH: `newsletter-row-actions.tsx:37`, `admin-newsletter-routes.ts:34`.
3. **CampaignBanner image key không validate khi save.** `home-section-image-mapper.ts` không có dòng nào trong `file-ownership-matrix.md`, tức là không có chủ. Hiện `home-layout-guards.ts:18-19` đã kiểm `isPublicKey` qua `listSectionImageKeys`, có CampaignBanner. Trước khi sửa, `mapSectionImages` và `listSectionImageKeys` chỉ biết HeroSlider và TextWithImage (phát hiện bởi agent P2), nên key ảnh banner lọt qua không kiểm.
4. **Gallery lặp outfit nổi bật (M1).** Đã sửa: `home-section-resolver-service.ts:58` `shownOutfitSlugs` loại slug của FeaturedLookbook.
5. **5 preload (H1).** React 19 tự preload `<img>` eager không có `loading="lazy"`. `outfit-card.tsx:30` và `collection-card.tsx:36` đặt eager cho mọi hàng; `lookbook-model-figure.tsx:18` luôn preload.
6. **Đổi phạm vi giữa chừng.** Chủ repo đổi công tắc bản tin: PUT thiếu `newsletterConsent` sẽ xoá câu đồng ý. Version vẫn tăng đơn điệu (24 → 25 trên DB dùng chung).
7. **E2E.** Login limit chạm 2 lần. Playwright xoá `test-results/` làm mất `content-snapshot.json`, đã chuyển sang `e2e/.state/`. Mobile keyboard drop: thay pause 100 ms bằng chờ từng announcement.
8. **Header 320px.** `site-header.module.css:42` `overflow-x: auto` ẩn link "Bộ sưu tập". Đã đổi sang `flex-wrap`.

## What We Tried
- Gate preload lookbook theo `priority`, card chỉ eager khi `firstRow && highPriority`. `/`, `/looks`, `/collections` đều còn 1 preload.
- E2E: tester đề xuất approve visual rồi re-baseline, hoặc tách `content-setup` khỏi `visual`. Đã chọn re-baseline một lần 4 PNG, chạy full không `--no-deps`: 111/111.
- Compose `down` không chạy vì Mongo và RustFS dùng chung với dev. Chỉ stop `caddy`, `web`, `api`.

**Visual dramatic 390:** tester ghi lệch 16 px (cột ngắn hơn). Xem ảnh candidate/baseline: Playfair hẹp hơn nên nhãn "TÚI ĐEO CHÉO" còn 1 dòng thay vì 2, cột dồn lên; hotspot vẫn khớp món. Kết luận: hệ quả của đổi font (Q2), không phải lỗi bố cục; đã duyệt và re-baseline 2026-11-08.

## Root Cause Analysis
- Contract chỉ có path, không có HTTP method. Hai agent chọn hai method khác nhau.
- Mapper ảnh không có chủ trong ma trận, nên không ai chịu trách nhiệm validate key khi save.
- Preload dựa vào mặc định của React, không gate theo LCP. Dedupe Gallery chỉ áp cho OutfitList.
- E2E teardown ghi vào DB dùng chung mà không có guard host. Lỗi này đã có từ 2026-11-07 và chưa được sửa tận gốc.

## Lessons Learned
- Đặc tả API phải ghi method + path trong `packages/shared`, không chỉ path builder.
- Mọi đường save ảnh phải validate key, kể cả file mapper "phụ".
- Gate `loading`/`preload` theo vị trí LCP, đừng để framework đoán.
- Đừng để tới P6 mới chạy ghép. Dev server và một luồng thật phải chạy sớm giữa các wave.
- Visual baseline: khi tester và plan mâu thuẫn, ghi cả hai và chọn người chịu trách nhiệm, đừng coi "đã duyệt" là hết vấn đề.

## Next Steps
- **Chủ repo + luật sư:** Q4 chữ đồng ý và link chính sách. Bắt buộc trước go-live.
- **Axe:** cần thêm dependency, plan cấm dep mới trong đợt này. Quyết riêng.
- **Hero pixel:** publish HeroSlider trên DB dùng chung, hoặc chấp nhận công thức 5.10:1 (`client-theme-tokens.css:42`).
- **Caddy:** đo rồi mới đổi thứ tự `zstd gzip`.
- **UI còn mở:** K3 (fieldset disabled khác mẫu announcement), G4 lookbook (đậm hay 400), I2, I3, G1 (xoá `--client-hero-overlay`).
- **Git:** chưa commit. Commit một bộ, tiếng Anh, conventional, khi chủ repo yêu cầu.
- **Deferred:** dedupe Gallery cho nguồn `manual`/`collection`; N+1 khi tải nhãn trong editor.
