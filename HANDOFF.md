# HANDOFF — dsh-hagi

Cập nhật: 2026-11-21 · Đọc file này **trước khi sửa**; cập nhật khi release hoặc khi để lại việc dở.
Phạm vi rộng hơn (máy, profile, việc ngoài repo): `../HANDOFF.md`.

## Trạng thái phát hành

| Package | Version | Row | Tag |
|---|---|---|---|
| dsh-dev-hg | **0.3.1** | `dev-hg-i18n-audit`, `dev-hg-guard` | `dsh-dev-hg/v0.3.1` |
| dsh-session-hg | 0.1.0 | `session-hg-boot` (skeleton) | `dsh-session-hg/v0.1.0` |
| dsh-ui-hg | 0.1.0 | `ui-hg-boot` (skeleton) | `dsh-ui-hg/v0.1.0` |

`index.json` sinh từ tag, không sửa tay. URL live: `https://raw.githubusercontent.com/sidon-vu/dsh-hagi/main/index.json`

## Việc kế tiếp trong repo

1. **`dev-hg-doctor`** — row mới trong `dsh-dev-hg`. Done when: chạy trên 1 máy thật, báo đúng ≥ 1 lệch đã biết, không ghi gì ngoài báo cáo.
2. `dev-hg-snapshot` rồi `dev-hg-rollback` (sau doctor).
3. Row UI đầu tiên ở `dsh-ui-hg` — đọc [DESIGN.md](packages/dsh-ui-hg/docs/DESIGN.md), phải thử trong `lab`.

## Đang dở / nợ kỹ thuật

- Guard chưa được thử bằng tool call thật trong phiên (đã có unit test + load OK).
- Nợ i18n: text render trong `packages/dsh-dev-hg/src/tool.js` còn tiếng Việt cứng — xem mục "Ngoại lệ i18n" trong [FEATURES](packages/dsh-dev-hg/docs/FEATURES.md).
- `packages/_template` cố tình không theo dõi trong [TRACKING](docs/TRACKING.md).

## Nhịp phát hành (không đổi)

bump version → [CHANGELOG](CHANGELOG.md) → `git tag <pkg>/v<ver>` → `node scripts/build-index.mjs` → commit `index.json` → push main + tag → `pnpm verify:release` → boot `lab` không có `entry did not activate`.

## Chỗ hay gãy

[ARCHITECTURE](docs/ARCHITECTURE.md) mục "Năm chỗ hay gãy" · [RUNBOOKS](docs/RUNBOOKS.md) khi có sự cố · [VERIFY](docs/VERIFY.md) khi cần biết phải chứng minh gì.
