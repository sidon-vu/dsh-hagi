# Tính năng — dsh-template-hg

Template nội bộ: copy thư mục `_template` thành `packages/dsh-<nhóm>-hg` rồi thay thế nội dung dưới đây.
Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md).

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `template-hg-boot` | Row rỗng giữ bundle cài được | done | Bundle cài được, row hiện trong Plugins | Thay bằng row thật khi copy |
| `template-hg-example` | Row ví dụ | planned | Thay bằng tiêu chí **kiểm được** (một câu, có output) | Xoá khi copy |

## Quy tắc cho mọi row mới

1. **Một tính năng = một row**, id `<nhóm>-hg-<tính năng>`, không đổi tên sau khi phát hành.
2. Cột **Done when** phải là điều kiểm được (lệnh, output, trạng thái UI), không phải "hoạt động tốt".
3. Config phẳng, nhỏ; mặc định nằm trong code; patch máy thay thế wholesale.
4. Thử nghiệm thì `disabled: true` trong patch của package.
5. Chuỗi hiển thị: `locale/en.json` + `locale/vi.json` cùng lúc.
