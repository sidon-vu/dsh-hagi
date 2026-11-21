# HANDOFF — dsh-hagi

Cập nhật: 2026-11-21 · Đọc file này **trước khi sửa**; cập nhật khi release hoặc khi để lại việc dở.
Phạm vi rộng hơn (máy, profile, việc ngoài repo): `../HANDOFF.md`. Danh sách plugin + giai đoạn: [PLUGINS.md](PLUGINS.md).

## Trạng thái phát hành

| Package | Version | Row | Tag |
|---|---|---|---|
| dsh-dev-hg | **0.6.0** | `dev-hg-i18n-audit`, `dev-hg-guard`, `dev-hg-doctor`, `dev-hg-snapshot`, `dev-hg-rollback` | `dsh-dev-hg/v0.6.0` |
| dsh-session-hg | 0.1.0 | `session-hg-boot` (skeleton) | `dsh-session-hg/v0.1.0` |
| dsh-ui-hg | 0.1.0 | `ui-hg-boot` (skeleton) | `dsh-ui-hg/v0.1.0` |
| dsh-machines-hg | **0.1.0** | `machines-hg-boot`, `machines-hg-registry`, `machines-hg-pin`, `machines-hg-dispatch`, `machines-hg-tunnel`, `machines-hg-handoff`, `machines-hg-a2a` | `dsh-machines-hg/v0.1.0` |

`index.json` sinh từ tag, không sửa tay. URL live: `https://raw.githubusercontent.com/sidon-vu/dsh-hagi/main/index.json`

## Việc kế tiếp trong repo

**Đã chốt 2026-11-21:** kế tiếp là **`session-hg-context-panel`** trong `dsh-session-hg` — không có bề mặt UI, dùng bản ABSORB đã có, và mở khoá chủ đề "session" (hai package còn lại vẫn skeleton).

**2026-11-21:** scaffold `dsh-machines-hg` (nhóm `machines`) — multi-machine fleet qua SSH/Tailscale/Cloudflare Tunnel. Đã đọc `dsh-fleet`, `dph-fleet`, `dsh-ssh`, **`@hanphone/dsh-a2a` v0.5.5** (TS ~320KB, dual-end). Quyết: **viết lại bằng JS thuần**, không dùng chung với plugin cộng đồng. **Kế hoạch 6 phase đầy đủ: `packages/dsh-machines-hg/docs/PLAN.md`** (P0 verify API → P1 registry+status → P2 pin+dispatch → P3 tunnel+handoff → P4 a2a → P5 release). Phiên mới đọc PLAN.md là làm tiếp được.

1. **`dsh-machines-hg` P0–P5 gần xong (2026-11-21):** P0 `docs/API.md`; P1 registry; P2 pin+dispatch (e2e vHaGi `DISPATCH_OK`+resume `turn:2`); P3 tunnel+handoff (cloudflared + sessions list verify); P4 `a2a.js` rewrite A2A v1.0.1 subset (~430 dòng vs ~977 TS gốc) — `test/a2a-e2e.mjs` protocol pass (card + 5 method + outbound connect; SSH loopback executor chỉ chạy trên máy có `sshd` local). **P5:** lab mount sạch mọi row; **bật `disabled:false` cho `dispatch`/`tunnel`/`handoff`** (đã e2e), giữ `disabled:true` cho `registry`/`pin`/`a2a` (chưa verify trong chat — `dsh lab` chỉ boot web, phải gọi tool qua GUI). `pnpm check:docs` pass (skip `research/` — repo ngoài quarantine). Chưa tag — package `private:true`, `index:check`/`verify:release` skip. **Kế tiếp:** verify tools trong lab GUI → bật nốt `disabled:false` → bỏ `private` + tag `dsh-machines-hg/v0.1.0` + `build-index.mjs`.
2. **`session-hg-context-panel`** — row đầu tiên của `dsh-session-hg`. Done when: số liệu khớp một phiên thật (sai số 0), đủ 4 trạng thái, chuỗi en+vi.
3. **Chờ người dùng (2 phút):** gọi thử `i18n_audit`, `profile_doctor`, `profile_rollback` trong một phiên chat thật (lab) — đây là nợ xác minh duy nhất của `dsh-dev-hg`.
4. **Sau đó:** row UI đầu tiên ở `dsh-ui-hg` — đọc [DESIGN.md](packages/dsh-ui-hg/docs/DESIGN.md), phải thử trong `lab`.

Quy tắc: khi xong một việc, cập nhật mục này + mục "Kế tiếp" trong `packages/<pkg>/AGENTS.md`, và **đóng câu trả lời bằng đúng một bước tiếp theo**.

## Đang dở / nợ kỹ thuật

- Guard và `profile_doctor` chưa được gọi trong phiên chat thật (mới unit test + boot `lab` + chạy CLI).
- `dev-hg-rollback`: schema `type: ['object','null']` đã bị DSH từ chối (JsonSchemaError "must be a single type string") — đã sửa thành `type:'object'` + `restored:{}` khi không restore; test giờ check `typeof p.type === 'string'`. File mới tạo sau checkpoint không bị xoá khi restore (import chỉ ghi đè file trong snapshot) — đã ghi trong FEATURES.
- Nợ i18n: text render trong `src/tool.js` và `src/doctor-tool.js` còn tiếng Việt cứng — xem mục "Ngoại lệ i18n" trong [FEATURES](packages/dsh-dev-hg/docs/FEATURES.md).
- `packages/_template` cố tình không theo dõi trong [TRACKING](docs/TRACKING.md).

## Nhịp phát hành (không đổi)

bump version → [CHANGELOG](CHANGELOG.md) → **commit code** → `git tag <pkg>/v<ver>` (tag phải trỏ vào commit có code) → `node scripts/build-index.mjs` → commit `index.json` → push main + tag → `pnpm verify:release` → boot `lab` không có `entry did not activate`.

## Chỗ hay gãy

[ARCHITECTURE](docs/ARCHITECTURE.md) mục "Năm chỗ hay gãy" · [RUNBOOKS](docs/RUNBOOKS.md) khi có sự cố · [VERIFY](docs/VERIFY.md) khi cần biết phải chứng minh gì · [control/rules/](control/rules/README.md) quy trình dùng chung.
