# sources/ — văn bản gốc của những gì được đưa để áp dụng

Mọi tài liệu/prompt người dùng dán vào (không phải repo) đều lưu **nguyên văn** ở đây, trước khi rút thành quy tắc. Lý do: 3 tháng sau chỉ có "quy tắc" thì không biết nó đến từ đâu, và không kiểm lại được mình đã bỏ gì.

Repo tham khảo (clone được) thì không lưu ở đây — dùng `research/inbox/` + `research/references/<owner>__<repo>/NOTICE.md`.

## Quy ước tên

`<ngày>-<slug>.md` — ngày nhận (YYYY-MM-DD), slug ngắn mô tả nội dung.

## Mỗi file có 4 mục

1. **Nguồn**: ngày, người đưa, dạng (prompt/tài liệu/bài viết), mức tin cậy.
2. **Nội dung gốc**: nguyên văn, trong một khối `text`.
3. **Đã áp dụng**: bảng ý tưởng → nơi áp dụng (link tới file thật).
4. **Không áp dụng**: ý tưởng bị bỏ + lý do.

## Danh sách

| Ngày | File | Chủ đề | Đã áp dụng ở |
|---|---|---|---|
| 2026-11-21 | [2026-11-21-i-have-adhd.md](2026-11-21-i-have-adhd.md) | 10 luật trình bày câu trả lời (MIT) | mục "Cách trình bày" trong luật user-level |
| 2026-11-21 | [2026-11-21-cpjet64-vibecoding.md](2026-11-21-cpjet64-vibecoding.md) | repo 16 guide "vibecoding" (license:none) | RUNBOOKS, CHANGELOG, DoD, PORTING, cách ly repo lạ |
| 2026-11-21 | [2026-11-21-six-files-vibecoding.md](2026-11-21-six-files-vibecoding.md) | 6 file trước khi "vibe coding" | ARCHITECTURE, DESIGN, cột Done when, từ chối 4 file trùng |
| 2026-11-21 | [2026-11-21-pstack-lauren-tan.md](2026-11-21-pstack-lauren-tan.md) | software-factory / pstack (Lauren Tan) | trust ladder, VERIFY, skills-from-mistakes, CAPABILITIES |
| 2026-11-21 | [2026-11-21-stale-rules-audit.md](2026-11-21-stale-rules-audit.md) | audit luật cũ + hook enforcement | audit 12 luật, sửa 4 luật lệch, `dev-hg-guard` |

## Luật

Trước khi áp dụng bất kỳ tài liệu dán vào: **lưu file ở đây trước** ([process-changes](../rules/process-changes.md) bước 0). Không lưu = không được coi là nguồn chính thức, và lần sau không truy lại được.
