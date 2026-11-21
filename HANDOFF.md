# HANDOFF — dsh-hagi

Cập nhật: 2026-11-21 · Đọc file này **trước khi sửa**; cập nhật khi release hoặc khi để lại việc dở.
Phạm vi rộng hơn (máy, profile, việc ngoài repo): `../HANDOFF.md`. Danh sách plugin + giai đoạn: [PLUGINS.md](PLUGINS.md).

## Trạng thái phát hành

| Package | Version | Row | Tag |
|---|---|---|---|
| dsh-dev-hg | **0.5.0** | `dev-hg-i18n-audit`, `dev-hg-guard`, `dev-hg-doctor`, `dev-hg-snapshot` | `dsh-dev-hg/v0.5.0` |
| dsh-session-hg | 0.1.0 | `session-hg-boot` (skeleton) | `dsh-session-hg/v0.1.0` |
| dsh-ui-hg | 0.1.0 | `ui-hg-boot` (skeleton) | `dsh-ui-hg/v0.1.0` |

`index.json` sinh từ tag, không sửa tay. URL live: `https://raw.githubusercontent.com/sidon-vu/dsh-hagi/main/index.json`

## Việc kế tiếp trong repo

1. **`dev-hg-rollback`** — snapshot trước khi apply, rollback một bước (sau `dev-hg-snapshot` đã xong ở 0.5.0). Done when: apply một thay đổi → rollback → trạng thái cũ; có test.
2. Row UI đầu tiên ở `dsh-ui-hg` — đọc [DESIGN.md](packages/dsh-ui-hg/docs/DESIGN.md), phải thử trong `lab`.
3. `dsh-session-hg` — row đầu tiên nên là `session-hg-context-panel`.

## Đang dở / nợ kỹ thuật

- Guard và `profile_doctor` chưa được gọi trong phiên chat thật (mới unit test + boot `lab` + chạy CLI).
- Nợ i18n: text render trong `src/tool.js` và `src/doctor-tool.js` còn tiếng Việt cứng — xem mục "Ngoại lệ i18n" trong [FEATURES](packages/dsh-dev-hg/docs/FEATURES.md).
- `packages/_template` cố tình không theo dõi trong [TRACKING](docs/TRACKING.md).

## Nhịp phát hành (không đổi)

bump version → [CHANGELOG](CHANGELOG.md) → **commit code** → `git tag <pkg>/v<ver>` (tag phải trỏ vào commit có code) → `node scripts/build-index.mjs` → commit `index.json` → push main + tag → `pnpm verify:release` → boot `lab` không có `entry did not activate`.

## Chỗ hay gãy

[ARCHITECTURE](docs/ARCHITECTURE.md) mục "Năm chỗ hay gãy" · [RUNBOOKS](docs/RUNBOOKS.md) khi có sự cố · [VERIFY](docs/VERIFY.md) khi cần biết phải chứng minh gì · [control/rules/](control/rules/README.md) quy trình dùng chung.
