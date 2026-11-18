---
date: 2026-11-18
plan: 261118-desktop-ai-import
role: tester-debugger
status: passed
---

# Kiểm thử shared và desktop nhập ảnh

## Kết quả kiểm chứng cuối

| Phạm vi | Kết quả | Bằng chứng |
|---|---|---|
| Shared toàn bộ | 224/224 test; 11 file; 0 lỗi | [JSON shared](./261118-desktop-shared-tests.json) |
| Desktop main, lượt full | 68/68 test; 11 file | Nằm trong JSON desktop |
| Desktop UI, lượt full | 22/22 test; 4 file | Nằm trong JSON desktop |
| Desktop tổng, lượt full | 90/90 test; 15 file; 0 lỗi | [JSON desktop](./261118-desktop-all-tests.json) |
| IPC partial recovery sau thay đổi cuối | 6/6 test; gồm 3 case bổ sung | [JSON IPC recovery](./261118-desktop-runtime-partial-tests.json) |
| Typecheck desktop + shared | Cả hai exit 0 | Lệnh bên dưới đã chạy sau fix credential và atomic rename |
| Lint test/shared/helper được bổ sung | Exit 0 | Lệnh bên dưới đã chạy trên bản cuối |
| Helper Codex live | Strict typecheck exit 0 | TypeScript chạy riêng trên hai script probe |

Đã đọc lại hai JSON kết quả và xác nhận `success=true`, `numFailedTests=0`. Chưa đo phần trăm coverage; số test không thay thế tỷ lệ bao phủ code.

Sau lượt full, source bổ sung cho phép mở entity đã có ID xác nhận dù receipt đang processing/failed. Chỉ chạy lại file IPC bị ảnh hưởng: cả 6 case pass, gồm 3 case mới. Không ghi nhận một lượt full 93 test chưa chạy.

## Các ranh giới đã kiểm

- Schema poster: null cho dữ liệu chưa rõ, số món thay đổi, crop có phần trăm hữu hạn/đúng biên, ID/thứ tự không trùng, JSON version hợp lệ, anchor đổi hệ tọa độ. Prompt không chứa đáp án mẫu.
- Settings: token được mã hóa qua interface riêng, view chỉ có mask; đổi origin bỏ token; OS key khác không đọc được; prompt override có phiên bản; config hỏng phục hồi từ backup.
- Credential hỏng: không lấy lại token đã xóa từ backup; view có cảnh báo và vẫn cho lưu token mới/xóa token. Test tại `apps/desktop/test/main/settings-store.test.ts:57` và `:68`.
- Folder/checkpoint: file nguồn giữ nguyên, EXIF xoay đúng trước khi dùng tọa độ, file hỏng/giới hạn quét/dung lượng bị chặn; junction/path traversal/cross-session asset không thoát phạm vi. Test cross-session tại `apps/desktop/test/main/session-storage.test.ts:100`.
- Bản nháp: crop thật bằng Sharp, sửa làm mất approval và tăng revision; stale revision bị từ chối; dữ liệu đã gửi đang chưa chắc kết quả bị khóa sửa; payload web chỉ tham chiếu media ID.
- Đồng bộ: chỉ mục đã duyệt được gửi; retry giữ operation ID + hash và dùng receipt upload có sẵn; GET đối soát sau mất response; bytes crop đổi bị phát hiện; đổi token cùng origin hoặc đổi site bị chặn trước request, kể cả sau mở lại app.
- Hạn mức động: lấy từ capabilities; vượt số operation/media dừng trước upload/commit; retry không đếm trùng media ID đã tồn tại. Test tại `apps/desktop/test/main/sync-session.test.ts:108`, `:118` và `:127`.
- HTTP importer: `redirect=error`, `credentials=omit`, origin HTTPS/loopback, cap body response, timeout/cancel, lỗi HTML proxy và token bị website echo được xử lý; multipart chứa bytes ảnh thật.
- Recovery một phần: chỉ ID đã được xác nhận mới mở được tại website đã gắn phiên; không dùng URL tùy ý do server trả và không đoán link khi chưa có ID.
- Jobs: mỗi phiên chỉ một tác vụ, hủy chặn ảnh tiếp theo, shutdown chờ dừng, retry lỗi gateway, dùng snapshot cấu hình của phiên.
- Codex: MCP effective được liệt kê/tắt/kiểm lại; token web không qua env hoặc prompt; event tool ngoài phạm vi và lỗi fatal bị từ chối; `item:error` nonfatal được phân biệt đúng. Có test child Node thật cho UTF-8 chia chunk, cap output, timeout, cancel và executable không tồn tại.

## Lỗi đã phát hiện và hồi quy

1. **Credential backup hồi sinh token đã xóa:** đã tái hiện trước sửa bằng một test thất bại (`configured=true` sau clear + primary corruption). [Bằng chứng trước sửa](./261118-desktop-credential-regression-before.json). Source đã chuyển credential sang primary-only, bỏ backup cũ, cho nhập lại/xóa khi file hỏng. Hai test hồi quy hiện pass.
2. **Windows tạm khóa manifest:** một lượt full test thực gặp `EPERM: operation not permitted, rename ...manifest.json.<uuid>.tmp -> manifest.json` tại `writeAtomicJson` trước khi thêm retry. Không kết luận nguyên nhân khóa bên ngoài vì chưa có bằng chứng hệ điều hành. Source đã thêm retry có giới hạn cho EPERM/EBUSY/EACCES, không xóa đích cũ để né lỗi. Năm test fault injection + rename thật hiện pass; lỗi dai dẳng giữ nguyên target cũ, lỗi ENOENT không retry. Xem `apps/desktop/test/main/atomic-json.test.ts:17` và `:26`.
3. **Asset tham chiếu khác phiên:** rà code cho thấy root kiểm file trước đây là toàn thư mục sessions. Source nay kiểm chính thư mục phiên, cả root junction; regression hiện pass.
4. **Lỗi harness trong quá trình viết test:** hook `beforeEach` ngầm trả mock function và một biến fixture chưa khai báo đã được sửa. Không bỏ test hay nới assertion nghiệp vụ để đạt kết quả xanh.

## Lệnh đã chạy

```powershell
pnpm --filter @under30ss/shared test --maxWorkers=4 --reporter=default --reporter=json --outputFile=D:/MyProject/affliate/plans/reports/261118-desktop-shared-tests.json
pnpm --filter @under30ss/desktop test --maxWorkers=4 --reporter=default --reporter=json --outputFile=D:/MyProject/affliate/plans/reports/261118-desktop-all-tests.json
pnpm --filter @under30ss/desktop test --project main test/main/desktop-runtime.test.ts --maxWorkers=4 --reporter=default --reporter=json --outputFile=D:/MyProject/affliate/plans/reports/261118-desktop-runtime-partial-tests.json
pnpm --filter @under30ss/desktop typecheck
pnpm --filter @under30ss/shared typecheck
pnpm exec eslint apps/desktop/test/main packages/shared/src/desktop-contract.test.ts packages/shared/src/poster-analysis-schema.test.ts scripts/desktop
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2023 --module esnext --moduleResolution bundler --strict --noUncheckedIndexedAccess --noImplicitOverride --skipLibCheck --types node scripts/desktop/codex-live-probe.ts scripts/desktop/codex-probe-runtime.ts
```

Trong môi trường công cụ, NVM/Codex path cần quyền ngoài sandbox để thực thi; không suy rằng runtime chưa được cài từ lỗi truy cập symlink. Dữ liệu kiểm thử nằm trong thư mục tạm riêng và được dọn sau từng test.

## Cảnh báo và giới hạn

Lượt kiểm cuối còn warning Vite về cấu hình CommonJS khi chuyển loader native trong tương lai. UI test `settings-panel.test.tsx` còn một warning React `act(...)` ở case save bất đồng bộ; các assertion vẫn pass. Không giấu các warning này bằng cấu hình suppress.

Unit test credential thay interface mã hóa bằng AES dùng khóa sinh riêng cho test; không coi đó là bằng chứng DPAPI thật. HTTP đồng bộ và AI trong unit test dùng transport stub tại ranh giới, còn filesystem/Sharp/child Node chạy thật. API integration với MongoDB memory và smoke Electron/DPAPI/build package là các lượt kiểm riêng của plan, không được suy từ báo cáo này.

[Probe Codex thật](./261118-codex-desktop-live-probe.md) có hai ảnh nhận kết quả hợp lệ và một timeout ban đầu được giữ nguyên. Crop vẫn có nét mũi tên/ảnh sát cạnh, nên không suy ra ảnh đã được làm sạch hay độ chính xác tổng thể từ hai mẫu.

Đã tìm chuỗi xưng hô riêng tư trong các thư mục/file mới; không có kết quả trong script, test và báo cáo.
