# Phase 02: Desktop runtime và bản nháp local

Trạng thái: completed. Phụ thuộc Phase 1 đã hoàn tất. Chủ sở hữu: root. Kiểm tra nghiệm thu tổng thể được theo dõi tiếp tại Phase 5.

## Công việc

- [x] Tạo workspace Electron/Vite/React/TS, main/preload riêng renderer, contextIsolation=true, nodeIntegration=false, CSP và API preload hạn chế.
- [x] Root `dev` chỉ chọn web/api/shared; lệnh desktop riêng. Chọn version Electron sau khi kiểm nguồn cài; sửa lockfile một đầu mối.
- [x] Folder scan đệ quy giới hạn loại/size/count cấu hình; realpath kiểm symlink và tên file, hash bytes và copy nguồn chuẩn hóa orientation vào userData/session. Không ghi vào folder gốc.
- [x] Manifest phiên bản, atomic write + recovery, status theo từng file; giữ model/prompt version/config snapshot cho phiên. Mở lại app hiện kết quả đã xong, trạng thái chạy dang dở thành interrupted có retry.
- [x] Adapter Codex qua stdio, argv không shell, timeout/cancel/exit handling, JSON parse và output-size bound. Thư mục agent chỉ có input cần đọc; deny shell/write/network tools không cần thiết; reject approval ngoài phạm vi. Không gửi token web vào subprocess/env/prompt.
- [x] Sharp crop theo vùng đã kiểm tra từ ảnh chuẩn hóa; convert point sang model crop; ảnh source/crop chỉ đọc qua protocol app được whitelist theo session/assetId, không arbitrary filesystem URL.
- [x] Credential OS-encrypted chỉ main truy cập; expose trạng thái/key mask cho renderer. Website URL cấu hình, HTTPS ngoài loopback, redirect=error, token gắn origin.
- [x] Main sync chỉ nhận phiên đã duyệt và dùng ID/hash/revision ổn định. Sửa sau approve huỷ approve. Upload media → commit collection/outfit → reconcile GET sau timeout; lưu local remote IDs.

## Kiểm chứng

Folder escape/symlink; file hỏng/EXIF rotate; crop và anchor transform; input JSON không tin cậy; cancel child process; credential không lọt stdout/manifest/prompt/env; retry giữ cùng operation ID; recovery sau write interruption. Kiểm tắt/mở app tiếp tục phiên và thay URL không tái dùng token trái origin.

## Kết quả và bằng chứng

- Runtime nằm trong `apps/desktop/src/main/**` và `src/preload/index.ts`; root `package.json` tách `desktop:dev`, `desktop:build`, `desktop:package` khỏi web/API.
- [Smoke Electron thật](../reports/desktop-ai-smoke/result.json) xác minh IPC preload, Windows OS encryption, source/crop thật, protocol ảnh, sửa làm mất approval, mở lại checkpoint/cấu hình và single instance lock. Hộp thoại folder được thay bằng đường dẫn fixture trong harness; không dùng smoke này để khẳng định đồng bộ website thật.
- [Kiểm thử HTTP desktop → API](../reports/tester-261118-desktop-import-http.json) dùng HTTP thực, MongoDB tạm và storage recorder; cố tình mất phản hồi commit, mở lại store rồi retry vẫn giữ IDs và không tạo trùng.
- Các guard bổ sung từ review: bind origin cùng fingerprint token trong envelope main; giữ receipt/phiên bản chưa rõ kết quả để retry cùng mã; khóa instance thứ hai. Credential chỉ đọc primary, không khôi phục `.bak` sau thao tác xóa/đổi token; cấu hình và manifest vẫn giữ backup phục hồi.
- Config AI/scan là snapshot lúc tạo phiên. Thay prompt/model/giới hạn không sửa ngầm phiên hiện có; connection website được chốt khi bắt đầu đồng bộ.
