---
date: 2026-11-18
scope: desktop-ai-import
status: verified-with-initial-timeout
---

# Kiểm chứng Codex thật cho desktop nhập ảnh

## Kết quả

Đã gửi hai poster thật qua Codex CLI chính thức tới provider đang cấu hình. Cả hai ảnh đều có một lượt chạy kết thúc `exitCode=0`, có JSON đúng `posterAnalysisSchema`, và số món khớp kiểm đếm trực quan. Một lần chạy ảnh thứ hai bị timeout; lịch sử lỗi được giữ nguyên, không tính lần đó là thành công.

| Ảnh mẫu | Kết quả đã xác minh | Thời gian tiến trình | Nội dung cần duyệt |
|---|---|---|---|
| `outfit-mesh-84-reference.png` | 9 món: 4 trái, 5 phải; `needs_review` | 51.800 ms | Anchor kính chưa rõ; mô tả dây chuyền bị cắt mép; đường chỉ dẫn chồng lên người mẫu |
| `outfit-dramatic-reference.png`, lượt đầu | `not_verified`, timeout, `exitCode=null` | 240.041 ms | Có JSON đúng schema khi kết thúc nhưng không có lượt CLI thoát sạch; không sử dụng như kết quả thành công |
| `outfit-dramatic-reference.png`, retry | 8 món: 3 trái, 5 phải; `needs_review` | 48.493 ms | Đường chỉ dẫn chồng lên người mẫu; một số anchor phụ kiện cần chỉnh |

Các số lượng trên chỉ dùng làm oracle bên ngoài prompt. Prompt mặc định không chứa đáp án, mã in trên áo, tên hai mẫu hoặc số món. Mỗi ảnh được sao chép vào workspace tạm với tên `input.png` trước khi đính kèm.

## Runtime và cấu hình

- Đã chạy `codex --version`: `codex-cli 0.169.1`; Node `v24.15.0`; pnpm `11.3.0`.
- Model được yêu cầu rõ bằng argv: `gpt-6.1-sol`. Global default quan sát được là `gpt-6-astra`; không đổi default.
- Provider cấu hình có tên `OpenAI`, base URL `https://api.xingchiapi.com/v1`, giao thức Responses. Đây là tên cấu hình local và gateway đang dùng, không phải khẳng định gateway là dịch vụ OpenAI trực tiếp.
- Hash cấu hình trước/sau giữ nguyên trong cả hai evidence. Không sửa file global, không giả header client, không thay provider credential.
- CLI retry có hai `item:error` cảnh báo nonfatal về bốn cấu hình global không được nhận diện, gồm `disable_response_storage`, `model_providers.OpenAI.notify`, `network_access` và một mục khác không được CLI liệt kê trong thông báo rút gọn. Không coi các khóa bị bỏ qua này là bảo đảm bảo mật hoặc chính sách lưu dữ liệu.

## Cách ly phép thử

Helper dùng `spawn` với argv và stdin, `shell=false`, `windowsHide=true`; chỉ chuyển các biến hệ điều hành và credential AI đã cho phép. Không nạp `.env`, cookie admin, token nhập web, MongoDB hay credential object storage.

Giữ `--sandbox read-only`, `-a never`, `--ephemeral`, `--no-daemon`, `--ignore-rules`; tắt shell, apps, plugins, hooks, browser/computer, image generation, view-image và multi-agent. Tên MCP được kiểm tra thêm bằng `codex mcp list --json` và xác nhận tất cả `enabled=false` trước khi gọi model. JSON cấu hình thô từ lệnh liệt kê chỉ tồn tại trong bộ nhớ; evidence chỉ lưu tên server và trạng thái.

`--ephemeral` áp dụng cho session rollout local; không chứng minh provider không lưu ảnh hoặc request. Read-only vẫn cần giữ vì công cụ `apply_patch` trong runtime không được điều khiển bởi cờ shell. Helper dừng khi phát hiện sự kiện công cụ ngoài phạm vi, giới hạn output và timeout. Không có sự kiện command/file-change/MCP được ghi nhận trong các lượt thành công.

Chi tiết cờ đã đối chiếu với `codex exec --help` thật và [tài liệu non-interactive](https://learn.chatgpt.com/docs/non-interactive-mode). Phân biệt `error` fatal với `item.type=error` nonfatal dựa trên [source đúng tag 0.169.1](https://github.com/openai/codex/blob/rust-v0.169.1/codex-rs/exec/src/exec_events.rs). Cơ chế shell/app/MCP dựa trên [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) và [tool registry đúng tag](https://github.com/openai/codex/blob/rust-v0.169.1/codex-rs/core/src/tools/spec_plan.rs).

## Đối chiếu ảnh thật

Đã mở hai ảnh gốc và hai contact sheet crop bằng công cụ xem ảnh. Tên các món và cột khớp các ô giới thiệu; không tự thêm đồng hồ người mẫu đeo khi không có ô riêng. Các vùng crop sản phẩm giữ được hình món và phần lớn tránh chữ.

Crop người mẫu giữ đầu, thân và giày nhưng vẫn chứa nét mũi tên, một phần nhỏ ảnh/chữ sản phẩm sát biên. Một số crop món cũng còn đầu nét chỉ dẫn. Đây là giới hạn thực tế của crop hình chữ nhật; vẫn phải duyệt/sửa và không hứa xóa nét bằng crop.

- [Crop mẫu 1](./desktop-ai-probe/sample-1-ai-crops.png).
- [Crop mẫu 2 sau retry](./desktop-ai-probe/sample-2-ai-crops.png).
- [Evidence lượt đầu giữ nguyên](./261118-codex-desktop-live-probe-attempt-1.json).
- [Evidence retry có timeline và cảnh báo đã lọc](./261118-codex-desktop-live-probe-retry.json).

Hai ảnh là tập mẫu nhỏ, không dùng để suy ra độ chính xác tổng thể, tốc độ ổn định, chi phí hay tỷ lệ thành công cho mọi folder. Nguyên nhân cụ thể của timeout lượt đầu chưa được xác định vì lượt đó chưa lưu nội dung cảnh báo/sự kiện theo timeline.

## Chạy lại

Từ gốc repo, sau khi dependencies đã cài:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/desktop/codex-live-probe.ts
```

Các biến `CODEX_PROBE_EXECUTABLE`, `CODEX_PROBE_MODEL`, `CODEX_PROBE_TIMEOUT_MS`, `CODEX_PROBE_MAX_OUTPUT_BYTES`, `CODEX_PROBE_OUTPUT` thay đổi cấu hình phép thử. Có thể truyền đường dẫn ảnh qua argv để retry riêng một ảnh. Lượt retry đã dùng timeout `150000`, model `gpt-6.1-sol` và output riêng; không thay cấu hình global.

Helper được typecheck strict và lint riêng bằng công cụ đã cài. Phép thử này không gọi API nhập web, không tạo dữ liệu DB, không chứng minh đóng gói Electron; các phần đó thuộc kiểm thử tích hợp riêng của plan.
