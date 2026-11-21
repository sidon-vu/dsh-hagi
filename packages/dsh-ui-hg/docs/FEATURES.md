# Tính năng — dsh-ui-hg

Nhóm: `interface` · Row id dạng `ui-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Quy trình port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Config | Ghi chú |
|---|---|---|---|---|
| `ui-hg-boot` | Row rỗng giữ bundle cài được | done | — | Xoá khi có tính năng thật đầu tiên |
| `ui-hg-statusbar` | Status bar đa máy: máy hiện tại, profile, plugin lệch | planned | — | Lý do chính để vào nhóm interface |
| `ui-hg-locale-switch` | Chuyển EN/VI cho chuỗi của các plugin hg | planned | — | Đọc cùng 2 package còn lại |
| `ui-hg-density` | Mật độ hiển thị compact/normal | planned | — |  |

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp nhiều tính năng vào một row và không dùng `config.features.*`, vì `config` bị thay thế wholesale khi một máy override.
- Row thử nghiệm mặc định `disabled: true` trong patch của package; bật theo máy ở `workbench/profiles/<máy>/`.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
