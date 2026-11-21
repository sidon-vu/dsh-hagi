# dsh-session-hg — trạng thái phát triển

Giai đoạn: **skeleton** · version 0.1.0 · cập nhật 2026-11-21
Công cụ phiên/context cho DSH. Mô tả công khai: [README.md](README.md).

File này không được phát hành (không nằm trong `files`).

## Row

| Row | Trạng thái |
|---|---|
| `session-hg-boot` | done (0.1.0) — row rỗng giữ bundle cài được |
| `session-hg-context-panel`, `session-hg-archive`, `session-hg-rewind` | planned — [docs/FEATURES.md](docs/FEATURES.md) |

## Kế tiếp

Row đầu tiên nên là `session-hg-context-panel` (ABSORB từ `bowenliang123/dsh-context`). Trước khi làm UI: đọc [docs/DESIGN.md](../dsh-ui-hg/docs/DESIGN.md).

## Luật riêng

- Một row = một tính năng, id `session-hg-*` không đổi.
- Dữ liệu phiên lấy từ projection/wire của host, không fold event ở client.
