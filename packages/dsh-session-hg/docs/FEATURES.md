# Tính năng — dsh-session-hg

Nhóm: `session` · Row id dạng `session-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Quy trình port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Config | Ghi chú |
|---|---|---|---|---|
| `session-hg-boot` | Row rỗng giữ bundle cài được | done | — | Xoá khi có tính năng thật đầu tiên |
| `session-hg-context-panel` | Phân rã token/context theo file, tool, lượt | planned | — | ABSORB từ `bowenliang123/dsh-context` |
| `session-hg-archive` | Xem và khôi phục session đã archive | planned | — |  |
| `session-hg-rewind` | Tua về message trước đó trong cửa sổ | planned | — |  |

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp nhiều tính năng vào một row và không dùng `config.features.*`, vì `config` bị thay thế wholesale khi một máy override.
- Row thử nghiệm mặc định `disabled: true` trong patch của package; bật theo máy ở `workbench/profiles/<máy>/`.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
