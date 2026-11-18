# Kiểm tra Git trước bàn giao desktop import

Ngày: 2026-11-18. Phạm vi: kiểm tra chỉ đọc, không stage, commit, push hoặc thay đổi cấu hình Git. Báo cáo được ghi trước khi workflow chính chốt lượt hồi quy và đóng gói cuối.

## Kết quả

- Nhánh tại thời điểm kiểm tra: `main...origin/main`; staging area rỗng, xác nhận bằng `git diff --cached --name-only`.
- `git diff --check`: exit 0. Có thông báo CRLF sẽ đổi sang LF khi Git xử lý, không có lỗi whitespace.
- `.gitignore` vẫn chỉ có thay đổi có sẵn `+opencode.jsonc`; không bổ sung hoặc xóa quy tắc từ tác vụ này.
- Snapshot trước khi tạo báo cáo: 175 tệp thay đổi/mới, gồm 148 tệp chưa được Git theo dõi. Đây là trạng thái kiểm tra, không phải danh sách đã stage.
- Quét toàn bộ tệp văn bản thay đổi/mới: không có xưng hô riêng tư; không có ứng viên credential thô theo mẫu provider key, website import token, AWS access key hoặc private key. Không đọc `.env` thật. Đây là kiểm tra mẫu, không thay thế review bảo mật độc lập.
- Mọi tệp code mới được kiểm tra đều không vượt 200 dòng. Không sửa tệp cũ ngoài phạm vi chỉ để chuẩn hóa kích thước.
- `git check-ignore --` xác nhận cả portable `.exe` và unpacked `.exe` dưới `apps/desktop/dist/package/` đều bị ignore.
- Binary trong danh sách thay đổi/mới chỉ gồm 9 PNG bằng chứng QA có chủ đích trong `plans/reports/`; không có tệp trong danh sách này lớn hơn 5 MB. Không có `.exe`, `.dll`, `.asar`, `.node` hoặc archive build lọt vào danh sách.

## Kiểm tra kỹ thuật đã tự chạy

```text
pnpm lint       → exit 0, không warning/error
pnpm typecheck  → exit 0, shared/API/desktop/web và root TypeScript
git diff --check
git diff --cached --name-only
git check-ignore -- apps/desktop/dist/package/under30ss-importer-0.1.0-x64.exe
```

JSON đã đọc tại thời điểm kiểm tra:

| Bằng chứng | Kết quả |
|---|---|
| `261118-desktop-all-tests.json` | success=true, 90/90, 0 failed |
| `261118-desktop-shared-tests.json` | success=true, 224/224, 0 failed |
| `261118-desktop-runtime-partial-tests.json` | success=true, 6/6, 0 failed; đây là lượt chạy riêng |
| `desktop-ai-smoke/package.json` | status=passed, mốc 2026-11-18T11:52:01.844Z |
| `desktop-ai-smoke/result.json` | status=passed, mốc 2026-11-18T11:52:13.979Z |

Không cộng lượt IPC chạy riêng vào tổng full suite cũ. Workflow chính cần dùng kết quả hồi quy và artifact mới nhất nếu có thay đổi tiếp sau mốc trên.

## Đối chiếu các sửa cuối

- `apps/desktop/src/main/settings-store.ts:28` và `:35`: credential chỉ đọc primary, ghi atomic không tạo backup và xóa `.bak` cũ; lỗi parser được thay bằng thông báo an toàn. Manifest/settings vẫn có cơ chế backup riêng.
- `apps/desktop/src/main/atomic-json.ts:8`: rename thử lại có giới hạn cho `EPERM`, `EBUSY`, `EACCES`; không dùng fallback xóa target cũ. Các chờ ngắn là cơ chế kỹ thuật xử lý khóa file hệ điều hành.
- `apps/desktop/src/main/index.ts:71`: khóa một instance trước khi khởi động cửa sổ.
- `apps/desktop/src/main/sync-session.ts:30`: kiểm tra origin và credential fingerprint trước request; không tự chuyển phiên đang gửi sang token khác.

Không phát hiện thêm vấn đề High/Critical đã xác minh trong phạm vi kiểm tra Git này. Kết luận không thay thế báo cáo review code hoặc bằng chứng chạy Electron/HTTP/browser.

## Khi có yêu cầu commit sau này

Các tệp nghiên cứu và `.gitignore` có sẵn trước tác vụ cần được xét riêng; không dùng `git add -A` để mặc nhiên gom chúng. Có thể tách theo phạm vi với thông điệp tiếng Anh:

```text
feat(import): add scoped draft imports and token management
feat(desktop): add local review and collection sync
fix(docker): provide inert web build configuration
docs(import): document desktop workflow and validation
```

Chưa thực hiện bất kỳ thao tác stage, commit hoặc push nào.
