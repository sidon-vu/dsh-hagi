# Tính năng — dsh-ui-hg

Nhóm: `interface` · Row id dạng `ui-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). **Luật UI: [DESIGN.md](DESIGN.md)** — đọc trước khi viết dòng code client đầu tiên.

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `ui-hg-boot` | Row rỗng giữ bundle cài được | done (0.1.0) | Bundle cài được, row hiện trong Plugins | Xoá khi có tính năng thật |
| `ui-hg-statusbar` | Status bar đa máy: máy hiện tại, profile, plugin lệch | planned | Hiện đúng máy/profile/số plugin lệch so với TRACKING; chỉ token, không màu literal; đủ 4 trạng thái | Lý do chính vào nhóm interface |
| `ui-hg-locale-switch` | Chuyển EN/VI cho chuỗi của các plugin hg | planned | Đổi ngôn ngữ áp ngay cho chuỗi hg; nhớ lựa chọn qua restart | Cần cả 3 package |
| `ui-hg-density` | Mật độ hiển thị compact/normal | planned | Hai mức, đổi bằng spacing token; không vỡ layout ở 320px | |

## Ghi chú thiết kế

- Client entry (`dsh.client` + `client.js`) tạo cùng row UI đầu tiên; DESIGN.md đã có luật trước để không phải sửa lại.
- **Một tính năng = một row.** Không gộp, không dùng `config.features.*`.
- Row thử nghiệm: `disabled: true` trong patch package, bật theo máy ở `control/profiles/<máy>/`.
