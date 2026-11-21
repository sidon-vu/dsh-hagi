# Nguồn: audit luật cũ + chuyển luật sang "hook"

## Nguồn

- Ngày nhận: 2026-11-21 · người đưa: chủ workspace (dán nguyên văn)
- Dạng: task spec kiểu Claude Code (đề cập `.claude/rules`, Cursor, Copilot, `PreToolUse`, `Stop` hook)
- Đã chạy một lần: 12 luật được kiểm, 4 luật bị sửa, judge subagent xác nhận lại

## Nội dung gốc

```text
<task>
Find the stale lines in this repo's agent instruction files, and the rules that must never break but only live in prose. Change nothing until I approve.
</task>

<find>
List every instruction file: every CLAUDE.md, including the local and imported ones, .claude/rules, every AGENTS.md and its override file, Cursor rules in .cursor/rules and Copilot instructions under .github, plus my user-level files in ~/.claude and ~/.codex.
</find>

<check>
- For each rule or convention, search the code for evidence. Mark it followed (cite 2 examples), contradicted (cite the file and line where the code does otherwise, with a count), or unverifiable.
- Only flag contradictions that change behavior: logging, error handling, data access, APIs, tests. Skip naming nits.
- Start a fresh subagent (not a fork) as the judge. It re-opens every cited line and drops any claim it can't confirm.
</check>

<hooks>
List the rules that must never break: secrets, destructive commands, protected paths, tests before "done". For each, draft what enforces it in Claude Code: a deny rule for commands and protected paths, a PreToolUse hook for secret scans, a Stop hook for tests before "done". Show each as a diff to the project settings. A deny rule or hook runs as code on every matching call. A line in CLAUDE.md is context the model can skip.
</hooks>

<output>
A table: rule, status, evidence, proposed edit. Then the hook diffs. Then the precedence sentence if my user-level file doesn't have one. Stop and wait for my yes.
</output>
```

## Đã áp dụng

| Ý tưởng | Nơi áp dụng |
|---|---|
| Kiểm luật bằng bằng chứng, phân loại followed/contradicted/unverifiable | Buổi audit 2026-11-21: 12 luật, 4 lệch; sửa trong [AGENTS.md](../../AGENTS.md) + [packages/dsh-dev-hg/docs/FEATURES.md](../../packages/dsh-dev-hg/docs/FEATURES.md) |
| Judge subagent mới, mở lại từng dòng, bác claim không kiểm được | Ghi thành quy trình trong [docs/VERIFY.md](../../docs/VERIFY.md) mục "Khi nào gọi judge" |
| "Hook chạy như code mỗi lần gọi" | Row `dev-hg-guard` dùng `ctx.tools.guard()` — deny rule cho đường dẫn, lệnh phá huỷ, secret |
| Precedence sentence | Luật user-level: [control/user/AGENTS.user.md](../user/AGENTS.user.md) mục "Thứ tự ưu tiên" |
| Chỉ bắt mâu thuẫn đổi hành vi | Áp dụng: bỏ qua khác biệt đặt tên, chỉ sửa 4 luật ảnh hưởng hành vi |
| Không đổi gì trước khi được duyệt | Đã theo: audit chỉ báo cáo; sửa chỉ sau khi người dùng chọn mục |

## Không áp dụng (do khác nền tảng)

| Ý tưởng Claude Code | Ở DSH |
|---|---|
| `.claude/rules`, `.cursor/rules`, `.github/copilot-instructions.md` | DSH chỉ nạp `AGENTS.md`/`CLAUDE.md`; các loại khác không tồn tại hoặc không được đọc |
| `settings.json` deny rule | `cordis.patch.yml` + preset quyền + `ctx.tools.guard()` |
| `Stop` hook cho "test trước khi done" | **Không có tương đương cứng**: gần nhất là nghe `turn/end` rồi nhắc; thực tế dựa vào checklist + script |

Chi tiết đối chiếu: [docs/CAPABILITIES.md](../../docs/CAPABILITIES.md) và [docs/VERIFY.md](../../docs/VERIFY.md).
