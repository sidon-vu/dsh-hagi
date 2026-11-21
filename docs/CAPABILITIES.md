# CAPABILITIES — agent làm được gì ở workspace này

Mỗi dòng ghi **cách kiểm**. Không kiểm được thì đừng tin dòng đó. Cập nhật khi thêm tool/script/row.

## Công cụ theo profile

| Nhóm | Có gì | Kiểm bằng |
|---|---|---|
| File | `read`, `write`, `edit`, `glob`, `grep` | gọi thử; danh sách tool của phiên |
| Shell | `pwsh` (Windows); `bash` nếu profile có | `pwsh -Command '$PSVersionTable.PSVersion'` |
| Job nền | `job_list`, `job_output`, `job_kill` | `job_list` trả danh sách (rỗng = không có job) |
| Subagent | `subagent`, `subagent_fork`, `workflow` | spawn một judge ngắn rồi đọc kết quả |
| Lịch | `schedule_create`, `schedule_list`, `schedule_edit` | `schedule_list` |
| Mạng | `web_search`, `web_fetch` | fetch một URL, xem HTTP status |
| Mesh | `mesh_peers`, `mesh_task`, `mesh_inbox` | `mesh_peers` trả node hiện tại |
| Plugin | `plugin_manager` (`list_plugins`, `list_bundles`) | `list_bundles` |
| Skill | `skill` + catalog | thấy skill trong catalog phiên, `skill` load được body |
| Guard | row `dev-hg-guard` (mặc định **tắt**) | `dsh --profile lab --dump-config` thấy row + `config` |

## Script trong repo

| Lệnh | Việc | Kiểm |
|---|---|---|
| `pnpm check:docs` | mọi `.md` ≤ 200 dòng, link không gãy | exit 0 + 1 dòng `ok` |
| `pnpm index:check` | `index.json` khớp `packages/` | exit 0 + `ok: index.json khớp` |
| `pnpm verify:release` | cài từ GitHub, resolve row, gọi `apply()` | `ok  <pkg>@<ver> — N row` |
| `node scripts/build-index.mjs` | sinh catalog (không sửa tay) | `ok: ghi index.json` |
| `node packages/dsh-dev-hg/test/smoke.mjs` | tool `i18n_audit` + schema | `ok: 20+ assertion` |
| `node packages/dsh-dev-hg/test/guard.mjs` | guard: đường dẫn, lệnh, secret | `ok: guard — toàn bộ assertion pass` |

## Môi trường

| Cái | Ở đâu | Kiểm |
|---|---|---|
| DSH chính | profile `desktop` (Electron quản lý) | `echo $env:DSH_PROFILE` trong phiên |
| Lab | `~/.dsh/profiles/lab` (CLI), cài `dsh-dev-hg` bằng `link:` | `dsh --profile lab --no-open --port 0` → dòng `dsh web: http://…` |
| Nháp | `scratch/` | xoá được bất cứ lúc nào |
| Skill học được | `~/.dsh/skills/` (bản chuẩn trong `dsh-hagi/control/user/skills/`) | skill hiện trong catalog phiên |
| Luật user-level | `~/.dsh/AGENTS.md` | phiên hiện `Instructions from: ~/.dsh/AGENTS.md` |

## Không có (đừng hứa)

- Chụp màn hình / quay video: không có công cụ; bằng chứng thay bằng log, dòng boot, HTTP status, diff.
- Điều khiển browser: chỉ khi cài thêm plugin/MCP; mặc định không.
- CI, deploy, review gate: không có. Vì vậy **không có bậc 5** trong trust ladder.
- Auto-merge: không áp dụng.

## Cập nhật

Thêm tool/script/row → thêm một dòng vào bảng tương ứng, kèm lệnh kiểm. Xoá được khi thứ đó biến mất; nếu không kiểm được nữa thì xoá dòng thay vì để lại niềm tin cũ.
