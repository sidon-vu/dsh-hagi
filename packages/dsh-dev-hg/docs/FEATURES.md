# Tính năng — dsh-dev-hg

Nhóm: `dev` · Row id dạng `dev-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `dev-hg-i18n-audit` | Tool `i18n_audit`: quét plugin đã cài — thiếu `locale/`, thiếu `vi.json`, CJK cứng, CJK trong README | done (0.2.0) | Tool hiện trong phiên mới; quét profile thật ra ≥1 plugin; output đúng schema; `node test/smoke.mjs` pass | Bật mặc định: chỉ đọc, thêm 1 tool vào phiên |
| `dev-hg-boot` | Row rỗng giữ bundle cài được | dropped (0.2.0) | — | Xoá khi có tính năng thật |
| `dev-hg-doctor` | So desired state (`workbench/profiles/<máy>/`) với máy: bundle thiếu, link gãy, version lệch, row tắt nhầm | planned | Chạy trên 1 máy thật, báo đúng ≥1 lệch đã biết; không ghi gì ngoài báo cáo | Đọc `pluginManager.listBundles` nếu có |
| `dev-hg-snapshot` | Export/import profile (patch + bundle list), không kèm credentials | planned | Export → xoá patch → import → profile chạy lại; file không chứa secret (grep) | |
| `dev-hg-rollback` | Snapshot trước khi apply, rollback một bước | planned | Apply thay đổi → rollback → trạng thái cũ; có test | Phụ thuộc snapshot |

## Hợp đồng của `dev-hg-i18n-audit`

- Tool name: `i18n_audit` (snake_case, cùng quy ước `todo_write`, `working_directory`).
- Tham số: `target` (string, tuỳ chọn — thư mục package, hoặc thư mục chứa `packages/*`), `limit` (integer 1–100, mặc định 20).
- Không có `target` → quét plugin đã cài trong profile đang chạy (`DSH_PROFILE_DIR`).
- Kết quả: `scope`, `scanned`, `summary{missingLocale,missingVi,hasVi}`, `packages[]` (worst-first: `no-locale` → `no-vi` → `has-vi`, rồi CJK giảm dần), `truncated`.
- Không ghi file, không đổi state. Muốn lưu báo cáo thì agent tự ghi `ANALYSIS.md`.
- Chuỗi CJK **trong comment bị bỏ qua**; `dist/` bị bỏ qua khi có `src/`.

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp, không dùng `config.features.*` (config bị thay thế wholesale).
- Tool definition là **object thuần** cho `ctx.tools.register()`, không import `defineTool` từ `@deepseek-ai/dsh-tools`: package cài từ git không resolve được package của DSH. Tự validate tham số trong `execute`.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
- Test: `node test/smoke.mjs` (không cần thư viện; kiểm cả schema output).
