# USAGE — dsh-machines-hg

Hướng dẫn dùng `dsh-machines-hg`: cài trên máy có GUI (wHaGi/mHaGi), pair máy không GUI (vHaGi Ubuntu server), dispatch prompt, attach session từ phone.

## Khái niệm nhanh

- **Fleet**: nhiều máy chạy DSH, một máy làm host điều phối.
- **Machine record**: thông tin một máy trong registry — id, baseUrl, SSH host, Tailscale endpoint, token env.
- **Pin**: gắn session vào một máy — mọi `machine_dispatch` của session đó chạy trên máy đã pin.
- **Dispatch**: gửi prompt sang máy khác chạy qua SSH + `dsh headless` (không cần GUI trên máy đích).
- **Attach**: mở session remote trên client khác (phone/tablet) qua Cloudflare Tunnel.

## Cài đặt

### Trên máy có GUI (wHaGi — Windows/Mac desktop)

Cài từ marketplace index hoặc link local:

```powershell
# Từ index (release)
dsh plugin --profile web add "dsh-machines-hg"

# Hoặc link local để dev
dsh plugin --profile lab add "link:D:\DEV\dsh-workbench\dsh-hagi\packages\dsh-machines-hg"
```

Mở GUI (`dsh web`), vào profile đã cài → tools `machine_*` sẽ có trong catalog.

### Trên máy không GUI (vHaGi — Ubuntu server)

**Cần có `dsh` CLI đã cài** — `machine_dispatch` gọi `dsh headless` qua SSH. Nếu chưa có:

```bash
# Trên vHaGi (qua SSH)
su - hagi
# dsh là Electron app — cần bản standalone cho Linux hoặc cài qua npm nếu có
# Hiện tại: chạy dsh desktop trên Windows/Mac, dispatch sang vHaGi qua SSH
```

**Config model trên vHaGi** (bắt buộc — nếu không sẽ lỗi `MISSING_CREDENTIAL`):

1. Set API key trong `/home/hagi/.profile` (được source bởi `su -`):
   ```bash
   export ONR_API_KEY=sk-...
   export DEEPSEEK_API_KEY=sk-...   # nếu dùng DeepSeek
   ```

2. Patch profile `headless` trong `/home/hagi/.dsh/profiles/headless/cordis.patch.yml`:
   ```yaml
   - id: agent-default-model
     name: "@deepseek-ai/dsh-agent-default-model"
     config:
       provider: onr        # hoặc deepseek, claude, ...
       model: cx-devin      # model id tương ứng

   - id: llm-pi-ai
     name: "@deepseek-ai/dsh-llm-pi-ai"
     config:
       providers:
         onr:
           apiKeyEnv: ONR_API_KEY
           api: openai-completions
           baseURL: https://onr.cogify.cv/v1
           models:
             - id: cx-devin
               name: cx-devin
               input: [text, image]
   ```

3. Test:
   ```bash
   su - hagi -c "dsh --profile headless headless --json --approval-policy never 'Say OK'"
   # → {"type":"text","text":"OK"} là được
   ```

## Pair máy

### Bước 1: SSH key

Trên wHaGi (Windows):
```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519_vhagi
ssh-copy-id -i $env:USERPROFILE\.ssh\id_ed25519_vhagi.pub hagi@vhagi.clouded-wezen.ts.net
```

Test: `ssh hagi@vhagi.clouded-wezen.ts.net "echo OK"`.

### Bước 2: Đăng ký máy trong chat

Trong GUI DSH (profile đã cài plugin), gõ:

```
machine_add id=vhagi name=vHaGi baseUrl=http://100.105.105.5:3000 sshHost=vhagi.clouded-wezen.ts.net sshPort=22 sshUser=hagi sshKeyPath=C:\Users\HAGI\.ssh\id_ed25519_vhagi tags=always-on,ubuntu
```

Kiểm tra: `machine_list` → thấy vhagi.

`machine_probe id=vhagi` → ping xem còn sống không.

## Pin session → máy

```
machine_pin vhagi
machine_pin_status          # → "pinned to vhagi"
```

Từ giờ `machine_dispatch` trong session này sẽ chạy trên vHaGi.

Bỏ pin: `machine_pin` không có args → clear.

## Dispatch prompt

```
machine_dispatch prompt="What is 2+2? Reply with just the number."
```

→ trả `DISPATCH_OK` + `remoteSessionId` + text từ agent trên vHaGi.

Dispatch sang máy khác (không cần pin):
```
machine_dispatch machine=vhagi prompt="..."
```

Resume session remote (tiếp tục cùng contextId):
```
machine_dispatch prompt="..."   # session đã pin sẽ reuse remoteSessionId
```

## Attach session từ phone/khác

Máy đích cần Cloudflare Tunnel (vHaGi):

```
machine_tunnel_start machine=vhagi
# → spawn cloudflared, trả https://xxx.trycloudflare.com
```

Sau đó:
```
machine_sessions machine=vhagi
# → list sessions trên vHaGi, kèm attachUrl
```

Mở `attachUrl` trên phone → login → resume đúng session.

Stop tunnel: `machine_tunnel_stop machine=vhagi`.

## Cấu hình ở đâu

| Cái gì | File |
|---|---|
| Machine records | Domain `machines` trong DSH storage — không sửa tay, dùng `machine_add`/`machine_remove` |
| Pin bindings | Domain `machines` bảng `pins` — `machine_pin`/`machine_pin_status` |
| Model trên máy đích | `~/.dsh/profiles/headless/cordis.patch.yml` trên máy đó |
| API key trên máy đích | `~/.profile` (hoặc `.bashrc` — phải source khi `dsh` chạy) |
| Plugin enabled | `cordis.patch.yml` của profile đang dùng (`web`/`lab`/`desktop`) |
| Machines config chuẩn | `control/user/machines.md` trong repo (vai trò từng máy) |

## Tắt/bật tính năng

Mỗi row là một feature — tắt trong `cordis.patch.yml` của profile:

```yaml
- id: machines-hg-dispatch
  disabled: true    # tắt dispatch, giữ nguyên registry/pin
```

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `MISSING_CREDENTIAL` trên máy đích | `apiKeyEnv` chưa set | Export `ONR_API_KEY`/`DEEPSEEK_API_KEY` trong `.profile` |
| `Insufficient Balance` | API key hết quota | Đổi provider (`onr` thay `deepseek`) hoặc nạp credit |
| `Too many authentication failures` | `dsh` headless SSH loopback không có key | A2A chỉ chạy trên máy có `sshd` + `dsh` — Windows không được |
| `EADDRINUSE` | Port web đã chiếm | `Get-NetTCPConnection -LocalPort <port>` → `Stop-Process` |
| `entry did not activate` | Row config sai shape | Xem `docs/API.md` — `output.schema` phải JSON Schema chuẩn |

## Roadmap đã drop

- `machines-hg-a2a` — A2A protocol executor cần `dsh` headless trên máy chạy plugin → chỉ desktop, không có trên server. Dùng `machine_dispatch` thay thế.
