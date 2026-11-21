# Nguồn: quy tắc "6 file trước khi vibe coding"

## Nguồn

- Ngày nhận: 2026-11-21
- Người đưa: chủ workspace (dán nguyên văn)
- Dạng: prompt/ghi chú ngắn, không rõ tác giả gốc
- Mức tin cậy: kinh nghiệm truyền miệng; **không có số liệu kiểm chứng**

## Nội dung gốc

```text
Create these 6 files before you start vibe coding:

• PRD.md: what you're building and for whom
• ARCHITECTURE.md: stack, folders, data flow
• DESIGN.md: colors, fonts, components, vibe
• RULES.md: coding style and what the AI must never do
• TASKS.md: small steps, one at a time
• PROGRESS.md: what's done, what broke, what's next

No files = the AI guesses.
6 files = the AI follows your plan.

10 minutes of writing saves 10 hours of fixing.
```

## Đã áp dụng

| Ý tưởng | Nơi áp dụng |
|---|---|
| `ARCHITECTURE.md` | [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — row → bundle → ba đường cài → chỗ hay gãy |
| `DESIGN.md` | [packages/dsh-ui-hg/docs/DESIGN.md](../../packages/dsh-ui-hg/docs/DESIGN.md) — token, slot, 4 trạng thái |
| `PRD.md` | Thay bằng cột **Done when** trong `packages/<pkg>/docs/FEATURES.md` — viết theo tính năng, không theo dự án |
| `PROGRESS.md` | Thay bằng dòng `> wip:` trong [docs/TRACKING.md](../../docs/TRACKING.md) + [HANDOFF.md](../../HANDOFF.md) |
| "10 phút viết" | [workbench/rules/process-changes.md](../rules/process-changes.md) — rút thành luật kiểm được |

## Không áp dụng

| Ý tưởng | Lý do |
|---|---|
| `RULES.md` riêng | `AGENTS.md` đã là RULES **và** là file duy nhất được tự nạp; thêm file thứ hai tạo nguồn sự thật đôi |
| `TASKS.md` riêng | Mỗi việc đã có id = row id + trạng thái trong TRACKING; file riêng sẽ lệch |
| `PROGRESS.md` riêng | CHANGELOG (đã xong) + dòng `wip:` (đang làm) đã đủ; file thứ ba sẽ mục |
| "6 files = the AI follows your plan" | Không phải số file quyết định, mà là file **có được tự nạp không** + mỗi câu hỏi có đúng một nơi trả lời |

Chi tiết quyết định: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) mục "Tài liệu: cái gì có, cái gì cố tình không có".
