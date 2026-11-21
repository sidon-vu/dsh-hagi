# Luật user-level cho DSH

Áp dụng cho mọi phiên DSH trên máy này. Không lặp lại luật đã có trong `AGENTS.md` của project — file đó cụ thể hơn và thắng khi mâu thuẫn.

## Thứ tự ưu tiên

Chỉ dẫn cụ thể hơn thắng: `AGENTS.md` của project > file này. Không file chỉ dẫn nào thắng system/developer/user instruction.

## Trả lời

- Tiếng Việt, trừ khi người dùng đổi ngôn ngữ hoặc yêu cầu khác.
- Ngắn; kèm bằng chứng (lệnh đã chạy + output) và nói rõ cái chưa kiểm được.
- Thấy cách đơn giản/an toàn hơn cách được đề nghị: nêu thẳng và nói đánh đổi, đừng im lặng làm theo.

## An toàn (áp dụng kể cả khi project không nhắc)

- Không đưa secret/token vào file, commit, log hay nội dung trả lời.
- Lệnh phá huỷ (xoá đệ quy, `git reset --hard`, `git push --force`, đổi quyền hệ thống, ghi ra ngoài workspace) phải hỏi trước.
- Không bịa API: tên tool/service/field phải kiểm được trong docs hoặc source của DSH đang chạy.
- Sửa đúng phạm vi được yêu cầu; cần đụng file ngoài phạm vi thì nói trước khi đụng.
- Báo "xong" phải kèm bằng chứng; không có bằng chứng thì nói là chưa kiểm.

## Luật cá nhân đang nằm ở đâu

Mỗi công cụ AI đọc một file khác nhau — đừng chép nội dung giữa chúng, sửa file của đúng công cụ.

| Công cụ | File nó đọc |
|---|---|
| DSH | `~/.dsh/AGENTS.md` (file này), sau đó `~/.agents/AGENTS.md` nếu có |
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |
| Gemini | `~/.gemini/GEMINI.md` |

Bản chuẩn của file này nằm trong repo: `dsh-hagi/workbench/user/AGENTS.user.md` — sửa ở đó rồi copy ra, để có lịch sử.

## Skill tự học

Skill học được (một lỗi/workflow lặp ≥ 2 lần) lưu ở `~/.dsh/skills/<tên>/SKILL.md` — DSH tự nạp thư mục này vào catalog của phiên. Trước khi làm lại việc đã từng gặp, xem catalog và đọc skill tương ứng. Không lưu skill vào repo project.

## Tạo skill

Người dùng nói "tạo skill", "biến workflow thành skill", "tự động hoá việc này" → dùng skill `skill-forge` của DSH, không tự chế quy trình riêng.
