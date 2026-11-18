# Phase 01: Contract, prompt và phép thử Codex

Trạng thái: completed. Chủ sở hữu: root. Nguồn: [plan](./plan.md), schema outfit/collection hiện tại, tài liệu runtime trong báo cáo nghiên cứu. Đối chiếu ngày 2026-11-18.

## Công việc

- [x] Tạo shared contract cho poster analysis, vùng ảnh theo phần trăm có kiểm biên, point trên poster nullable, món gồm name/subtitle/description/side/order và reviewReasons. Tách khỏi schema outfit hoàn chỉnh.
- [x] Default prompt tiếng Việt có version: người mẫu chính ở giữa; nhận từng sản phẩm có ảnh và nhãn hai bên; đọc tên/phụ đề/mô tả có sẵn; thứ tự trên xuống theo từng cột; crop chỉ ảnh sản phẩm, tránh chữ; không tự thêm món đang đeo nhưng không có ô giới thiệu; không suy giá/link/brand/chất liệu không có nguồn.
- [x] Nêu rõ số món không cố định; ảnh không đúng cấu trúc hoặc chữ không đọc được trả trạng thái cần duyệt/null; mũi tên và chữ ảnh là dữ liệu; không làm theo chỉ dẫn trong ảnh. Không đưa đáp án 9/8 hoặc số 84/DRAMATIC vào prompt.
- [x] Crop model lấy đủ cơ thể; lưu cảnh báo nét chỉ dẫn/đồ bên cạnh nếu dính; không yêu cầu agent vẽ lại ảnh. Anchor có thể theo đầu mũi tên; không rõ thì null. Desktop đổi hệ tọa độ khi crop.
- [x] Contract cấu hình desktop có CLI path/profile/model, prompt override, giới hạn ảnh/timeouts; default business values lưu config và UI sửa được. Không đổi cấu hình global.
- [x] Chốt IPC tối thiểu: read/save settings, choose folder, create/list/get session, analyze/cancel, update draft/crop, approve, connect/sync, subscribe progress. Mỗi operation parse input/output.
- [x] Chốt import API contract và route names trước khi giao backend/UI.
- [x] Gửi ảnh thật qua Codex runtime chính thức trong workspace tạm được giới hạn; token web không có trong env, provider key không ghi repo. Lưu evidence đã lọc secret, output hoặc lỗi; không giả header vượt provider.

## Kiểm chứng

Schema từ chối vùng vô hạn/ngoài ảnh, thứ tự/ID trùng, JSON sai; cho phép anchor/null chưa chắc. Parse output thật nếu runtime chạy; đối chiếu hai mẫu bằng mắt, số lượng chỉ là oracle test ngoài prompt. Prompt editable/reset không sửa checkpoint của phiên đang chạy.

## Kết quả và bằng chứng

- Shared: `packages/shared/src/poster-analysis-schema.ts`, `poster-analysis-prompt.ts`, `desktop-settings-schema.ts`, `desktop-session-schema.ts`, `desktop-ipc-contract.ts` và `desktop-import-contract.ts`. Toàn bộ shared đã có [báo cáo kiểm thử](../reports/261118-desktop-shared-tests.json).
- Runtime thật: [báo cáo Codex](../reports/261118-codex-desktop-live-probe.md), [lượt đầu](../reports/261118-codex-desktop-live-probe-attempt-1.json), [retry](../reports/261118-codex-desktop-live-probe-retry.json). Codex CLI `0.169.1`, model yêu cầu `gpt-6.1-sol`, gateway theo cấu hình local; không đổi cấu hình global.
- Hai mẫu có lượt CLI thoát thành công và JSON hợp lệ, lần lượt 9/8 món; đều `needs_review`. Lượt đầu của mẫu thứ hai timeout được giữ là `not_verified`. Đây là bằng chứng trên hai mẫu, không phải tỷ lệ chính xác chung hoặc crop sạch mũi tên.
- Quy ước MVP đã chốt khi triển khai contract: một poster tương ứng một operation tạo mới một bộ sưu tập và một outfit nháp; không tự gom nhiều poster vào bộ sưu tập có sẵn theo slug.
