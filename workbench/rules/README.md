# rules/ — quy trình dùng chung (bản chuẩn, có lịch sử)

Đọc **khi cần**, không đọc hết. Mỗi file trả lời đúng một câu hỏi.

| File | Trả lời câu hỏi | Đọc khi |
|---|---|---|
| [context-budget.md](context-budget.md) | Làm sao giữ phiên không phình? | trước khi mở nhiều file hoặc chạy nhiều tool |
| [sessions.md](sessions.md) | Nhiều phiên cùng lúc thì ai được sửa gì? | mở phiên mới cho một plugin |
| [process-changes.md](process-changes.md) | Áp một quy trình mới vào đâu? | khi được đưa tài liệu/prompt để "áp dụng vào quy trình" |
| [../../docs/VERIFY.md](../../docs/VERIFY.md) | Cần bằng chứng gì cho loại thay đổi này? | trước khi báo xong |
| [../../docs/PORTING.md](../../docs/PORTING.md) | Port plugin lạ thế nào? | khi phân tích repo tham khảo |
| [../../docs/RUNBOOKS.md](../../docs/RUNBOOKS.md) | Có sự cố vận hành? | khi DSH hỏng, cần rollback |

## Vì sao nằm trong `dsh-hagi`

`dsh-workbench/` cố tình không phải git repo, nên đây là chỗ duy nhất có lịch sử cho quy trình. `dsh-workbench/_share/` chỉ là cửa vào trỏ tới thư mục này.

## Ba tầng quy tắc (thứ tự ưu tiên)

1. `~/.dsh/AGENTS.md` — luật cá nhân, áp mọi phiên, không phụ thuộc thư mục mở.
2. `AGENTS.md` của project đang mở (workbench hoặc `dsh-hagi`) — luật phạm vi.
3. Thư mục này — quy trình chi tiết, nạp theo link.

Luật cụ thể hơn thắng khi mâu thuẫn. Không file nào thắng system/developer/user instruction.
