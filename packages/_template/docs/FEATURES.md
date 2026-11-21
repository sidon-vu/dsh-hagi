# Tính năng — dsh-template-hg

Nhóm: `dev` · Row id dạng `template-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Quy trình port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Config | Ghi chú |
|---|---|---|---|---|
| `template-hg-boot` | Row rỗng giữ bundle cài được | done | — | Thay bằng row thật khi copy |
| `template-hg-example` | Row ví dụ — xoá khi copy | planned | — |  |

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp nhiều tính năng vào một row và không dùng `config.features.*`, vì `config` bị thay thế wholesale khi một máy override.
- Row thử nghiệm mặc định `disabled: true` trong patch của package; bật theo máy ở `workbench/profiles/<máy>/`.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
