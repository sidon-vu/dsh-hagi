# VERIFY — bằng chứng cho từng loại thay đổi

Nguyên tắc: **bằng chứng phải để người khác kiểm lại được**. Không có bằng chứng thì là "chưa xong", không phải "xong". Bằng chứng không phải ảnh chụp màn hình — là lệnh + output, dòng log, HTTP status, hoặc diff đọc được.

Mức tự chủ và ai được làm gì: `AGENTS.md` của workspace, mục "Mức tự chủ (trust ladder)".

## Chạy gì theo loại thay đổi

| Loại thay đổi | Phải chạy | Bằng chứng tối thiểu |
|---|---|---|
| Chỉ tài liệu (`*.md`) | `pnpm check:docs` | 1 dòng `ok: không file nào quá dài, không link gãy` |
| Policy (`AGENTS.md`, `PORTING`, `LICENSE-POLICY`) | `pnpm check:docs` + **judge** nếu đổi quy tắc ảnh hưởng hành vi | output + verdict judge |
| Row host mới/đổi (tool, guard, service) | `node packages/dsh-dev-hg/test/<suite>.mjs` + `pnpm verify:release` + **boot `lab`** | 3 dòng: test pass, `guards=`/`tools=`, và không có `entry did not activate` |
| Release (bump version, tag) | toàn bộ trên + `pnpm index:check` | spec pinned trong output `verify:release` |
| Patch profile / đổi bundle | `dsh --profile lab --dump-config` + boot `lab` | dòng URL + không warning; dòng row đã ghép |
| Port/ABSORB từ repo lạ | [PORTING](PORTING.md) + `i18n_audit` + test row mới | output audit + test của row |
| Xoá/đổi quyền/di chuyển dữ liệu | **dừng lại**, hỏi người dùng + judge | xác nhận của người dùng trong hội thoại |

## Lệnh chuẩn

```powershell
# trong dsh-hagi
pnpm check:docs
pnpm index:check
pnpm verify:release
node packages/dsh-dev-hg/test/smoke.mjs
node packages/dsh-dev-hg/test/guard.mjs

# mount thật (bắt buộc với row đăng ký tool/slot/service)
dsh --profile lab --no-open --port 0     # Ctrl-C sau khi thấy "dsh web: http://..."
dsh --profile lab --dump-config          # kiểm cấu hình ghép, không boot
```

## Khi nào gọi judge (subagent mới, không fork)

1. Kết luận audit/đánh giá mà bản thân bạn là người đưa ra claim.
2. Đổi policy hoặc quy ước ảnh hưởng nhiều phiên sau.
3. Lần phát hành đầu tiên của một **loại** row mới (tool/slot/service).
4. Claim không kiểm được bằng lệnh — "API này có thật", "cách này an toàn".

Brief cho judge phải có: (a) danh sách claim kèm `file:dòng`, (b) yêu cầu **mở lại chính dòng đó**, xác nhận hay bỏ, (c) tìm thêm mâu thuẫn, (d) không sửa file, (e) đầu ra ≤ 80 dòng. Báo cáo của judge phải được trích lại nguyên văn phần bác bỏ — không được làm mượt.

## Ghi vào CHANGELOG

Mỗi bản phát hành có mục `### Verified`, ghi **cái đã chạy**, không ghi lời hứa:

```markdown
### Verified
- `node test/guard.mjs` pass; `verify:release` cài 0.3.1 từ GitHub: `tools=[i18n_audit] guards=1`.
- Boot `lab`: không có `entry did not activate` (trước khi sửa: `1 entry did not activate`).
- Chưa kiểm: guard chặn được trong phiên chat thật (cần người mở lab).
```

## Không được dùng làm bằng chứng

- "Test pass" mà không có dòng output.
- "Đã kiểm tra" khi chỉ đọc code.
- Ảnh chụp màn hình hoặc video trong workspace này: không có công cụ chụp, và ảnh không kiểm lại được bằng lệnh.
- Kết quả của một lần chạy trước khi sửa code hiện tại.

## Liên quan

- [ARCHITECTURE.md](ARCHITECTURE.md) — row → bundle → cài đặt, và 5 chỗ hay gãy.
- [RUNBOOKS.md](RUNBOOKS.md) — khi có sự cố vận hành thay vì khi phát triển.
- `AGENTS.md` của workspace — Definition of Done + trust ladder.
