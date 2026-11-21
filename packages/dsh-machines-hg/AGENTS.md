# dsh-machines-hg — trạng thái phát triển

Giai đoạn: **skeleton** · version 0.1.0 · cập nhật 2026-11-21
Multi-machine fleet cho DSH. Mô tả công khai: [README.md](README.md).

File này **không** nằm trong `files` của package → không phát hành cho người dùng, chỉ dùng khi phát triển.

## Row

| Row | Trạng thái | Ghi chú |
|---|---|---|
| `machines-hg-boot` | done | skeleton, xoá khi có row thật |
| `machines-hg-registry` | done | **enabled** — `machine_list` verify trong lab chat (list đúng vhagi) |
| `machines-hg-pin` | done | **enabled** — `machine_pin vhagi` verify trong lab chat (pin + status đúng) |
| `machines-hg-dispatch` | done | **enabled** trong patch — e2e vHaGi `DISPATCH_OK` + resume `turn:2` |
| `machines-hg-tunnel` | done | **enabled** — cloudflared spawn + `trycloudflare.com` parse verify 2026-11-21 |
| `machines-hg-handoff` | done | **enabled** — `machine_sessions` scan `~/.dsh/sessions` vHaGi (5 sorted mtime) + `machine_attach` |
| `machines-hg-a2a` | wip | P4: `test/a2a-e2e.mjs` pass (card + ListTasks + GetTask/-32001 + outbound connect); `disabled:true` — SSH loopback executor chỉ chạy trên máy có `sshd` local |

## Đang làm / kế tiếp

- **Nghiên cứu xong.** Đã đọc `research/dsh-a2a` (HanphoneJan, v0.5.5, TS ~320KB): dual-end inbound/outbound, skill→tool `a2a__<conn>__<skill>`, session-pool executor, domain `a2a` (tasks/contexts/inbound_servers/outbound_servers). Sẽ **viết lại bằng JS thuần, gọn hơn**, bỏ GUI dashboard/multi-instance/rate-limit/trace.
- **P0 done (2026-11-21):** lab mount xác nhận shape thật của ctx services → [docs/API.md](docs/API.md). Inject đủ, không có `remote` (dispatch đi qua `sessionController`/SSH+`dsh headless`). Bundle đã add vào lab profile (`link:`).
- **P1 code xong (2026-11-21):** `src/store.js` + `src/tools-registry.js` (4 tools) + `test/smoke.mjs`; row `machines-hg-registry` activate sạch trong lab (đang `disabled:true` trong package patch, bật ở lab patch). **Còn:** gọi thử `machine_add`/`machine_list` trong phiên chat thật.
- **P2 code + e2e xong (2026-11-21):** `src/ssh.js` + `src/tools-pin.js` + `src/tools-dispatch.js`. Transport = **SSH + `dsh headless --json`** (bỏ Typert-WS ~216KB). Đã cài `dsh` trên vHaGi (`npm i -g @deepseek-ai/dsh`, node 22 tuy warning nhưng chạy). Fix: `IdentityFile` rỗng crash ssh → chỉ push khi `sshKeyPath` set; `getsockname failed` do ControlMaster trên Windows → chỉ bật POSIX; non-interactive ssh không source bashrc → remoteCmd `eval "$(grep '^export ' ~/.bashrc)"` để lấy `DEEPSEEK_API_KEY`. E2E `test/dispatch-e2e.mjs`: vHaGi trả `DISPATCH_OK`, resume `--session-id` `turn:2`. **Còn:** gọi `machine_add`/`machine_dispatch` trong phiên chat thật (qua tool, không phải script).
- **P3 code + verify xong (2026-11-21):** `src/tools-tunnel.js` (`machine_tunnel_start`/`status`/`stop` — spawn `cloudflared`, parse `*.trycloudflare.com` từ stderr, lưu `self.publicUrl`, ENOENT → installHint) + `src/tools-handoff.js` (`machine_sessions` scan `~/.dsh/sessions/*/session-*/` qua SSH stat mtime vì `dsh session list` không tồn tại; `machine_attach` build `<publicUrl>/?session=<id>&token=<tokenEnv>`). Verify: cloudflared spawned URL `gourmet-valuation-sharon-jvc.trycloudflare.com`; sessions e2e list 5 sessions vHaGi. Lab boot sạch (không `did not activate`).
- **P4 code xong (2026-11-21):** `src/a2a.js` (~430 dòng, rewrite từ `research/dsh-a2a` ~977 dòng TS). Subset v1: SendMessage/SendStreamingMessage(SSE)/GetTask/ListTasks/CancelTask; bỏ push-notification/rate-limit/trace/metrics/multi-instance. Inbound `machine_a2a_start` đăng ký `POST /a2a/<id>` + `GET /.well-known/agent-card.json` (executor = `dsh headless` local SSH loopback); outbound `machine_a2a_call` fetch card → SendMessage → trả text. `test/a2a-e2e.mjs`: card đúng, ListTasks/GetTask(-32001)/unknown(-32601), outbound connect OK — SSH loopback executor chỉ chạy trên máy có `sshd` local (vHaGi), Windows trả "Too many authentication failures" là expected.
- **P5 (2026-11-21):** lab mount sạch mọi row; bật `disabled:false` cho `dispatch`/`tunnel`/`handoff` (đã verify e2e), giữ `disabled:true` cho `registry`/`pin`/`a2a` (chưa verify trong chat). `pnpm check:docs` pass (skip `research/` — repo ngoài đã quarantine). `pnpm index:check` skip `dsh-machines-hg` vì `private:true`; `verify:release` chỉ check plugin trong index (chưa publish).
- **Fix 2026-11-21 (từ screenshot phiên web thật):** `machine_dispatch` tra pin bằng cùng key chain với `machine_pin` (`''` khi exec thiếu context/session id — trước đó dùng `randomUUID()` nên pin_status báo pinned mà dispatch vẫn "no machine"); return bỏ `remoteSessionId` khi `undefined` (lỗi "value is not lossless JSON"); `extractSessionId` chấp nhận cả `type:"session"` + `id` (định dạng session v4). Test: `test/pin-context.mjs`.
- **Kế tiếp:** verify `machine_add`/`machine_list`/`machine_pin`/`machine_a2a_start` trong phiên chat thật (lab GUI — `dsh lab` chỉ boot web, không headless) rồi bật `disabled:false` + release.
- Hạ tầng user: `control/user/machines.md` — vHaGi chọn làm always-on agent host. Kết nối mặc định qua Tailscale; vHaGi cần Cloudflare Tunnel để phone truy cập.
- Đích: wHaGi dispatch agent → vHaGi chạy → tắt wHaGi → mở phone resume đúng session.

## Luật riêng của package

- Một row = một tính năng, id `machines-hg-*` **không đổi** sau khi phát hành.
- Tool definition: object thuần, `output.schema` là JSON Schema chuẩn; `required: true` trên property → row không activate (xem skill `dsh-plain-tool-definition`).
- Không import `@deepseek-ai/*`; không `workspace:*`; không `prepare`.
- Không đưa hostname/IP/credential vào code hay `locale/` — danh sách máy nằm trong config của profile, không nằm trong package.
