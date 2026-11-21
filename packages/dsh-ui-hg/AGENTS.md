# dsh-ui-hg — trạng thái phát triển

Giai đoạn: **skeleton** · version 0.1.0 · cập nhật 2026-11-21
Bổ sung giao diện cho DSH. Mô tả công khai: [README.md](README.md).

File này không được phát hành (không nằm trong `files`).

## Row

| Row | Trạng thái |
|---|---|
| `ui-hg-boot` | done (0.1.0) — row rỗng |
| `ui-hg-statusbar`, `ui-hg-locale-switch`, `ui-hg-density` | planned — [docs/FEATURES.md](docs/FEATURES.md) |

## Kế tiếp

`ui-hg-statusbar` là row UI **đầu tiên** của cả marketplace → phải làm cẩn thận: đọc [docs/DESIGN.md](docs/DESIGN.md) trước khi viết dòng client đầu tiên, và thử trong profile `lab`.

## Luật riêng

- Chỉ dùng token `--dsw-alias-*`; không màu literal; không import `@deepseek-ai/dsh-client-*`.
- Đủ 4 trạng thái (loading/empty/error/denied) trước khi coi là xong.
- Client entry (`dsh.client` + `client.js`) tạo cùng row UI đầu tiên.
