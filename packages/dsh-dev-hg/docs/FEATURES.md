# Tính năng — dsh-dev-hg

Nhóm: `dev` · Row id dạng `dev-hg-<tính năng>` (không đổi tên đã phát hành).
Bảng tổng: [TRACKING.md](../../../docs/TRACKING.md). Kiến trúc: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Port: [PORTING.md](../../../docs/PORTING.md).

| Row id | Tính năng | Trạng thái | Done when | Ghi chú |
|---|---|---|---|---|
| `dev-hg-i18n-audit` | Tool `i18n_audit`: quét plugin đã cài — thiếu `locale/`, thiếu `vi.json`, CJK cứng, CJK trong README | done (0.2.0) | Tool hiện trong phiên mới; quét profile thật ra ≥1 plugin; output đúng schema; `node test/smoke.mjs` pass | Bật mặc định: chỉ đọc, thêm 1 tool vào phiên |
| `dev-hg-guard` | Khoá mỗi tool call: chặn đường dẫn bảo vệ, lệnh phá huỷ, secret trong nội dung/lệnh | done (0.3.0) | `node test/guard.mjs` pass; bật bằng patch máy thì câu ghi vào `research/inbox` bị từ chối kèm lý do | **Mặc định tắt** trong package: ảnh hưởng mọi lời gọi tool |
| `dev-hg-boot` | Row rỗng giữ bundle cài được | dropped (0.2.0) | — | Xoá khi có tính năng thật |
| `dev-hg-doctor` | Tool `profile_doctor`: so desired state (`control/profiles/<máy>/`) với máy: bundle thiếu, link gãy, version lệch, row tắt nhầm | done (0.4.0) | `node test/doctor.mjs` pass; chạy trên profile thật báo đúng lệch đã biết; `verify:release` + boot `lab` sạch; không ghi file | Bật mặc định: chỉ đọc, thêm 1 tool vào phiên |
| `dev-hg-snapshot` | Tool `profile_snapshot`: export/import profile (patch + bundle list), không kèm credentials | done (0.5.0) | `node test/snapshot.mjs` pass; export → xoá patch → import → file quay lại; manifest serialise không chứa `ghp_`/`sk-`; `verify:release` + boot `lab` sạch | Bật mặc định: export chỉ đọc, import bắt buộc `confirm` |
| `dev-hg-rollback` | Snapshot trước khi apply, rollback một bước | done (0.6.0) | Apply thay đổi → rollback → trạng thái cũ; có test | Phụ thuộc snapshot |

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

## Hợp đồng của `dev-hg-doctor`

Tool name: `profile_doctor`. Chỉ đọc: **không ghi file, không sửa patch, không đổi state**. Trả về danh sách lệch để agent tự quyết.

| Tham số | Kiểu | Việc |
|---|---|---|
| `profile` | string tuỳ chọn | Thư mục profile cần soi; mặc định `DSH_PROFILE_DIR` |
| `desired` | string tuỳ chọn | Patch mong muốn (`control/profiles/<máy>/cordis.patch.yml`); không có thì chỉ kiểm cấu trúc |
| `includeUndeclared` | boolean tuỳ chọn | Kể cả row đang sống mà không patch máy nào khai (ồn hơn) |
| `limit` | integer 1–200, mặc định 50 | Cắt số finding, lệch trước thông tin |

`kind` có thể trả: `profile-missing`, `desired-missing`, `link-missing` (đích `link:`/`file:` không tồn tại), `bundle-missing` (khai mà không dùng được), `bundle-error`, `version-incompatible`, `version-mismatch`, `row-disabled` (patch máy đang tắt row mà desired bật), `row-not-live` (khai nhưng DSH không nạp entry), `row-unknown` (không patch nào trên máy khai), `row-undeclared` (severity `info`).

Nguồn dữ liệu: đĩa (manifest profile, `node_modules`, các lớp patch) là **đủ để chạy**; `ctx.pluginManager.listBundles()` là nguồn phán quyết của chính DSH (`availability`, `error`, `entryId`) và **không nằm trong `inject`** — thiếu service thì row vẫn activate, chỉ mất phần kiểm row sống. Dùng `disabled: true` để tắt hẳn.

Giới hạn đã biết: parser patch là phẳng (chỉ `id` + `disabled` của entry, bỏ `disabled:` lồng trong `config`); trên đĩa chỉ đọc patch của dependency do profile khai (patch của bundle do bản cài cung cấp nằm ngoài profile nên phải có `pluginManager` mới thấy); không tự suy ra "đúng patch nào cho máy nào" nên phải truyền `desired`; nó báo lệch, không sửa.

## Hợp đồng của `dev-hg-snapshot`

Tool name: `profile_snapshot`. Một file manifest JSON duy nhất — copy sang máy khác được, đặt vào git được, **không chứa credentials**.

| Tham số | Kiểu | Việc |
|---|---|---|
| `action` | `export` \| `import` (bắt buộc) | export: profile → manifest; import: manifest → profile |
| `profile` | string, tuỳ chọn | export: thư mục profile đọc; mặc định `DSH_PROFILE_DIR` |
| `out` | string, tuỳ chọn | export: đường dẫn manifest ghi ra; mặc định `<profile>/snapshot.json` |
| `source` | string, bắt buộc khi import | file manifest đọc vào |
| `target` | string, bắt buộc khi import | thư mục profile ghi ra |
| `force` | boolean, mặc định `false` | import: ghi đè file đã tồn tại; mặc định skip |
| `confirm` | boolean, mặc định `false` | import: thật sự ghi; không truyền thì chỉ dry-run |

**Export** gói `package.json` (chỉ field `name`/`private`/`dependencies`/`devDependencies`/`dsh`), danh sách bundle `name + spec + version` (đọc `node_modules/<name>/package.json`), và mọi file `.yml`/`.yaml`/`.txt`/`.json` ở gốc profile **trừ** `package.json`, lock file, tên chứa `credential/secret/token/key/pem/password/.env`, và file có nội dung khớp private key / `ghp_` / `sk-`. **`node_modules` không bao giờ được gói** — chỉ có `spec` để cài lại.

**Import** mặc định là dry-run (chỉ liệt kê file sẽ ghi); `confirm: true` mới ghi. Ghi `package.json` (deps dựng lại từ `snapshot.bundles`, không mang field lạ) + `cordis.patch.yml` + các file cấu hình đã gói; **không chạy install** — trả `needsInstall[]` để agent tự `dsh plugin add` từng spec. File đã có và không `force` thì `skipped[]`.

Giới hạn đã biết: spec `link:`/`file:` trong manifest trỏ đường dẫn tuyệt đối của máy gốc — import máy khác phải sửa lại spec trước khi `dsh plugin add`; không gói `node_modules` nên cài lại là bắt buộc; không gói file ẩn (`.credentials.yaml` bị loại theo luật tên nhạy cảm); chặn secret theo pattern mạnh nhưng không phải máy quét toàn diện — đừng gói profile có secret ở chỗ tool không nhìn (ví dụ trong `dsh` config lồng nhau không nằm mẫu quét).

## Hợp đồng của `dev-hg-rollback`

Tool name: `profile_rollback`. Undo một bước cho profile — history nằm ở
`<profile>/rollback-history.json` (giữ tối đa `limit` snapshot, mặc định 5).

| Tham số | Kiểu | Việc |
|---|---|---|
| `action` | `save` \| `restore` \| `clear` (bắt buộc) | save: chụp profile vào history (gọi TRƯỚC khi đổi). restore: về snapshot gần nhất. clear: xoá history. |
| `profile` | string, tuỳ chọn | thư mục profile; mặc định `DSH_PROFILE_DIR` |
| `limit` | integer 1–50, mặc định 5 | số snapshot tối đa giữ |
| `confirm` | boolean, mặc định `false` | restore/clear: thật sự ghi; mặc định dry-run |

- Snapshot dùng `exportProfile`/`importProfile` của `dev-hg-snapshot` → restore
  **không chạy install**; `needsInstall[]` trả về để agent tự `dsh plugin add`.
- `rollback-history.json` bị loại khỏi `files` của mỗi snapshot — nếu không,
  restore sẽ đè history hiện tại bằng bản cũ.
- Pop khỏi history chỉ xảy ra **sau** khi ghi thành công; file history hỏng
  hoặc chứa snapshot `format` lạ → coi như rỗng, không restore nhầm.
- File mới tạo sau checkpoint **không bị xoá** khi restore (import chỉ ghi đè
  file trong snapshot) — giới hạn đã biết.
- Bật mặc định: `save` chỉ ghi 1 file trong profile, `restore` bắt buộc `confirm`.

## Ngoại lệ i18n (đang nợ)

Luật: chữ người dùng nhìn thấy phải qua `locale/*.json`. Hiện **hai chỗ chưa theo**, đã ghi nhận thay vì giả vờ đúng:

| Chỗ | Chữ gì | Vì sao chưa nối | Trả nợ khi |
|---|---|---|---|
| `src/tool.js:84–97` | Bảng kết quả render (tiêu đề cột, verdict) | Host-side render hiện dựng chuỗi trực tiếp, `locale/*.json` mới chỉ có `meta.*` | làm row UI đầu tiên (khi có `ctx.locale` dùng được) |
| `src/doctor-tool.js:102–112` | Tiêu đề + dòng finding của `profile_doctor` | cùng lý do | như trên |
| `src/rollback-tool.js` render | Dòng kết quả `profile_rollback` | cùng lý do | như trên |
| `src/audit.js:164,181` | Verdict `no-locale`/`no-vi` và nhãn tiếng Việt | là dữ liệu máy đọc, chỉ render mới cần dịch | như trên |

Chữ dành cho model (tool description, mô tả tham số, thông báo lỗi) **cố định tiếng Anh** — không phải nợ.

## Ghi chú thiết kế

- **Một tính năng = một row.** Không gộp, không dùng `config.features.*` (config bị thay thế wholesale).
- Tool definition là **object thuần** cho `ctx.tools.register()`, không import `defineTool` từ `@deepseek-ai/dsh-tools`: package cài từ git không resolve được package của DSH. Tự validate tham số trong `execute`.
- **Output schema phải là JSON Schema chuẩn**: `required` là **mảng tên field** ở cấp object. Viết `required: true` trên từng property (dialect của `defineTool`) thì DSH từ chối đăng ký và row **không activate** — đúng lỗi đã xảy ra ở 0.2.0, sửa ở 0.3.1.
- Chuỗi hiển thị: thêm key vào `locale/en.json` và `locale/vi.json` cùng lúc.
- Test: `node test/smoke.mjs` (i18n_audit), `node test/doctor.mjs` (profile_doctor) — không cần thư viện; kiểm cả schema output.
- Row đọc máy thì tách đôi như i18n: logic thuần ở `src/doctor.js` (test được bằng fixture), entry/tool ở `src/doctor-tool.js`. Service của DSH lấy qua `ctx` chứ không import.
