# Nguồn: i-have-adhd (luật trình bày câu trả lời)

## Nguồn

- Ngày nhận: 2026-11-21 · người đưa: chủ workspace (gửi link, hỏi có nên nạp)
- URL: https://github.com/ayghri/i-have-adhd (đọc README ở HEAD, 2026-11-21)
- Dạng: skill cho coding assistant (Claude Code plugin), **MIT**
- Mức tin cậy: kinh nghiệm + dựa trên *The Adult ADHD Tool Kit* (Ramsay & Rostain); không có số liệu

## Vì sao không cài nguyên

Đây là plugin của hệ Claude Code (`claude plugin install ...`, lệnh `/i-have-adhd`). DSH không có cơ chế đó, và luật trình bày thì không cần skill riêng — nó thuộc **luật user-level**, áp mọi phiên. MIT nên được phép phỏng theo, có ghi nguồn.

## Nội dung gốc (10 luật)

```text
1. Lead with the next action.
2. Number multi-step tasks.
3. End with one concrete next step.
4. Suppress tangents.
5. Restate state every turn.
6. Specific time estimates (minutes, not "a bit").
7. Make wins visible.
8. Matter-of-fact errors.
9. Cap lists to 5 items.
10. No preamble. No recap. No closers.
```

Ví dụ trong repo: thay vì "Great question! Let me think… looking at src/auth.ts, verifyToken seems to use an older API… hope this helps!" thì trả lời "Sửa `src/auth.ts:42`… 1) … 2) … 3) … Next: dán dòng lỗi đầu tiên nếu test fail."

## Đã áp dụng

| Luật | Áp vào |
|---|---|
| Trả lời trước, giải thích sau | `control/user/AGENTS.user.md` mục "Cách trình bày" (câu 1) |
| Đánh số bước · một bước tiếp theo | câu 2–3 |
| Bỏ lan man, không mở/kết xã giao | câu 4, 10 |
| Nêu trạng thái mỗi lượt | câu 5 |
| Ước lượng phút | câu 6 |
| Danh sách ≤ 5 mục | câu 8 |
| Lỗi nói thẳng | câu 9 |

## Không áp dụng / đã sửa

| Gốc | Ở DSH |
|---|---|
| "Restate state every turn" | mỗi lượt chỉ 1 dòng; tóm tắt đầy đủ để cuối phiên trong HANDOFF, tránh lặp token |
| "Make wins visible" | chỉ khi có bằng chứng chạy được; không khoe việc chưa kiểm |
| "No recap" tuyệt đối | xung đột với DoD "báo cáo kèm bằng chứng" → bằng chứng **inline, tối đa 2–3 dòng**, không dán bảng dài trừ khi bảng là quyết định |

## Credit

Luật phỏng theo ayghri/i-have-adhd (MIT), dựa trên *The Adult ADHD Tool Kit*.
