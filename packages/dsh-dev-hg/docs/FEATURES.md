# Tính năng — dsh-dev-hg

Nhóm: `dev` · Row id dạng `dev-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `dev-hg-i18n-audit` | Tool `i18n_audit`: quét plugin đã cài — thiếu `locale/`, thiếu `vi.json`, CJK cứng, CJK trong README | done (0.2.0) | Tool hiện trong phiên mới; quét profile thật ra ≥1 plugin; output đúng schema; `node test/smoke.mjs` pass | Bật mặc định: chỉ đọc, thêm 1 tool vào phiên |
| `dev-hg-guard` | Khoá mỗi tool call: chặn đường dẫn bảo vệ, lệnh phá huỷ, secret trong nội dung/lệnh | done (0.3.0) | `node test/guard.mjs` pass; bật bằng patch máy thì câu ghi vào `research/inbox` bị từ chối kèm lý do | **Mặc định tắt** trong package: ảnh hưởng mọi lời gọi tool |
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

## Hợp đồng của `dev-hg-guard`

Chạy **trước** mỗi tool call (`write`, `edit`, `pwsh`, `bash`). Trả về chuỗi = từ chối kèm lý do; `undefined` = cho qua. Không hỏi, không sửa, không hoàn tác.

| Config (row config, tuỳ chọn) | Mặc định | Việc |
|---|---|---|
| `protectedPaths` | `.git/config`, `.git/hooks/**` | Glob đường dẫn bị chặn; **cộng** vào mặc định |
| `denyCommands` | `git push --force` (chừa `--force-with-lease`), `git reset --hard` | Regex trên câu lệnh shell; **cộng** vào mặc định |
| `secretScan` | `true` | Quét `content`/`new_string`/`command` tìm token, private key |
| `secretAllowPaths` | `[]` | Glob bỏ quét secret (fixture, tài liệu mẫu) |
| `disableDefaults` | `false` | Bỏ toàn bộ luật mặc định, chỉ dùng luật khai trong config |

Mỗi entry đường dẫn có thể là chuỗi glob, hoặc `{ pattern, allow?, why? }` — `allow` là glob ngoại lệ (khớp trước), `why` là câu agent nhìn thấy khi bị chặn.

Giới hạn đã biết: chỉ thấy **tool call** (không thấy shell lồng nhau), không chặn được người dùng tự gõ lệnh, và **fail-open** khi guard lỗi nội bộ (có `console.warn`) để không chặn cả phiên. Dùng `disabled: true` để tắt hẳn.

## Ngoại lệ i18n (đang nợ)

Luật: chữ người dùng nhìn thấy phải qua `locale/*.json`. Hiện **hai chỗ chưa theo**, đã ghi nhận thay vì giả vờ đúng:

| Chỗ | Chữ gì | Vì sao chưa nối | Trả nợ khi |
|---|---|---|---|
| `src/tool.js:84–97` | Bảng kết quả render (tiêu đề cột, verdict) | Host-side render hiện dựng chuỗi trực tiếp, `locale/*.json` mới chỉ có `meta.*` | làm row UI đầu tiên (khi có `ctx.locale` dùng được) |
| `src/audit.js:164,181` | Verdict `no-locale`/`no-vi` và nhãn tiếng Việt | là dữ liệu máy đọc, chỉ render mới cần dịch | như trên |

Chữ dành cho model (tool description, mô tả tham số, thông báo lỗi) **cố định tiếng Anh** — không phải nợ.

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp, không dùng `config.features.*` (config bị thay thế wholesale).
- Tool definition là **object thuần** cho `ctx.tools.register()`, không import `defineTool` từ `@deepseek-ai/dsh-tools`: package cài từ git không resolve được package của DSH. Tự validate tham số trong `execute`.
- **Output schema phải là JSON Schema chuẩn**: `required` là **mảng tên field** ở cấp object. Viết `required: true` trên từng property (dialect của `defineTool`) thì DSH từ chối đăng ký và row **không activate** — đúng lỗi đã xảy ra ở 0.2.0, sửa ở 0.3.1.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
- Test: `node test/smoke.mjs` (không cần thư viện; kiểm cả schema output).
