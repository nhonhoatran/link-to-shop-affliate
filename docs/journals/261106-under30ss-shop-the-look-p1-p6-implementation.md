# Under30ss Shop the look v1: triển khai P1–P6 song song và vòng sửa lỗi

**Date**: 2026-11-06
**Severity**: High
**Component**: apps/api, apps/web, packages/shared, infra (Docker compose, Caddy, RustFS)
**Status**: Resolved cho P1–P6. P7 (tích hợp, deploy) chưa làm theo quyết định của chủ repo.

## What Happened

Triển khai plan "Under30ss Shop the look v1" theo sóng (wave): P1 (khung + hợp đồng chung) chạy tuần tự, sau đó P2 (API), P3 (ảnh), P4 (component lookbook) chạy song song, rồi P5 (public/SEO) và P6 (admin) chạy song song. Ma trận sở hữu file ngăn các agent sửa chồng lên nhau. Lead chỉ sửa file hợp đồng đông cứng giữa các sóng.

Quy trình kiểm chứng: tester, code-reviewer, và ui-consistency checker. Kết quả cuối: typecheck, lint, build sạch; 261 test (32 shared, 65 api, 164 web); 5 lần chạy liên tiếp đều xanh.

## Technical Details

- **Lỗi ngay sau P1**: TypeScript phải ghim `6.0.3` vì `typescript-eslint` chưa hỗ trợ từ `6.1` trở lên.
- **Code review 7.5/10, 3 mục High**:
  - H1: cookie `secure` trên compose chạy HTTP làm login hỏng.
  - H2: `next/image` trong container gọi `localhost`, ảnh bị hỏng.
  - H3: rate limit login khóa theo `IP|email`, cho phép spraying và DoS argon2.
- **Flaky test**: `mongodb-memory-server` mặc định `launchTimeout` 10 s. Khi 3 suite boot nhiều mongod song song, lỗi `Instance failed to start within 10000ms`. Đã chuyển sang một mongod dùng chung qua vitest `globalSetup`, mỗi file một DB riêng.
- **Test sai**: test size-limit upload (`media-settings-admins.test.ts:77`) assert sai điều cần kiểm.
- **UI checker**: admin có khoảng 30 điểm không nhất quán. Trước khi tin checker, đã cài 3 lỗi có chủ ý vào bản sao để calibrate, và checker bắt đủ 3.
- **Sau vòng sửa 2**: re-review đạt 8.5/10. Sửa H3 làm phát sinh N1: limiter theo email không kèm IP cho phép kẻ tấn công khóa tài khoản admin. Đã sửa bằng 3 limiter (IP mọi lần thử, IP|email 5 lần lỗi, email 50 lần lỗi) và hàng đợi argon2 có giới hạn (`ARGON2_MAX_QUEUE`=20, trả 503).

## What We Tried

- Chạy lại test khi máy idle: 3 lần đều xanh, không tái hiện được lỗi.
- Thêm 12–24 tiến trình CPU burner: tái hiện được lỗi mongod boot quá 10 s.
- Tăng `launchTimeout` và `testTimeout` lên 60 s: đã qua 5 lần, nhưng vẫn là vá theo thời gian.
- Chuyển sang mongod dùng chung qua globalSetup (`launchTimeout` 120 s): cách làm được giữ lại.

## Root Cause Analysis

- Lỗi flaky là do mỗi file test tự boot một mongod, cộng với argon2 chạy dưới tải CPU. Không phải do logic nghiệp vụ.
- N1 xuất hiện vì sửa H3 chỉ nhìn một chiều (kẻ tấn công từ nhiều IP). Không rà lại chiều ngược lại (kẻ tấn công từ một IP nhắm nhiều email, hoặc một email từ nhiều IP).
- Checker UI ban đầu không được calibrate, nên không có bằng chứng là nó bắt được lỗi thật.

## Lessons Learned

- Đưa toàn bộ hợp đồng và dependency vào sóng 1. Mỗi lần sửa contract giữa sóng làm các agent phải làm lại.
- Calibrate checker (cài lỗi có chủ ý) trước khi tin kết quả của nó.
- Mọi sửa đổi về bảo mật phải qua review thứ hai. N1 là lỗi do chính bản sửa H3 gây ra.
- Quyết định D1–D5 (featured trên draft, múi giờ admin, không đổi mật khẩu ở v1, prod HTTPS, Mongo auth ở P7) cần ghi vào tài liệu chính thức.

## Next Steps

- P7 (chủ repo chưa cho làm): compose prod, Mongo auth, bỏ publish port, backup.
- Chưa kiểm chứng vì máy không có Docker: compose, Caddy (413 JSON, `/api/health`, `/media/*` chỉ GET), Dockerfile, RustFS public-read policy. Cần test trên môi trường có Docker trước khi deploy.
- Rủi ro hiệu năng: `next/image` đang `unoptimized`, nên trên mobile tải ảnh mẫu 1600px.
- Connector curve chưa so sánh trực quan với ảnh tham chiếu.
- Test sitemap (`apps/web/test/app/sitemap.test.ts`) từng flake dưới tải 24 burner, chưa tìm root cause.
- Object S3 mồ côi (L8): đưa vào roadmap P7.
- Git chưa init. Trước khi `git init`/push cần chủ repo xác nhận account GitHub, email commit, tên repo.

**Status:** Resolved cho P1–P6. P7 và kiểm chứng Docker còn mở.
