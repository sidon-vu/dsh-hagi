# Tính năng — dsh-dev-hg

Nhóm: `dev` · Row id dạng `dev-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Quy trình port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Config | Ghi chú |
|---|---|---|---|---|
| `dev-hg-i18n-audit` | Tool `i18n_audit`: quét plugin đã cài — thiếu `locale/`, thiếu `vi.json`, số dòng CJK cứng, tỉ lệ CJK trong README | done (0.2.0) | `{}` | Bật mặc định: chỉ đọc, thêm 1 tool vào phiên |
| `dev-hg-boot` | Row rỗng giữ bundle cài được | dropped (0.2.0) | — | Xoá khi có tính năng thật đầu tiên |
| `dev-hg-doctor` | So desired state với máy: bundle thiếu, link gãy, version lệch | planned | — | Đọc `workbench/profiles/<máy>/` |
| `dev-hg-snapshot` | Export/import profile (patch + bundle list), không kèm credentials | planned | — | |
| `dev-hg-rollback` | Snapshot trước khi apply, rollback một bước | planned | — | Phụ thuộc snapshot |

## Hợp đồng của `dev-hg-i18n-audit`

- Tool name: `i18n_audit` (snake_case, cùng quy ước `todo_write`, `working_directory`).
- Tham số: `target` (string, tuỳ chọn — thư mục package, hoặc thư mục chứa `packages/*`), `limit` (integer 1–100, mặc định 20).
- Không có `target` → quét plugin đã cài trong profile đang chạy (`DSH_PROFILE_DIR`).
- Kết quả: `scope`, `scanned`, `summary{missingLocale,missingVi,hasVi}`, `packages[]` (worst-first: `no-locale` → `no-vi` → `has-vi`, rồi CJK giảm dần), `truncated`.
- Không ghi file, không đổi state. Muốn lưu báo cáo thì agent tự ghi `ANALYSIS.md`.
- Chuỗi CJK **trong comment bị bỏ qua** để không thổi phồng con số; `dist/` bị bỏ qua khi có `src/`.

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp nhiều tính năng vào một row và không dùng `config.features.*`, vì `config` bị thay thế wholesale khi một máy override.
- Tool definition là **object thuần** truyền cho `ctx.tools.register()`, không import `defineTool` từ `@deepseek-ai/dsh-tools`: package cài từ git không resolve được package của DSH. Tự validate tham số trong `execute`.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
- Test: `node test/smoke.mjs` (không cần thư viện; kiểm cả schema output).
