---
title: "Under30ss Shop the look v1"
description: "Trang lookbook dựng từ dữ liệu: người mẫu giữa, món 2 bên nối đường chỉ, bấm mở link affiliate; có admin + upload S3. Plan chia phase để cook song song."
status: completed
priority: P1
effort: 57h
issue:
branch:
tags: [feature, frontend, backend, database, api, auth, infra]
blockedBy: []
blocks: []
created: 2026-11-06
---

# Under30ss Shop the look v1 (parallel)

## Overview

Lookbook "Shop the look" giống 2 ảnh mẫu, dựng HTML/CSS/SVG từ MongoDB. Bấm món → link affiliate tab mới. Admin quản lý outfit, upload ảnh lên S3 (mặc định RustFS). Next.js SSR cho SEO, Express API riêng.

Thiết kế đã duyệt: [brainstorm report](../reports/brainstorm-261106-1201-under30ss-shop-the-look.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Foundation & contracts](./phase-01-foundation-and-contracts.md) | Done |
| 2 | [Backend API](./phase-02-backend-api.md) | Done |
| 3 | [Image assets & seed data](./phase-03-image-assets-and-seed-data.md) | Done |
| 4 | [Lookbook UI components](./phase-04-lookbook-ui-components.md) | Done |
| 5 | [Public pages & SEO](./phase-05-public-pages-and-seo.md) | Done |
| 6 | [Admin UI](./phase-06-admin-ui.md) | Done |
| 7 | [Integration, testing & deploy](./phase-07-integration-testing-and-deploy.md) | Done (VPS/HTTPS chưa thử) |

## Tiến độ 2026-11-06

- Kiểm chứng: typecheck, lint, build sạch. Test: shared 32, api 65, web 164 = 261 pass, 5 lần chạy liên tiếp xanh (nguồn: fix-round-2 reports; không chạy lại khi sync).
- Review: 7.5 → 8.5/10 sau 2 vòng sửa. Điểm 8.5 chưa có file báo cáo trong `plans/reports/`.
- Quyết định: D1 featured chặn draft (409, UI disable); D2 `ADMIN_TIME_ZONE` mặc định `Asia/Ho_Chi_Minh`; D3 đổi mật khẩu ngoài v1; D4 prod HTTPS (Caddy auto), dev HTTP; D5 Mongo auth + bỏ publish port trong compose prod (P7).
- Hoãn sang P7 (cần Docker/VPS): compose up; Caddy 413 JSON, `/api/health` 404 qua Caddy, `/media` chỉ GET; RustFS public-read policy; build Dockerfile; Mongo auth compose prod; L8 object S3 mồ côi; L9 message lỗi field tiếng Việt; `next/image` unoptimized → ảnh model 1600px tải trên mobile; độ cong connector so ảnh mẫu; kiểm 320/390px; 3 file test vượt 200 dòng.
- Phụ thuộc ngoài: ảnh người mẫu sạch + link affiliate (Kim); VPS + domain; xác nhận account GitHub, email commit, tên repo trước `git init`.
- Chưa làm: toàn bộ P7 (ráp + seed thật, e2e, visual, Lighthouse, ui-consistency verifying, review cuối, compose prod, backup, docs, git).

## Tiến độ 2026-11-07 (P7)

- Stack compose chạy trong WSL2, seed thật, smoke test qua Caddy. Lỗi tích hợp đã sửa: Caddy `/api/health` lọt qua `/api/*`; seed không đọc được ảnh ngoài `seed/` (thêm `imageRoot`); hotspot lệch do khung người mẫu bị kéo giãn theo hàng grid (lỗi từ P4).
- Kiểm chứng cuối: typecheck, lint sạch; unit shared 32, api 83, web 166 = 281 pass; e2e Playwright 17/17 (2 lần liên tiếp); Lighthouse SEO 100, a11y 100 (`/`, `/look/dramatic`, desktop + mobile).
- Review cuối 8.5/10, sửa hết 2 Medium (khoá admin từ xa → cookie thiết bị; index featured tạo lúc khởi động) và L1–L7, L9. L8 hoãn.
- Lookbook chỉnh theo ảnh mẫu (mũi tên, hotspot ẩn, đường cong cubic, subtitle nghiêng, pin trên mobile); ui-consistency verifying chạy lại cho lookbook.
- Compose prod (Mongo auth, không publish port, HTTPS), backup/restore đã thử trên stack riêng. Docs trong `docs/`. Git: repo local, commit theo account đã xác nhận, chưa push.
- Còn lại: deploy VPS + HTTPS thật; ảnh người mẫu sạch + link affiliate (Kim); các mục hoãn trong `docs/development-roadmap.md`.

## Phụ thuộc & wave

P1 → (P2, P3, P4 song song) → (P5, P6 song song) → P7. Critical path ước tính ≈ 31h.

## File ownership

| Phase | Sở hữu độc quyền |
|-------|------------------|
| P1 | Root config, `infra/docker-compose.yml`, `infra/caddy/**`, `infra/rustfs-init/**`, `apps/*/package.json|tsconfig|Dockerfile|.env.example|vitest.config.ts`, `packages/shared/**`, `apps/api/src/config/**`, `apps/web/next.config.ts`, `app/layout.tsx`, `app/globals.css`, `styles/**`, `lib/api-client-*.ts`, `lib/media-url.ts` |
| P2 | `apps/api/src/**` trừ `config/**`; `apps/api/test/**` |
| P3 | `scripts/assets/**`, `assets-source/cut/**`, `seed/**` |
| P4 | `apps/web/src/components/lookbook/**`, `apps/web/test/lookbook/**` |
| P5 | `app/page.tsx`, `app/look/**`, `app/not-found.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/api/revalidate/**`, `lib/seo/**`, `test/public/**` |
| P6 | `app/admin/**`, `components/admin/**`, `hooks/admin/**`, `test/admin/**` |
| P7 | `e2e/**`, `playwright.config.ts`, `infra/docker-compose.prod.yml`, `infra/backup/**`, `docs/**` |

Ngoại lệ đã ghi nhận: fix round sửa file P1 (`web-env.ts`, `design-tokens.css`, `globals.css`) và P5 tạo `components/public/**`, test ở `test/app/**`. Chi tiết trong từng phase file, mục "Ghi chú đồng bộ".

## Luật & quy ước

- Chỉ đọc/import file phase khác; cần đổi hợp đồng `packages/shared` → báo trước khi sửa. Không tự thêm dependency.
- File code < 200 dòng, kebab-case, comment tiếng Anh tối thiểu.
- Giá trị nghiệp vụ không fix cứng → `settings` (DB) hoặc env.
- List/filter/phân trang admin làm server-side.
