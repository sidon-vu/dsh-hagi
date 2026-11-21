# Tính năng — dsh-machines-hg

Multi-machine fleet: pair các instance DSH qua SSH/Tailscale, chọn một máy always-on (ví dụ `vHaGi`) làm host chạy agent, dispatch và resume session giữa các máy.

Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). **Kế hoạch theo phase: [PLAN.md](PLAN.md)** — đọc file đó trước khi implement bất kỳ row nào.

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `machines-hg-boot` | Row rỗng giữ bundle cài được | done | Bundle cài được, row hiện trong Plugins | Xoá khi có row thật |
| `machines-hg-registry` | Domain `machines` (bảng `machines`,`pins`,`a2a_tasks`,`a2a_contexts`) + tools `machine_add`/`machine_list`/`machine_remove`/`machine_probe` | wip | Row activate trong lab, tool list/probe gọi được | `machine_probe` nằm trong row này; `machines-hg-status` sau này là panel/view riêng. Machine record có `sshHost`/`sshPort`/`sshUser`/`sshKeyPath`/`dshProfile` phục vụ dispatch |
| `machines-hg-pin` | `machine_pin` / `machine_pin_status`: binding `contextId → machineId` trong `pins`, `machine="local"` xoá pin | wip | Row activate, pin gọi được trong phiên chat | Resolve order: `args.machine → pin → error` (không có config.defaultHost trong v1) |
| `machines-hg-dispatch` | `machine_dispatch`: SSH `dsh --profile <p> headless --json "<prompt>"`, `--approval-policy never`, lưu `remoteSessionId` vào `a2a_contexts` để resume cùng contextId | done | E2E 2026-11-21: vHaGi trả `DISPATCH_OK` + resume `turn:2` cùng sessionId | **Enabled** trong package patch (đã verify e2e). Transport = SSH+`dsh headless` (bỏ Typert-WS); ControlMaster chỉ bật trên POSIX; remoteCmd eval `~/.bashrc` lấy `DEEPSEEK_API_KEY` |
| `machines-hg-tunnel` | `machine_tunnel_start`/`machine_tunnel_status`/`machine_tunnel_stop`: spawn `cloudflared tunnel --url http://127.0.0.1:<port>`, parse `*.trycloudflare.com` từ stderr, lưu `self.publicUrl` | done | Spawn verify 2026-11-21: `https://gourmet-valuation-sharon-jvc.trycloudflare.com` captured | **Enabled**. Detect `ENOENT` → trả `installHint`; không bundle binary; named-tunnel chưa hỗ trợ |
| `machines-hg-handoff` | `machine_sessions` (SSH scan `~/.dsh/sessions/*/session-*/` stat mtime) + `machine_attach` (build `<publicUrl>/?session=<id>&token=…`) | done | `machine_sessions` verify 2026-11-21: 5 session trên vHaGi, sorted mtime | **Enabled**. `dsh session list` không tồn tại trong 0.2.2-rc.5 → đọc filesystem trực tiếp; `tokenEnv` optional |
| `machines-hg-a2a` | `machine_a2a_start` (đăng ký `POST /a2a/<id>` + `GET /.well-known/agent-card.json` trên webServer; executor = `dsh headless` local qua SSH loopback) + `machine_a2a_call` (fetch card, SendMessage, trả text) | wip | Row activate trong lab + protocol e2e pass | A2A v1.0.1 subset: SendMessage/SendStreamingMessage(SSE)/GetTask/ListTasks/CancelTask; `test/a2a-e2e.mjs`: card đúng, `ListTasks`/`GetTask -32001`/`unknown -32601`, outbound connect OK; executor SSH loopback chỉ chạy được trên máy có `sshd` local (vHaGi), Windows local → "Too many authentication failures" là expected |

## Roadmap (planned, chưa commit thứ tự)

Thiết kế dựa trên phân tích source `@hanphone/dsh-a2a` v0.5.5 (`research/dsh-a2a`), `dph-fleet`, `dsh-ssh`, `dsh-fleet`. **Viết lại, không dùng chung** với plugin cộng đồng.

| Row id | Ý tưởng | Phỏng từ |
|---|---|---|
| `machines-hg-status` | View/panel: bảng máy online/offline, agent đang chạy ở đâu (dùng `lastSeenAt`/`lastError` từ registry) | `dph-fleet` `fleet_status` |
| `machines-hg-handoff` | Tool `machine_sessions(machine)`: list session remote, attach URL để client mở | `dsh-api-session-controller` resume |
| `machines-hg-tunnel` | Quản lý cloudflared: spawn/monitor quick-tunnel hoặc named tunnel, lưu public URL vào record | `dsh-gateway-agent` pattern |
| `machines-hg-a2a` | A2A v1.0.1 viết lại — xem bảng con bên dưới | `@hanphone/dsh-a2a` |

### `machines-hg-a2a` — A2A viết lại, tích hợp vào registry

Plugin tham khảo dùng TS + build + multi-instance manager (~320KB src). Bản viết lại là JS thuần, gọn hơn, không cần GUI dashboard v1:

- **Inbound**: một A2A server cố định `/a2a/<machineId>` + `/a2a/<machineId>/agent-card.json` trên webServer của DSH; skill list derive từ preset (fallback `chat`); executor = một turn của DSH session (contextId → sessionId pool); task store trong domain `machines` bảng `a2a_tasks`.
- **Outbound**: mỗi record trong `machines` có `a2a.cardUrl` → fetch card → đăng ký remote skills thành tool `a2a__<machine>__<skill>` (chuẩn hoá tên ≤64 chars, collision hash).
- **Protocol subset v1**: `SendMessage`, `SendStreamingMessage` (SSE), `GetTask`, `ListTasks`, `CancelTask`; bỏ push-notification, gRPC, trace extension, metrics, rate-limit phức tạp.
- **Auth**: bearer token qua `credentials` service (env name `MACHINES_A2A_<id>`), không hardcode.

Cần xác minh API thật trong DSH đang chạy trước khi viết: `ctx.webServer.register` (kind exact/prefix), `ctx.storageDomain`/`ctx.storage`, `ctx.credentials`, `ctx.tools.register`, `ctx.remote`, `ctx.sessionController`.

## Quy tắc cho mọi row mới

1. **Một tính năng = một row**, id `machines-hg-<tính năng>`, không đổi tên sau khi phát hành.
2. Cột **Done when** phải là điều kiểm được (lệnh, output, trạng thái UI).
3. Config phẳng, nhỏ; mặc định nằm trong code; patch máy thay thế wholesale.
4. Thử nghiệm thì `disabled: true` trong patch của package.
5. Chuỗi hiển thị: `locale/en.json` + `locale/vi.json` cùng lúc.
