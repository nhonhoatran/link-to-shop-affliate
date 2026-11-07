# Phase 07 — Integration, testing & deploy

## Context Links
- [plan.md](./plan.md) · tất cả phase trước

## Overview
- Priority: P1 · Status: Done (VPS/HTTPS chưa thử) · Effort: 6h · Wave 4 (tuần tự) · blockedBy: P2, P3, P5, P6
- Ráp toàn hệ thống trên compose, chạy seed thật, e2e + visual so ảnh mẫu, review, compose prod, docs, git.

## File Ownership
- `e2e/**`, `playwright.config.ts`, `infra/docker-compose.prod.yml`, `infra/backup/**`, `docs/**`
- Lỗi tích hợp nằm ở file phase khác → lead sửa (wave tuần tự nên không xung đột), ghi lại trong report.

## Requirements
- `docker compose up` đủ 5 service; `pnpm create-admin`; `pnpm seed:samples` với `seed/sample-outfits.json` (dev: cho phép publish placeholder qua cờ `--publish-with-placeholder`, chỉ local).
- E2E (Playwright):
  - Bấm ảnh, tên, hotspot từng món → đúng `href`, `target=_blank`, `rel` có `sponsored`.
  - Hover món ↔ hotspot 2 chiều; mobile 390px & 320px không tràn ngang; chữ ≥11px.
  - Admin: login → tạo outfit → upload → đặt điểm → đăng → thấy ở public (revalidate chạy).
  - Không JS: trang public đọc được, link bấm được.
- Visual: chụp 1440 & 390, đặt cạnh ảnh mẫu → `plans/261106-1201-under30ss-shop-the-look/visuals/`.
- Lighthouse SEO ≥95 (desktop + mobile).
- `ui-consistency:verifying` cho public + admin.
- code-reviewer review toàn bộ; sửa tới khi sạch.
- `infra/docker-compose.prod.yml`: Caddy auto HTTPS theo `DOMAIN`, không expose Mongo/RustFS; `infra/backup/backup-mongo-and-bucket.sh` (mongodump + đồng bộ bucket).
- docs-manager: `docs/system-architecture.md`, `docs/code-standards.md`, `docs/deployment-guide.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`.
- Git: **dừng hỏi** account GitHub, email commit, tên repo trước `git init`/`remote add`/push.

## Implementation Steps
1. Compose up, create-admin, seed, smoke test thủ công.
2. Sửa lỗi lệch hợp đồng (nếu có).
3. E2E + visual + Lighthouse + ui-consistency verifying.
4. Code review + fix; chạy lại toàn bộ test.
5. Compose prod + backup; thử VPS staging nếu đã có.
6. Docs.
7. Git (sau khi xác nhận account).

## Todo List
- [x] Ráp + seed + smoke test
- [x] E2E public + admin
- [x] Visual so ảnh mẫu
- [x] Lighthouse SEO ≥95
- [x] ui-consistency verifying
- [x] Code review + fix
- [x] Compose prod + backup
- [x] Docs
- [x] Git init (sau xác nhận)

### Mục hoãn từ P1–P6 (phải xử lý trong P7)
- [x] Compose: `docker compose up` đủ 5 service; Dockerfile api/web build được (P1, P2)
- [x] Caddy: 413 trả JSON `PAYLOAD_TOO_LARGE`; `/api/health` trả 404 từ ngoài; `/media` chỉ GET/HEAD (fix round 2)
- [x] RustFS: public-read policy cho prefix `public/` hoạt động (`infra/rustfs-init/init-bucket.sh`); upload thật, file xem được qua `/media/...` (P1, P2)
- [x] Seed thật: `pnpm seed:samples` với `seed/sample-outfits.json` (P2, P3)
- [x] Mongo auth + bỏ publish port trong `docker-compose.prod.yml` (D5)
- [x] L8: object S3 mồ côi (ghi vào roadmap)
- [ ] L9: message lỗi field từ server tiếng Việt (P2, P6)
- [ ] `next/image` unoptimized: ảnh model 1600px tải trên mobile; cân nhắc resize theo viewport (P1)
- [x] Độ cong connector so ảnh mẫu, chỉnh `--lookbook-curve-ratio` (P4)
- [x] Visual 320px và 390px, không tràn ngang, chữ ≥11px (P4)
- [x] Ba file test vượt 200 dòng, tách file: `apps/api/test/outfits.test.ts` (234), `apps/api/test/media-settings-admins.test.ts` (218), `apps/web/test/admin/settings-and-users.test.tsx` (207)
- [x] Lighthouse SEO ≥95; `curl` HTML có tên/mô tả/link với dữ liệu seed (P5)
- [ ] Trình duyệt thật: admin tạo outfit 8 món, đặt điểm, đăng dưới 10 phút; lưu → public cập nhật (P6)
- [ ] Thay ảnh người mẫu sạch khi bên Kim gửi; điền link affiliate thật
- [x] Tài liệu P7: `docs/**` chưa có. Lập `docs/` theo spec mục 26
- [x] Xác nhận trước git init: account GitHub, email commit, tên repo

## Success Criteria
- Mọi test pass (không skip). "Xong khi" của Kim đạt: giống ảnh mẫu desktop + mobile; mỗi món mở đúng link.
- VPS (nếu có): HTTPS chạy, backup chạy được.

## Risk Assessment
- Chưa có VPS/domain → dừng ở compose local + deployment guide.
- Ảnh người mẫu chưa sạch → visual chưa đạt 100%; ghi rõ là phụ thuộc bên ngoài.

## Security Considerations
- Secret qua `.env` trên VPS; đổi mật khẩu admin seed sau deploy; Mongo/RustFS không public.

## Next Steps
- Để sau: giá, tìm kiếm, trang danh sách outfit, thống kê lượt bấm (`/go/:itemId`).
