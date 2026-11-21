# Tính năng — dsh-session-hg

Nhóm: `session` · Row id dạng `session-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `session-hg-boot` | Row rỗng giữ bundle cài được | done (0.1.0) | Bundle cài được, row hiện trong Plugins | Xoá khi có tính năng thật |
| `session-hg-context-panel` | Phân rã token/context theo file, tool, lượt | planned | Số liệu khớp session thật (đối chiếu 1 phiên, sai số 0); đủ 4 trạng thái; chuỗi en+vi | ABSORB từ `bowenliang123/dsh-context` |
| `session-hg-archive` | Xem và khôi phục session đã archive | planned | Liệt kê đúng, khôi phục 1 session rồi mở lại được; không sửa log gốc | |
| `session-hg-rewind` | Tua về message trước đó trong cửa sổ | planned | Tua 1 message, không fork, workspace không đổi nếu không chọn; có test | |

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp, không dùng `config.features.*`.
- Trạng thái phiên lấy từ projection/wire của host; không fold event ở client, không poll `agent/status`.
- Row thử nghiệm: `disabled: true` trong patch package, bật theo máy ở `workbench/profiles/<máy>/`.
- Chuỗi hiển thị: `locale/en.json` + `locale/vi.json` cùng lúc.
