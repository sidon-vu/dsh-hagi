# PLUGINS — danh sách plugin và giai đoạn

Tầng "biết có những gì". Chi tiết thì đi theo cột **Package**, không đọc hết file này.

| Plugin (chủ đề) | Để làm gì | Package | Giai đoạn |
|---|---|---|---|
| hg · Dev & Ops | công cụ phát triển/vận hành: audit i18n, khoá an toàn, chẩn đoán profile, snapshot/restore | [dsh-dev-hg 0.5.0](packages/dsh-dev-hg/AGENTS.md) | **released** (4 row) |
| hg · Session & Context | công cụ phiên làm việc: xem context, archive, rewind | [dsh-session-hg 0.1.0](packages/dsh-session-hg/AGENTS.md) | skeleton |
| hg · UI & Experience | status bar đa máy, chuyển EN/VI, mật độ hiển thị | [dsh-ui-hg 0.1.0](packages/dsh-ui-hg/AGENTS.md) | skeleton |

Giai đoạn: `spec` → `skeleton` (bundle cài được, chưa có row thật) → `coding` → `verify` → `released`.

Hiện **1 plugin = 1 package**. Muốn một plugin có nhiều package: thêm package vào `packages/` và ghi cả hai dòng dưới cùng một plugin ở bảng trên.

## Đi tiếp theo nhu cầu

| Cần gì | Đi đâu |
|---|---|
| Trạng thái toàn repo (version, nợ, việc kế) | [HANDOFF.md](HANDOFF.md) |
| Row nào đang ở trạng thái nào | [docs/TRACKING.md](docs/TRACKING.md) |
| Quy ước code/row/release | [AGENTS.md](AGENTS.md) |
| Quy trình dùng chung (context, phiên, áp quy trình) | [control/rules/README.md](control/rules/README.md) |
| Mô tả công khai cho người dùng | [README.md](README.md) |
