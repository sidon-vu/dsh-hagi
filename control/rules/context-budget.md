# context-budget — giữ phiên không phình

Đo thật từ log một phiên (2026-11-21): context cuối phiên **124.702 token**, trong đó:

| Nguồn | Token | Cách xử lý |
|---|---|---|
| Skill catalog từ `~/.agents/skills` (224 skill) | ~31k | đã tắt root đó trong `skill-filesystem` (profile patch) |
| Tool result của 103 lần gọi | ~39k | đọc có `offset`/`limit`, không grep `app.asar` |
| Reasoning của model (90 step, 1 turn) | ~75k | chia việc nhỏ, báo cáo giữa chừng |

## Luật

1. Bắt đầu từ `AGENTS.md` và `HANDOFF.md` của phạm vi đang mở; chỉ mở thêm file mà việc cần.
2. Đọc file dài bằng `read` + `offset`/`limit`. **Không** `Get-Content`/`cat` qua shell — output khó giới hạn, và shell không kích hoạt việc nạp file chỉ dẫn của thư mục.
3. **Không** grep/duyệt bên trong `app.asar` của DSH. Biết đường dẫn thì `read` thẳng file đó.
4. Việc dự kiến **quá ~15 lần gọi tool**: chia bước, báo cáo giữa chừng, để người dùng quyết có làm tiếp.
5. Không glob cả cây repo. Đi theo link trong `HANDOFF.md` / `PLUGINS.md`.
6. Kết thúc phiên: cập nhật `HANDOFF.md` (đang ở đâu, kế tiếp), xoá phần đã xong.

## Kiểm

- Phiên mới: catalog skill chỉ còn skill của DSH (~4 mục), không phải 250.
- Nếu một lượt vượt ~15 tool call mà chưa có kết quả dùng được → dừng, báo cáo, hỏi.

## Vì sao skill catalog từng to

`skill-filesystem` quét 5 root; `~/.agents/skills` là thư viện chung của các tool khác (224 skill, ~120 MB). DSH chỉ render **frontmatter** vào catalog, nhưng 224 frontmatter vẫn là ~31k token mỗi phiên. Đã tắt bằng `agentsHome` trỏ thư mục không tồn tại trong patch profile; `~/.dsh/skills` vẫn được quét.
