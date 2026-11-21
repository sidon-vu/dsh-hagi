# HANDOFF — dsh-hagi

Cập nhật: 2026-11-21 · Đọc file này **trước khi sửa**; cập nhật khi release hoặc khi để lại việc dở.
Phạm vi rộng hơn (máy, profile, việc ngoài repo): `../HANDOFF.md`. Danh sách plugin + giai đoạn: [PLUGINS.md](PLUGINS.md).

## Trạng thái phát hành

| Package | Version | Row | Tag |
|---|---|---|---|
| dsh-dev-hg | **0.6.0** | `dev-hg-i18n-audit`, `dev-hg-guard`, `dev-hg-doctor`, `dev-hg-snapshot`, `dev-hg-rollback` | `dsh-dev-hg/v0.6.0` |
| dsh-session-hg | 0.1.0 | `session-hg-boot` (skeleton) | `dsh-session-hg/v0.1.0` |
| dsh-ui-hg | 0.1.0 | `ui-hg-boot` (skeleton) | `dsh-ui-hg/v0.1.0` |

`index.json` sinh từ tag, không sửa tay. URL live: `https://raw.githubusercontent.com/sidon-vu/dsh-hagi/main/index.json`

## Việc kế tiếp trong repo

**Đã chốt 2026-11-21:** kế tiếp là **`session-hg-context-panel`** trong `dsh-session-hg` — không có bề mặt UI, dùng bản ABSORB đã có, và mở khoá chủ đề "session" (hai package còn lại vẫn skeleton).

1. **`session-hg-context-panel`** — row đầu tiên của `dsh-session-hg`. Done when: số liệu khớp một phiên thật (sai số 0), đủ 4 trạng thái, chuỗi en+vi.
2. **Chờ người dùng (2 phút):** gọi thử `i18n_audit`, `profile_doctor`, `profile_rollback` trong một phiên chat thật (lab) — đây là nợ xác minh duy nhất của `dsh-dev-hg`.
3. **Sau đó:** row UI đầu tiên ở `dsh-ui-hg` — đọc [DESIGN.md](packages/dsh-ui-hg/docs/DESIGN.md), phải thử trong `lab`.

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
