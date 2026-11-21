# dsh-dev-hg — trạng thái phát triển

Giai đoạn: **released** · version 0.5.0 · cập nhật 2026-11-21
Công cụ phát triển/vận hành cho DSH. Mô tả công khai: [README.md](README.md).

File này **không** nằm trong `files` của package → không phát hành cho người dùng, chỉ dùng khi phát triển.

## Row

| Row | Trạng thái | Ghi chú |
|---|---|---|
| `dev-hg-i18n-audit` | done (0.3.1) | tool `i18n_audit`; output schema phải là JSON Schema chuẩn mới activate |
| `dev-hg-guard` | done (0.3.0) | mặc định **tắt**, bật bằng patch profile |
| `dev-hg-doctor` | done (0.4.0) | tool `profile_doctor` |
| `dev-hg-snapshot` | done (0.5.0) | export/import profile, không kèm credentials |
| `dev-hg-rollback` | planned | chi tiết + done-when: [docs/FEATURES.md](docs/FEATURES.md) |

## Đang làm / kế tiếp

- Kế tiếp: **`dev-hg-rollback`** (thứ tự chốt ở [../../HANDOFF.md](../../HANDOFF.md)).
- Chặn: `guard`, `doctor` chưa được gọi trong phiên chat thật (mới unit test + boot `lab`).

## Luật riêng của package

- Một row = một tính năng, id `dev-hg-*` **không đổi** sau khi phát hành.
- Tool definition: object thuần, `output.schema` là JSON Schema chuẩn; `required: true` trên property → row không activate (xem skill `dsh-plain-tool-definition`).
- Test trước khi release: `node test/smoke.mjs` và `node test/guard.mjs`.
- Không import `@deepseek-ai/*`; không `workspace:*`; không `prepare`.
