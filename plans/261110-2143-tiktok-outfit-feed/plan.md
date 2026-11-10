---
status: completed
created: 2026-11-10
mode: parallel
---

# Feed outfit kiểu TikTok

Phản hồi khách: lưới outfit, ảnh bìa + mô tả bộ sưu tập và lookbook cao quá màn hình không hợp người dùng đến từ TikTok.
Mục tiêu: mỗi outfit là một khung vừa đúng màn hình, lướt dọc từng cái một, cuộn gần hết thì tự tải thêm.

## Quyết định đã chốt (2026-11-10)

| # | Câu hỏi | Chốt |
|---|---|---|
| D1 | Mỗi khung show gì | Nguyên lookbook (người mẫu + món đồ + mũi tên), thu cho vừa khung, bấm món đồ đi thẳng link mua |
| D2 | Hết trang thì sao | Tự tải thêm do server render (server action), link `?page=N+1` dự phòng khi không có JS / cho SEO |
| D3 | Trang chủ | Trang chủ = feed (outfit nổi bật đứng đầu). Khối admin tự sắp giữ data, bật lại bằng setting `homeMode` |

## Số đo hiện trạng (Playwright, `/look/mesh-84`)

- Desktop 1440×860: thông báo 44 + header 65 → còn ~751px; lookbook cao 1622px ở rộng 960 → thu còn ~46%.
- Mobile 390×844: thông báo 96 + header 161 → còn ~587px; lookbook cao 880px → thu còn ~67%.

## Thứ tự chạy

```
Phase 00 (contract, tuần tự, nhỏ)
   ├── Phase 01 API            ┐
   ├── Phase 02 Web feed + trang ├─ song song
   └── Phase 03 Admin setting  ┘
Phase 04 Test + e2e + docs (sau khi 01–03 xong)
```

| Phase | Nội dung | Sở hữu file | Trạng thái |
|---|---|---|---|
| [00](phase-00-shared-contract.md) | Kiểu dữ liệu chung trong `packages/shared` | `packages/shared/src/**` | done |
| [01](phase-01-api-feed-and-home-mode.md) | Endpoint feed + lưu `homeMode` | `apps/api/**` | done |
| [02](phase-02-web-feed-and-pages.md) | Component feed + gắn vào `/`, `/looks`, `/collections/[slug]` | `apps/web/src/components/feed/**`, `components/public/**`, `app/(public)/**`, `lib/seo/**`, `lib/feed/**`, `styles/**`, `apps/web/test/{public,app,feed}/**` | done |
| [03](phase-03-admin-home-mode-field.md) | Ô chọn "Trang chủ hiển thị" + nhắc trong trình dựng trang chủ | `apps/web/src/components/admin/**`, `apps/web/test/admin/**` | done (chưa chụp ảnh màn admin) |
| [04](phase-04-tests-e2e-and-docs.md) | E2E, snapshot, docs | `e2e/**`, `docs/**` | done — e2e 126/126, unit web 694/694 (2026-11-11) |

## Luật phối hợp

- Không ai sửa file ngoài vùng sở hữu. Cần đổi `packages/shared` → báo lead, lead sửa.
- Phase 02 không chờ API: gọi endpoint theo contract phase 00; kiểm tra thật khi 01 xong (lead ghép).
- Mỗi phase tự chạy typecheck + unit test vùng của mình trước khi báo xong.

## Ngoài phạm vi

- Trang chi tiết `/look/[slug]` và trang lưới `/collections` giữ nguyên.
- Không đổi URL theo từng slide khi lướt (YAGNI).
