# Phase 03 — Admin: chọn kiểu trang chủ

**Ưu tiên:** trung bình · **Song song với:** 01, 02 · **Trạng thái:** pending
**Sở hữu:** `apps/web/src/components/admin/**`, `apps/web/src/app/admin/**`, `apps/web/test/admin/**`

## Việc

1. Settings: thêm ô chọn **"Trang chủ hiển thị"** cạnh nhóm "Số mục mỗi trang" (`components/admin/settings-listing-fields.tsx`, `settings/settings-form-state.ts`, `validation-messages.ts` nếu cần). Hai lựa chọn, dạng radio cho nhìn là hiểu:
   - "Feed outfit — lướt từng outfit như TikTok" (mặc định)
   - "Các khối tự sắp — theo Trình dựng trang chủ"
   Giá trị gửi API: `homeMode` (`HOME_MODES` từ `@under30ss/shared`); form trống → `DEFAULT_HOME_MODE`.
2. Trình dựng trang chủ (`components/admin/home-editor/**`): khi settings đang là `feed`, hiện 1 dòng nhắc trên cùng: "Trang chủ đang hiển thị Feed outfit. Các khối bên dưới chỉ hiện khi chọn 'Các khối tự sắp' trong Cài đặt." + link qua trang Cài đặt. Đọc settings theo cách trình dựng đang lấy data.
3. Test vitest trong `apps/web/test/admin/**`: form gửi đúng `homeMode`, hiện dòng nhắc khi `feed`, không hiện khi `sections`.

## Xong khi

- Unit test admin pass, `tsc` web sạch. Ảnh chụp trang Cài đặt + trình dựng (1440 và 390) lưu vào `plans/261110-2143-tiktok-outfit-feed/visuals/`.
