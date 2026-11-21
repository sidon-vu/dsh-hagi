# sessions — nhiều phiên, một plugin mỗi phiên

DSH không khoá file giữa các phiên: hai phiên cùng sửa một file thì phiên sau ghi đè, **không báo**. Vì vậy phân vùng sở hữu.

## Vùng sở hữu

| Vùng | Ai được sửa |
|---|---|
| `packages/<pkg>/**` | chỉ phiên đang làm plugin đó |
| `packages/<pkg>/AGENTS.md`, `docs/FEATURES.md` của pkg | phiên sở hữu pkg; sửa xong **commit ngay** |
| `docs/TRACKING.md`, `PLUGINS.md` | phiên nào cũng được, nhưng phải commit trong cùng lượt |
| `HANDOFF.md`, `CHANGELOG.md`, `index.json` | **file dùng chung**: chỉ sửa lúc kết phiên/release; `index.json` luôn regenerate bằng script |
| `research/**` | read-only, trừ khi được giao phân tích |

## Luật

1. **Một phiên = một plugin.** Không mở hai phiên cùng sửa một package.
2. Phiên làm plugin đọc `packages/<pkg>/AGENTS.md` trước; không sửa package khác.
3. Sửa file dùng chung thì **commit ngay trong lượt đó** — cửa sổ xung đột tính bằng giây.
4. Trước khi push: `git pull --rebase`; `index.json` không resolve tay, chạy `pnpm index`.
5. Phiên phạm vi workbench (thêm/sửa quy trình) **không** sửa code plugin; chỉ sửa rules/docs và HANDOFF.

## Khi sắp xung đột thật

Dấu hiệu: hai phiên cùng cần sửa `CHANGELOG.md` hoặc cùng một row.

1. Dừng một phiên, ghi việc đang làm vào `packages/<pkg>/AGENTS.md` (mục "Đang làm").
2. Phiên còn lại làm xong, commit, push.
3. Phiên dừng pull về rồi tiếp.

Nếu xung đột lặp lại ở cùng file: tách việc theo file, hoặc dùng git worktree riêng (`dsh-experimental-tool-worktree`) — chỉ khi thật cần, vì `link:` trong profile sẽ trỏ đường dẫn khác.

## Ghi nhận phiên

Ghi tay vào `packages/<pkg>/AGENTS.md` dòng `Phiên gần nhất: session-…` nếu cần truy vết. DSH không tự ghi session id vào file.
