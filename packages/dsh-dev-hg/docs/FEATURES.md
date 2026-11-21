# Tính năng — dsh-dev-hg

Nhóm: `dev` · Row id dạng `dev-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Quy trình port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Config | Ghi chú |
|---|---|---|---|---|
| `dev-hg-boot` | Row rỗng giữ bundle cài được | done | — | Xoá khi có tính năng thật đầu tiên |
| `dev-hg-i18n-audit` | Quét plugin đang cài: chuỗi CJK cứng, thiếu `locale/vi.json`, xuất báo cáo | planned | — | Ưu tiên 1: dùng cho chính quy trình port |
| `dev-hg-doctor` | So desired state với máy: bundle thiếu, link gãy, version lệch | planned | — | Đọc `workbench/profiles/<máy>/` |
| `dev-hg-snapshot` | Export/import profile (patch + bundle list), không kèm credentials | planned | — |  |
| `dev-hg-rollback` | Snapshot trước khi apply, rollback một bước | planned | — | Phụ thuộc snapshot |

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp nhiều tính năng vào một row và không dùng `config.features.*`, vì `config` bị thay thế wholesale khi một máy override.
- Row thử nghiệm mặc định `disabled: true` trong patch của package; bật theo máy ở `workbench/profiles/<máy>/`.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
