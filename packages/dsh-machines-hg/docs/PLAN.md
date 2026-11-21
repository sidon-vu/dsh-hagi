# PLAN — dsh-machines-hg phát triển theo phase

Cập nhật: 2026-11-21. Đọc file này là đủ để mở phiên mới làm tiếp mà không cần đọc lại hội thoại.

## Mục tiêu cuối (acceptance thật)

1. wHaGi (Windows) mở session → dispatch prompt sang **vHaGi** (Ubuntu always-on) → agent chạy trên vHaGi.
2. Tắt hẳn wHaGi → mở phone (không cài Tailscale, qua Cloudflare Tunnel) → resume **đúng session đó**.
3. Agent trên máy này tự quyết định giao việc cho agent máy khác (A2A): tool `a2a__<machine>__<skill>` xuất hiện trong catalog và gọi được.
4. Mỗi session chọn được máy chạy (pin), không bắt buộc máy mặc định.

## Kiến trúc đã chốt

- **Một plugin** `dsh-machines-hg`, group `machines`, 7 row — một row = một tính năng (bảng trong [FEATURES.md](FEATURES.md)).
- **Dispatch qua DSH remote API**, không qua SSH: `dsh-api-session-controller` expose RPC Typert `session/create`, `session/prompt`, `session/follow`, `session/list`, `session/state`, `session/events`... (đã kiểm trong `app.asar` 0.2.2-rc.5). SSH/Tailscale chỉ dùng bootstrap (kiểm máy sống, start `dsh web`).
- **A2A viết lại** (không dùng `@hanphone/dsh-a2a`): JS thuần, subset v1 — `SendMessage`, `SendStreamingMessage` (SSE), `GetTask`, `ListTasks`, `CancelTask`. Tham khảo `research/dsh-a2a` (đã quarantine instruction files).
- **Transport**: Cloudflare Tunnel cho vHaGi (phone không cần app); Tailscale cho admin/private; mmo tự expose (khác tài khoản Tailscale).
- **Storage**: domain `machines` (theo mẫu `dsh-storage-domain`, JSON-encoded kv tables). Bảng: `machines` (registry), `pins` (sessionId→machineId), `a2a_tasks`, `a2a_contexts`.
- **Auth**: bearer token qua `credentials` service, env name `MACHINES_A2A_<ID>` / `MACHINES_TOKEN_<ID>`. Không hostname/secret trong code.

## Đã xác minh trong DSH đang chạy (0.2.2-rc.5)

- `dsh-api-session-controller/lib/typert.host.js`: đủ method `session/create`, `session/prompt`, `session/follow`, `session/list`, `session/state`, `session/cancel`, `session/fork`, `session/events`.
- `dsh-host-webserver` tồn tại (dsh-a2a đăng ký route qua `ctx.webServer.register({kind:'exact'|'prefix', path, handler})`).
- `dsh-storage-domain`, `dsh-credentials`, `dsh-api-remote-access`, `dsh-api-remotes` đều có trong install.
- **Chưa kiểm:** shape thật của `ctx.storageDomain` khi inject từ plugin bên ngoài (tên inject key, cách `openDomain`) → phase 0 phải mount lab để xác minh, không được bịa.

## Phase 0 — Xác minh API ✅ done 2026-11-21

Kết quả: [API.md](API.md). Inject được đầy đủ service cần; **`remote` không tồn tại ở host** → dispatch phải HTTP tới Typert endpoint của `dsh web` trên máy đích. lab profile đã có `dsh-machines-hg` (`link:`).

## Phase 1 — `machines-hg-registry` ✅ code xong, chờ user verify trong phiên chat thật

**Đã viết:** `src/store.js` (domain `machines` v1, validator tự chế — không zod dep), `src/tools-registry.js` (4 tools), `test/smoke.mjs` (PASS 6/6). Row `machines-hg-registry` activate sạch trong lab (không "did not activate"). `machine_probe` gộp vào row này; `machines-hg-status` sau này là view riêng.

**Còn lại:** gọi thử `machine_add` + `machine_list` trong một phiên lab thật (user hoặc agent session) — chứng minh tool execute được chứ không chỉ register.

- Domain `machines` v1: bảng `machines` — record `{id, name, baseUrl, cardUrl?, tokenEnv?, tags[], enabled, lastSeenAt?, lastError?}` (+ `pins`,`a2a_tasks`,`a2a_contexts` cho phase sau).
- Tools: `machine_add` (id, baseUrl bắt buộc), `machine_list`, `machine_remove`, `machine_probe(id)` — plain object, JSON Schema chuẩn.
- Probe: `fetch(cardUrl ?? baseUrl)` GET timeout 5s → online/offline + latency; ghi `lastSeenAt`/`lastError`.

## Phase 2 — `machines-hg-pin` + `machines-hg-dispatch`

**Done when:** từ session lab, gọi `machine_dispatch` tạo được session remote trên một DSH `dsh web` thật (chạy local port khác làm đủ), nhận sessionId; pin thì `machine_whoami`/`machine_pin` ghi/đọc binding.

- Bảng `pins`: `{sessionId, machineId, createdAt}` — resolve order `args.host → pin → config.defaultHost → local`.
- `machine_dispatch({machine?, prompt, preset?})`: gọi remote `session/create` + `session/prompt` qua HTTP Typert endpoint của `baseUrl` (xem `dsh-api-session-controller/lib/typert.remote-client.js` để biết wire format; nếu Typert quá phức tạp → dùng `dsh web` HTTP API thuần).
- `machine_pin({machine})` / `machine_unpin()` / `machine_where()`.
- Tool description phải nói rõ: agent tự quyết khi nào dispatch (từ yêu cầu pin ở phase này, A2A tự động ở phase 4).

## Phase 3 — `machines-hg-tunnel` + `machines-hg-handoff`

**Done when:** row tunnel spawn `cloudflared` được trên lab (hoặc detect binary vắng và báo rõ); `machine_sessions` list được session remote, trả attach URL mở được trên client khác.

- `machines-hg-tunnel`: spawn/monitor `cloudflared tunnel --url http://127.0.0.1:<port>` (quick tunnel) hoặc đọc named-tunnel config; parse public URL `*.trycloudflare.com` → lưu vào record `machines` của chính máy mình (`self.publicUrl`). Không bundle binary — detect `cloudflared` trong PATH, thiếu thì tool báo cách cài.
- `machines-hg-handoff`: `machine_sessions(machine)` → remote `session/list`; trả `{sessions:[{id,title,updatedAt}], attachUrl}` — attachUrl là link client mở qua tunnel/public URL.
- Auth khi attach: launch-token → session cookie (đã là cơ chế `dsh web` sẵn có); plugin chỉ cần mang URL + token, không tự xử lý cookie.

## Phase 4 — `machines-hg-a2a` (lớn nhất, chia 2 row con trong cùng row id)

**Done when:** (a) máy A gọi `POST /a2a/<id>` SendMessage tới máy B (lab×2 instance) và nhận task COMPLETED có artifact text; (b) máy B thấy tool `a2a__<A>__chat` trong catalog và agent gọi được.

- **Inbound**: `A2aRoutes`-tương đương đăng ký `exact /<machineId>/agent-card.json` + `prefix /a2a/<machineId>` trên `webServer`; card build từ record `machines.self` + skills derive từ preset (fallback `chat`); executor = một turn của session (contextId→sessionId pool trong bảng `a2a_contexts`); task store `a2a_tasks`.
- **Outbound**: mỗi record `machines` có `cardUrl` → fetch card → `registerAgentTools` ghi tool `a2a__<machine>__<skill>` (normalize ≤64 chars + collision hash — copy thuật toán từ `research/dsh-a2a/src/outbound/tools.ts`).
- Copy-phỏng: `protocol.ts` (types + TaskState), `outbound/calls.ts` (A2AClient: fetch card, JSON-RPC POST, SSE parse), `outbound/tools.ts`, `server/routes.ts` (body limit, SSE headers), `server/card.ts`, `server/exec/session.ts` (context pool + text-delta → artifact chunks).
- Bỏ: dashboard GUI, multi-instance manager, metrics, rate-limit, trace extension, push-notification, subagent executor (phase sau nếu cần).
- Task states đủ: SUBMITTED→WORKING→COMPLETED/FAILED/CANCELED + INPUT_REQUIRED (surface như text, không throw — xem `textOf` trong tools.ts).
- Auth inbound: bearer `MACHINES_A2A_<ID>` qua credentials → check `Authorization: Bearer` trước khi xử lý.

## Phase 5 — Hardening + release

- Mount lab pass cho mọi row; `pnpm check:docs`, `pnpm index:check`, `pnpm verify:release`.
- Bật dần `disabled:false` theo thứ tự registry → status → pin/dispatch → a2a; tunnel/handoff có thể giữ disabled tới khi có vHaGi thật.
- Smoke test `test/smoke.mjs`: store round-trip, normalize tool name, task state transitions, card build.
- Release theo nhịp repo: bump → CHANGELOG → tag `dsh-machines-hg/v<ver>` → `build-index.mjs` → verify.

## Phụ thuộc giữa phase

```
P0 verify API ─→ P1 registry+status ─→ P2 pin+dispatch ─→ P3 tunnel+handoff
                                        └──────────────→ P4 a2a ─→ P5 release
(P4 chỉ cần P1; P3 độc lập với P2 về code nhưng cần remote thật để test)
```

## Tham khảo đã clone (trong `research/`, instruction files đã quarantine)

- `dsh-a2a` — nguồn chính cho P4 (đọc `src/outbound/tools.ts`, `src/server/routes.ts`, `src/server/card.ts`, `src/server/store.ts`, `src/protocol.ts`).
- `dph-fleet` — mDNS pair `fleet-d-` keys + SSH registry + `fleet_ssh_exec`/`fleet_workspace`/`fleet_status`.
- `dsh-ssh` — `servers.json`/`secrets.json`/`known_hosts` store + `ssh_exec`/`ssh_list_servers`.
- `dsh-fleet` — fleet console monolith (tham khảo UI flow, compat-fail trên 0.1.6-alpha.2 — kiểm lại trước khi mượn).

## Rủi ro đã biết

1. **`ctx.storageDomain` shape chưa kiểm** trên bản đang chạy → P0.
2. **Typert wire format** có thể phức tạp → fallback HTTP JSON nếu `dsh web` expose REST; đọc `typert.remote-client.js` trước khi quyết.
3. **A2A spec v1.0.1 vs "1.0"**: card advertise `protocolVersion:'1.0'` — copy nguyên version string từ `protocol.ts`, đừng đoán.
4. **cloudflared** không có trên Windows mặc định → P3 phải detect và degrade gracefully.
5. **Session attach từ phone**: cần `dsh web --public-url` + launch token — đã là flow chuẩn, chỉ cần tunnel map đúng port.
