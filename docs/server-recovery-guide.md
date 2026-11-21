# Khôi phục quyền truy cập và dựng lại server

Tài liệu cho VPS chạy Under30ss bằng Docker, có 1Panel để quản lý. Gồm: các cách vào server, xử lý khi bị khoá ngoài, sao lưu ra ngoài server, và dựng lại server từ bản sao lưu.

Repo này public, nên tài liệu **không** ghi IP, cổng/đường dẫn bí mật của 1Panel hay mật khẩu. Các giá trị đó chủ repo tự lưu riêng (trình quản lý mật khẩu). Trong lệnh bên dưới, `<server-ip>`, `<panel-port>`… là chỗ cần thay.

Liên quan: [Triển khai và vận hành](./deployment-guide.md) · [Sao lưu](./deployment-guide.md#sao-lưu) · [Khôi phục dữ liệu](./deployment-guide.md#khôi-phục)

## Contents
- [Hiện trạng server (2026-11-22)](#hiện-trạng-server-2026-11-22)
- [Các cách vào server](#các-cách-vào-server)
- [Bị khoá ngoài: xử lý theo tình huống](#bị-khoá-ngoài-xử-lý-theo-tình-huống)
- [Sao lưu ra ngoài server](#sao-lưu-ra-ngoài-server)
- [Dựng lại server từ bản sao lưu](#dựng-lại-server-từ-bản-sao-lưu)

## Hiện trạng server (2026-11-22)

| Thành phần | Giá trị |
|------------|---------|
| Hệ điều hành | Ubuntu 18.04 (đã hết hỗ trợ chuẩn; giữ nguyên theo quyết định 2026-11-21) |
| Docker | `docker-ce` 24.0.2 (bản cuối cho 18.04, đã `apt-mark hold`) |
| Compose / Buildx | v2.29.7 / v0.17.1, file binary trong `/usr/local/lib/docker/cli-plugins/`. Gói compose của 18.04 dừng ở 2.18, quá cũ cho `!reset`/`!override` của compose prod |
| 1Panel | v2.5.1, cài tại `/opt/1panel`. Không cài OpenResty: cổng 80/443 thuộc Caddy |
| Firewall | `ufw`: chỉ mở 22, 80, 443 và cổng 1Panel |
| fail2ban | Jail `sshd`: sai 5 lần trong 10 phút thì khoá IP 1 giờ (`/etc/fail2ban/jail.local`) |
| Swap | 4 GB `/swapfile` (build Next.js cần thêm RAM) |
| Mã nguồn | `/opt/under30ss` (git clone), env ở `/opt/under30ss/.env.prod` (quyền 600) |
| Lệnh compose | `/opt/under30ss-deploy/compose.sh <lệnh>` |
| Sao lưu trên server | Cron `/etc/cron.d/under30ss-backup` lúc 02:30, ghi vào `/var/backups/under30ss`, giữ 14 ngày |

`compose.sh` gọi `docker compose` với `.env.prod`, `infra/docker-compose.yml`, `infra/docker-compose.prod.yml` và file chỉ có trên server `/opt/under30ss-deploy/docker-compose.http-only.yml`. File này đặt `SESSION_COOKIE_SECURE=false` vì site đang chạy HTTP bằng IP (chưa có domain). Khi có domain và HTTPS: đổi `SITE_ADDRESS`, `SITE_URL`, `MEDIA_PUBLIC_BASE_URL`, `ALLOWED_ORIGIN` trong `.env.prod` rồi bỏ file override khỏi `compose.sh`.

## Các cách vào server

Có 3 cách vào, cộng một cửa cuối của nhà cung cấp. Mất một cách thì dùng cách khác.

| Cách | Lệnh / chỗ vào | Cần gì |
|------|----------------|--------|
| SSH bằng key | `ssh -i <key-riêng> root@<server-ip>` | File private key có public key trong `/root/.ssh/authorized_keys` |
| SSH bằng mật khẩu | `ssh root@<server-ip>` | Mật khẩu root (đang bật `PasswordAuthentication yes`) |
| Terminal của 1Panel | `http://<server-ip>:<panel-port>/<panel-entrance>` → Terminal | Tài khoản 1Panel |
| Console của nhà cung cấp VPS | Trang quản lý VPS → VNC / Web Console | Tài khoản trang quản lý VPS |

Console của nhà cung cấp như cắm màn hình và bàn phím thẳng vào máy: vẫn vào được khi SSH hỏng, firewall chặn hay bị fail2ban khoá. Cần tìm sẵn chỗ này trên trang quản lý VPS và lưu tài khoản trang đó.

## Bị khoá ngoài: xử lý theo tình huống

**Gõ sai mật khẩu nhiều lần, SSH bị từ chối kết nối (fail2ban khoá IP).** Đợi 1 giờ, hoặc đổi mạng (4G) rồi vào bằng cách khác và gỡ khoá:

```bash
fail2ban-client status sshd                 # xem IP đang bị khoá
fail2ban-client set sshd unbanip <ip-của-mình>
```

**Quên mật khẩu root.** Vào bằng SSH key hoặc Terminal 1Panel rồi chạy `passwd root`. Không còn cách nào thì dùng chức năng đặt lại mật khẩu root trên trang quản lý VPS (nếu nhà cung cấp có), hoặc vào console.

**Mất file SSH key.** Vào bằng mật khẩu, thêm public key mới vào `/root/.ssh/authorized_keys`, xoá dòng của key cũ.

**Quên tài khoản, mật khẩu hay đường dẫn của 1Panel.** Vào bằng SSH rồi dùng `1pctl` (đã kiểm tra trong `1pctl` của v2.5.1):

```bash
1pctl user-info                  # in cổng, đường dẫn bảo mật (entrance), tên đăng nhập
1pctl update password            # đặt mật khẩu mới
1pctl reset entrance             # bỏ đường dẫn bảo mật
1pctl reset ips                  # bỏ giới hạn IP được vào panel
1pctl reset mfa                  # tắt xác thực 2 lớp
1pctl restart all
```

**Lỡ chặn cổng 22 bằng firewall (ufw hoặc firewall trong 1Panel).** Vào bằng Terminal 1Panel hoặc console nhà cung cấp:

```bash
ufw allow 22/tcp && ufw reload   # hoặc tạm tắt: ufw disable
```

**Server không lên (không ping, không SSH, không web).** Vào trang quản lý VPS: xem máy có đang chạy, bấm khởi động lại, mở console xem lỗi lúc boot. Hỏng hẳn thì cài lại hệ điều hành rồi làm theo mục [Dựng lại server](#dựng-lại-server-từ-bản-sao-lưu).

**Web chết nhưng SSH vẫn vào được.**

```bash
/opt/under30ss-deploy/compose.sh ps            # service nào không healthy
/opt/under30ss-deploy/compose.sh logs --tail 100 api
/opt/under30ss-deploy/compose.sh up -d         # chạy lại các service
```

Thêm các lỗi thường gặp ở [Xử lý sự cố](./deployment-guide.md#xử-lý-sự-cố).

## Sao lưu ra ngoài server

Bản sao lưu trên server sẽ mất theo server. Script `scripts/ops/pull-server-backup.ps1` chạy trên một máy Windows có SSH key:

1. Trên server, gói bản sao lưu mới nhất trong `/var/backups/under30ss` (`mongo.archive.gz` + `bucket/`) cùng `.env.prod` thành một file tạm.
2. Tải về `<Destination>\under30ss-<YYYYMMDD-HHMMSS>.tar.gz`, kiểm tra file có đủ `mongo.archive.gz` và `.env.prod` rồi mới giữ lại. Xong thì xoá file tạm trên server.
3. Bản nào đã tải thì bỏ qua. Giữ `-KeepCount` file mới nhất (mặc định 30). Ghi log vào `<Destination>\pull-server-backup.log`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ops\pull-server-backup.ps1 `
  -Server <server-ip> -KeyPath <đường-dẫn-private-key> -Destination D:\Backups\under30ss-server
```

Host key của server phải có sẵn trong `known_hosts` (SSH vào tay một lần). Nếu host key đổi, script dừng chứ không tự tin key mới.

Chạy hằng ngày bằng Task Scheduler (đã tạo trên máy của chủ repo ngày 2026-11-22, tên task `Under30ss pull server backup`, 09:00, chạy bù khi máy bật lại nếu lỡ giờ):

```powershell
$arg = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "<repo>\scripts\ops\pull-server-backup.ps1" -Server <server-ip> -KeyPath "<key>" -Destination "D:\Backups\under30ss-server"'
Register-ScheduledTask -TaskName 'Under30ss pull server backup' `
  -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) `
  -Trigger (New-ScheduledTaskTrigger -Daily -At '09:00') `
  -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable) -Force
```

File tải về **có chứa `.env.prod`** (mật khẩu Mongo, khoá S3, secret phiên). Giữ thư mục đích ở chỗ riêng tư, không đưa vào repo hay thư mục chia sẻ công khai.

Kiểm chứng 2026-11-22: tải bản `20261122-060120` (4.0 MB), đủ 77/77 ảnh `.webp` của bucket, `gzip -t` của `mongo.archive.gz` đạt; task chạy qua Task Scheduler trả `0`. Chưa thử khôi phục từ file tải về lên một server mới.

## Dựng lại server từ bản sao lưu

Dùng khi phải cài lại hệ điều hành hoặc chuyển sang VPS khác. Cần: file `under30ss-<ngày>.tar.gz` mới nhất và quyền root trên máy mới.

1. **Chuẩn bị máy.** Trên Ubuntu 22.04/24.04 thì cài Docker và Compose bản mới theo trang của Docker. Trên 18.04 thì làm như [hiện trạng](#hiện-trạng-server-2026-11-22) (docker-ce 24.0.2 + binary compose/buildx). Thêm swap nếu RAM dưới 4 GB. Bật `ufw` cho 22, 80, 443. Cài fail2ban và 1Panel nếu cần (1Panel: chạy `install.sh` trong gói chính chủ với `PANEL_INSTALL_DOCKER=n` khi Docker đã có).
2. **Lấy mã nguồn.** `git clone https://github.com/nhonhoatran/link-to-shop-affliate.git /opt/under30ss`.
3. **Chép bản sao lưu lên và giải nén.**

   ```bash
   scp under30ss-<ngày>.tar.gz root@<server-ip>:/root/
   mkdir -p /root/restore && tar xzf /root/under30ss-<ngày>.tar.gz -C /root/restore
   install -m 600 /root/restore/.env.prod /opt/under30ss/.env.prod
   ```

   IP hoặc domain đổi thì sửa `SITE_URL`, `MEDIA_PUBLIC_BASE_URL`, `ALLOWED_ORIGIN` (và `SITE_ADDRESS` nếu có domain) trong `.env.prod`. Giữ nguyên các mật khẩu và secret để khớp dữ liệu.
4. **Tạo lại `compose.sh`** (và `docker-compose.http-only.yml` nếu vẫn chạy HTTP bằng IP) trong `/opt/under30ss-deploy/` theo mô tả ở [hiện trạng](#hiện-trạng-server-2026-11-22).
5. **Khởi động stack:** `/opt/under30ss-deploy/compose.sh up -d --build`, đợi `api`, `web`, `mongo` healthy.
6. **Nạp lại dữ liệu** theo [Khôi phục](./deployment-guide.md#khôi-phục), với `DIR=/root/restore` và `C=/opt/under30ss-deploy/compose.sh`. Tài khoản admin nằm trong Mongo nên không cần tạo lại.
7. **Bật lại sao lưu:** tạo `/etc/cron.d/under30ss-backup` (02:30, chạy `infra/backup/backup-mongo-and-bucket.sh`), rồi sửa `-Server` của task Windows nếu IP đổi.
8. **Kiểm tra:** trang chủ, `/admin/login` trả 200, đăng nhập được, ảnh `/media/...` hiện. Xoá `/root/restore` và file `.tar.gz` sau khi xong.
