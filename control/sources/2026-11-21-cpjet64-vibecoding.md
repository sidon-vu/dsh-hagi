# Nguồn: repo cpjet64/vibecoding

## Nguồn

- Ngày nhận: 2026-11-21 · người đưa: chủ workspace (gửi link, yêu cầu "đọc xem áp dụng được gì")
- Dạng: repo GitHub, 16 tài liệu Markdown (~190 KB), **không có code**
- Commit đã đọc: `35574fd3d6157ee413bef3c887d306ff3b520969`
- License: **none** — README ghi MIT nhưng repo **không có file LICENSE** → chỉ học ý tưởng, không copy nội dung
- Bản clone + phân tích chi tiết: `research/references/cpjet64__vibecoding/` (ngoài repo, **không có lịch sử**) — file này là bản ghi có version

## Nội dung tóm tắt (không nguyên văn — không có quyền copy)

16 guide chia 3 nhóm: làm việc với AI (collaboration, orchestration, prompt, vibe translation, QA), vận hành (dev environments, runbooks, incident response, changelog, recovery, maintenance, security), tài liệu hệ thống (architecture, PRD, vendor contacts). Mỗi guide theo khuôn *mindset → pattern → template copy-paste*.

## Đã áp dụng

| Ý tưởng | Nơi áp dụng |
|---|---|
| Runbook: mục đích → chuẩn bị → bước → kiểm chứng → khi hỏng | [docs/RUNBOOKS.md](../../docs/RUNBOOKS.md) — RB-1/2/3 |
| Changelog Keep a Changelog, có `Unreleased`, mục `Verified` | [CHANGELOG.md](../../CHANGELOG.md) + bước release |
| Review code AI theo nhiều chiều + cảnh báo "hallucinated API" | [AGENTS.md](../../AGENTS.md) mục Definition of Done |
| Dev → staging → production | [docs/PORTING.md](../../docs/PORTING.md) mục "Thăng cấp lab → desktop" |
| Vòng lặp slice nhỏ end-to-end | [PORTING](../../docs/PORTING.md): "slice đầu tiên phải cài được và dùng được" |
| Cách ly file chỉ dẫn khi đọc repo lạ (phát hiện ngoài dự kiến) | [rules/README.md](../rules/README.md) + skill `foreign-repo-quarantine` |

## Không áp dụng

| Ý tưởng | Lý do |
|---|---|
| Prompt engineering / vibe translation | viết cho người mới, không đổi được quy ước |
| Incident response matrix, vendor contacts, PRD | ngoài phạm vi plugin; ma trận vai trò thừa với 1 người |
| Copy nội dung guide | **không có LICENSE** → chỉ học ý tưởng, không chép câu chữ |
