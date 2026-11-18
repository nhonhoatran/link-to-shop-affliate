# Tìm kiếm collection

Trạng thái: triển khai xong, kiểm tra tập trung đạt.

## Thay đổi
- Header có form GET /collections?q=..., nhãn rõ ràng; desktop ở cột phải, mobile hàng riêng. Không cần JavaScript để gửi tìm kiếm.
- API public tìm tên hoặc slug, trim từ khoá, không phân biệt hoa thường, escape ký tự regex, chỉ trả collection đã đăng có ảnh bìa. Query và tổng số dùng chung filter trước phân trang.
- Trang collection giữ từ khoá ở ô nhập và link phân trang; có tổng kết quả, thông báo không tìm thấy và link xoá tìm kiếm.
- Trang kết quả tìm được noindex, follow; canonical về /collections.
- MAX_COLLECTION_SEARCH_LENGTH = 100 là giới hạn kỹ thuật payload, chia sẻ giữa schema và input. URL thủ công được trim/cắt tại giới hạn này trước khi gọi API.
- PublicMessage thêm headingLevel tuỳ chọn (mặc định h1) để trang collection giữ một h1 duy nhất khi không có kết quả.

## Kiểm tra
- pnpm --filter @under30ss/shared build: đạt.
- pnpm --filter @under30ss/web exec vitest run test/app/collections-page.test.tsx test/public/site-header.test.tsx test/lib/public-collection-loaders.test.ts test/lib/build-collection-metadata.test.ts test/public/parse-collection-search-param.test.ts: 34/34 đạt.
- pnpm --filter @under30ss/api exec vitest run test/collections-public.test.ts: 7/7 đạt.
- pnpm --filter @under30ss/web typecheck: đạt.
- Vitest cảnh báo config CommonJS/ESM hiện có; không ảnh hưởng kết quả.
- Chưa kiểm tra trình duyệt thật/mobile trong subtask này; cần kiểm tra tích hợp của phiên chính.

## File chính
- packages/shared/src/collection-contract.ts
- apps/api/src/services/public-collection-service.ts
- apps/web/src/components/public/collection-search.tsx và collection-search.module.css
- apps/web/src/components/public/site-header.tsx và site-header.module.css
- apps/web/src/components/public/collection-copy.ts, parse-collection-search-param.ts, public-message.tsx
- apps/web/src/app/(public)/collections/page.tsx và collections-page.module.css
- apps/web/src/lib/seo/public-collection-loaders.ts, absolute-url.ts, build-collection-metadata.ts

Không sửa outfit hoặc settings. Không commit. Giữ nguyên thay đổi .gitignore có trước.

- ESLint trên các file thay đổi trong subtask: đạt. git diff --check: không có lỗi whitespace (chỉ cảnh báo line ending). Rà xưng hô riêng tư bằng rg: không có kết quả.
