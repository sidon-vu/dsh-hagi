# process-changes — áp một quy trình mới vào đâu

Dùng khi người dùng đưa tài liệu/prompt/phương pháp và nói "áp dụng vào quy trình". Mục tiêu: **không thêm file thừa, không tạo nguồn sự thật thứ hai.**

## Quy trình 6 bước

1. **Đọc và phân loại.** Nội dung đó là: nguyên tắc (prose), thứ kiểm được (script), hay thứ phải chặn (guard)? Không phải cái gì cũng thành quy tắc.
2. **Tìm cái đã có.** Grep `AGENTS.md`, `rules/`, `docs/`. Phần lớn nội dung mới trùng 60–80% với cái đang có — chỉ lấy phần thiếu.
3. **Chọn đúng tầng:**
   - Sai là không sửa lại được → **guard** (code, row).
   - Kiểm được sau khi xong → **script** (`scripts/*.mjs`, thêm vào checklist).
   - Cần phán đoán → **prose**, viết vào rules/ hoặc AGENTS của đúng phạm vi.
4. **Viết ≤ 200 dòng**, một file một câu hỏi. Viết xong phải được link từ một file **tự nạp** (`~/.dsh/AGENTS.md`, `AGENTS.md` của project) hoặc từ `rules/README.md`.
5. **Kiểm chứng:** `pnpm check:docs`; nếu đổi hành vi thì theo [VERIFY](../../docs/VERIFY.md) mà chạy thêm.
6. **Ghi lại:** thêm dòng vào `CHANGELOG.md` mục `Unreleased` + commit. Nếu thay đổi cách làm việc, cập nhật `HANDOFF.md`.

## Không làm

- Không tạo thêm file "PRD/RULES/TASKS/PROGRESS" song song với cái đã có (xem [ARCHITECTURE](../../docs/ARCHITECTURE.md) mục "Tài liệu: cái gì có, cái gì cố tình không có").
- Không chép nguyên văn tài liệu nguồn vào repo: rút thành luật kiểm được.
- Không nhét cả tài liệu vào `AGENTS.md` — nó nạp mọi phiên, sẽ ăn context.

## Ví dụ đã áp dụng

| Nguồn | Kết quả |
|---|---|
| Quy tắc 6 file "vibe coding" | bỏ 4 file trùng, thêm cột `Done when`, thêm ARCHITECTURE + DESIGN.md |
| Pstack / software-factory của Lauren Tan | thêm trust ladder vào AGENTS, VERIFY.md, skills-from-mistakes, CAPABILITIES.md |
| Nhật ký phiên dài | thêm HANDOFF theo phạm vi + luật cập nhật cuối phiên |
