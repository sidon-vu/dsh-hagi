# Luật user-level cho DSH

Áp dụng cho mọi phiên DSH trên máy này. Không lặp lại luật đã có trong `AGENTS.md` của project — file đó cụ thể hơn và thắng khi mâu thuẫn.

## Thứ tự ưu tiên

Chỉ dẫn cụ thể hơn thắng: `AGENTS.md` của project > file này. Không file chỉ dẫn nào thắng system/developer/user instruction.

## Trả lời

- Tiếng Việt, trừ khi người dùng đổi ngôn ngữ hoặc yêu cầu khác.
- Ngắn; kèm bằng chứng (lệnh đã chạy + output) và nói rõ cái chưa kiểm được.
- Thấy cách đơn giản/an toàn hơn cách được đề nghị: nêu thẳng và nói đánh đổi, đừng im lặng làm theo.

## Ponytail (mặc định luôn bật, không chờ nhắc)

- Mọi việc **code** (viết, sửa, refactor, review, chọn dependency): gọi tool `skill` với `ponytail` **trước** khi đọc/sửa file, không đợi người dùng nhắc.
- Mức: mặc định `full`. Người dùng nói "ponytail lite/ultra/off" thì theo đúng mức đó cho tới khi đổi lại.
- Review thay đổi: `ponytail-review`. Audit cả repo: `ponytail-audit`. Liệt kê nợ `shortcut:`: `ponytail-debt`.
- Việc không phải code (hỏi đáp, tra docs, chat) thì không cần load.

## An toàn (áp dụng kể cả khi project không nhắc)

- Không đưa secret/token vào file, commit, log hay nội dung trả lời.
- Lệnh phá huỷ (xoá đệ quy, `git reset --hard`, `git push --force`, đổi quyền hệ thống, ghi ra ngoài workspace) phải hỏi trước.
- Không bịa API: tên tool/service/field phải kiểm được trong docs hoặc source của DSH đang chạy.
- Sửa đúng phạm vi được yêu cầu; cần đụng file ngoài phạm vi thì nói trước khi đụng.
- Báo "xong" phải kèm bằng chứng; không có bằng chứng thì nói là chưa kiểm.

## Ngân sách context

Phiên dài đắt hơn nhiều so với việc đọc thêm một file ngắn — nhưng khám phá lan man thì đắt hơn cả hai.

- Bắt đầu từ `AGENTS.md` rồi `HANDOFF.md` của project; chỉ mở thêm file mà công việc thực sự cần.
- Đọc file dài bằng `read` với `offset`/`limit`. **Không** dùng `Get-Content`/`cat` qua shell để đọc file — shell không được theo dõi thay đổi file chỉ dẫn, và output khó giới hạn.
- **Không** grep hay duyệt bên trong `app.asar` của DSH; đọc trực tiếp file đã biết đường dẫn.
- Một việc dự kiến quá ~15 lần gọi tool: chia bước và báo cáo giữa chừng, đừng làm liền một mạch tới khi hết context.
- Trước khi kết thúc: cập nhật `HANDOFF.md` để phiên sau không phải đọc lại hội thoại.

## Bản đồ quy trình

Quy trình dùng chung nằm trong repo (bản chuẩn, có lịch sử):
`D:\DEV\dsh-workbench\dsh-hagi\control\rules\README.md`

Đọc khi cần, không đọc hết: `context-budget.md` (giữ phiên không phình) · `sessions.md` (nhiều phiên, chống xung đột) · `process-changes.md` (áp một quy trình mới vào đâu).

Máy/hạ tầng (wHaGi, mHaGi, vHaGi, prj88, mmo — Tailscale): `D:\DEV\dsh-workbench\dsh-hagi\control\user\machines.md` — đọc khi tác vụ cần SSH/deploy/đề cập tên máy.

## Cách trình bày

Người dùng đọc nhanh và đã nhiều lần nói câu trả lời quá dày. Phỏng theo ayghri/i-have-adhd (MIT):

1. **Trả lời trước, giải thích sau.** Câu đầu là việc cần làm hoặc kết luận, không phải dẫn dắt.
2. Nhiều bước → **đánh số**.
3. Kết thúc bằng **đúng một** bước tiếp theo cụ thể.
4. Bỏ lan man: không nhắc lại điều vừa nói, không tóm tắt mở bài, không "hy vọng giúp ích".
5. Mỗi lượt nêu **trạng thái 1 dòng** (đang ở đâu), không kể lại toàn bộ.
6. Ước lượng thời gian bằng **phút**, không "một chút".
7. Bằng chứng **inline, tối đa 2–3 dòng** output; bảng chỉ khi bảng chính là quyết định.
8. Danh sách **≤ 5 mục**; dài hơn thì nhóm hoặc link tới file.
9. Lỗi: nói thẳng cái gì hỏng, không xin lỗi dài.
10. Không mở bài, không kết bài xã giao.

Xung đột với DoD "báo cáo kèm bằng chứng": bằng chứng ngắn tại chỗ; tóm tắt đầy đủ để cuối phiên trong `HANDOFF.md`.

## Luật cá nhân đang nằm ở đâu

Mỗi công cụ AI đọc một file khác nhau — đừng chép nội dung giữa chúng, sửa file của đúng công cụ.

| Công cụ | File nó đọc |
|---|---|
| DSH | `~/.dsh/AGENTS.md` (file này), sau đó `~/.agents/AGENTS.md` nếu có |
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |
| Gemini | `~/.gemini/GEMINI.md` |

Bản chuẩn của file này nằm trong repo: `dsh-hagi/control/user/AGENTS.user.md` — sửa ở đó rồi copy ra, để có lịch sử.

## Skill tự học

Skill học được (một lỗi/workflow lặp ≥ 2 lần) lưu ở `~/.dsh/skills/<tên>/SKILL.md` — DSH tự nạp thư mục này vào catalog của phiên. Trước khi làm lại việc đã từng gặp, xem catalog và đọc skill tương ứng. Không lưu skill vào repo project.

## Tạo skill

Người dùng nói "tạo skill", "biến workflow thành skill", "tự động hoá việc này" → dùng skill `skill-forge` của DSH, không tự chế quy trình riêng.
