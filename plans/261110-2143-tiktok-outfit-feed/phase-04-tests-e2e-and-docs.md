# Phase 04 — E2E, snapshot, docs

**Ưu tiên:** cao · **Chạy sau:** 01, 02, 03 · **Trạng thái:** pending
**Sở hữu:** `e2e/**`, `docs/**`

## Việc

- E2E home sections (`content-home-*`, `content-editorial-sections-render`): setup đặt `homeMode: 'sections'`, teardown trả lại.
- Sửa theo feed: `public-looks-and-navigation`, `public-viewport-and-no-js`, `public-responsive-viewports`, `content-collections-flow`.
- Spec mới `public-outfit-feed.spec.ts`: khung đầu vừa viewport (390×844, 1440×860), cuộn tới cuối tự tải lô kế, nút ▲▼ chuyển khung, tắt JS vẫn có link "Xem tiếp", collection không còn ảnh bìa/mô tả.
- Snapshot `visual-reference-screenshots`: cập nhật có chủ đích, ghi rõ trang nào đổi.
- Docs: `docs/project-changelog.md`, `docs/system-architecture.md` (endpoint feed, `homeMode`), `docs/development-roadmap.md`.
