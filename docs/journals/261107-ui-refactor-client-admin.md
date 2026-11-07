# UI refactor client + admin: wave song song, và các lỗi chỉ lộ ra khi kiểm tra chéo (2026-11-06 → 2026-11-07)

**Plan:** `plans/261107-0913-professional-ui-refactor-client-admin/`
**Trạng thái:** Done. Không commit (chủ repo quyết định).

## Đã làm
- Chạy theo sóng: P1 → (P2 ∥ P4) → (P3 ∥ P5→P6) → P7 (tester ∥ ui-consistency verifying ∥ code review) → 2 agent sửa song song (client/API và admin) → chạy lại toàn bộ.
- Token màu dùng `light-dark()` cho admin, khối `[data-theme]` cho dark mode. Lookbook có hiệu ứng nối đường chỉ theo scroll.
- Kết quả cuối: `pnpm lint`, `pnpm typecheck` xanh. Unit: shared 37, api 102, web 265 passed. E2E 65/65 (trước đó 17). Visual 4/4 so với baseline P1. Lighthouse SEO 100 (mobile + desktop) trên `/`, `/looks`, `/look/dramatic`. Code review 8/10, sau đó sửa vòng hai.

## Lỗi chỉ lộ ra khi chạy thật
1. **`light-dark()` hỏng trong build.** Next + lightningcss hạ cấp thành `var(--lightningcss-light, …)`, biến này resolve ở `:root` thành invalid. Cách sửa: dùng khối `[data-theme]`. Hai khối dark phải giữ giống hệt nhau.
2. **`loading.tsx` của segment làm `redirect()` thành 200.** Segment `loading` bọc trang bằng Suspense, nên `redirect()` trả 200 kèm meta refresh thay vì 307. Chuyển Suspense vào trong trang.
3. **`notFound()` trong group `(public)` render hai `PublicShell`.** Kết quả là 2 `main`, 2 `header`, 2 `footer`. P3 chỉ test `/nope` (nằm ngoài group) nên không bắt được. Chỉ `ui-consistency verifying` bắt, bằng cách đếm phần tử thật ở 5 bề rộng. Sửa bằng `(public)/not-found.tsx` và `(protected)/not-found.tsx` của admin, thêm e2e đếm `main`.
4. **Lookbook chỉ nghe `load`.** Ảnh lỗi bắn `error`, không bắn `load`, nên đường nối bị `visibility: hidden` vĩnh viễn (`use-lookbook-ready.ts:31`, review H1).
5. **Scroll animation làm hàng card cuối mờ nửa vời** trên trang ngắn. `animation-range: entry 0% cover 30%` đổi thành `entry 0% entry 100%`.
6. **Nhiều agent chạy e2e cùng lúc.** Chúng dùng chung `test-results/e2e-outfit-state.json` và đụng login rate limit (20 IP / 15 phút). Kết quả: outfit `E2E …` mồ côi trong DB. Đã sửa teardown. Quy tắc: chỉ chạy e2e một lần một lúc. Đã tạo admin riêng cho e2e local, mật khẩu không ghi trong repo.
7. **Token topbar 56px, thực tế render 61px.** Thanh action sticky bị che 5px. Token phải tính từ chiều cao control.
8. **Cache settings:** tag + `revalidateTag(tag, { expire: 0 })` (Next 16 bắt buộc có profile), mất khoảng 100ms. Nhưng revalidate chạy sau khi response đã trả, nên e2e giữ poll tối đa 10s.
9. **Badge indicator của Next dev lọt vào visual baseline.** Đã loại trong `waitForSettled`.

## Quyết định
- Giữ `motion` 14.10.1. Chỉ dùng sau hydrate (header P3, toast P5), không dùng cho trạng thái ẩn lúc SSR.
- Bỏ hiệu ứng nhích lên khi hover món trong lookbook. Transform làm đường chỉ lệch khỏi ảnh. Giữ hover phóng ảnh, làm đậm, làm mờ món khác.
- Đổi spec visual sang chụp `[data-lookbook]` ngay ở P1, trước khi UI đổi, để có baseline thật.

## Bài học
- Test phân trang/404 phải đếm phần tử thật trên mọi route, đừng chỉ test một URL đại diện. Lỗi double shell nằm ngay trước mắt mà P3 bỏ sót.
- Agent báo "xanh" ở phase của mình không đủ. Cần một lượt kiểm tra chéo độc lập (ui-consistency, review) trước khi đóng.
- Đừng để nhiều agent chia sẻ một file state e2e và một rate limit. Tuần tự hoá hoặc cô lập state theo worker.
- Với CSS mới, kiểm bản build đã minify, không chỉ `next dev`. `light-dark()` và `animation-range` đều có chỗ bị biến đổi.

## Còn lại
- First Load JS delta của `motion` chưa đo.
- Visual baseline chỉ có win32 và chạy `next dev`. Chưa có baseline cho CI Linux/build production.
- Cookie `admin-theme` có `secure` qua Caddy :8080 chưa kiểm runtime.
- Một lần api test worker crash `0xC0000409`; chạy lại thì pass. Chưa rõ nguyên nhân, chưa tái hiện được.
- dnd-kit hydration mismatch trong editor: có từ trước plan, ngoài phạm vi.
- Owner: chủ repo quyết định commit và các mục trên. Thời điểm: chưa đặt.

## Báo cáo liên quan
- `plans/reports/code-reviewer-261107-1205-ui-refactor-review.md`
- `plans/reports/ui-consistency-verifying-261107-1205-ui-refactor.md`
- `plans/reports/tester-261107-0528-ui-refactor-e2e.md`
