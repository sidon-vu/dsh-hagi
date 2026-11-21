# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/), version SemVer **theo từng package**.
Mỗi mục ghi tên package + version + commit/tag tương ứng. `index.json` là hệ quả của mục mới nhất, không phải nguồn.

## dsh-dev-hg 0.4.0 — 2026-11-21

Tag `dsh-dev-hg/v0.4.0`

### Added
- Row `dev-hg-doctor` + tool `profile_doctor`: so trạng thái mong muốn của máy (patch trong `control/profiles/<máy>/`) với trạng thái thật — `link:`/`file:` gãy, dependency khai mà không dùng được, bundle DSH từ chối, version lệch, row bị tắt nhầm, row không còn ai khai. Chỉ đọc.
- `src/doctor.js` (logic thuần), `src/doctor-tool.js` (entry + tool), `test/doctor.mjs` (30+ assertion, mỗi loại lệch một ca).
- Dùng `ctx.pluginManager.listBundles()` khi có (`availability`, `error`, `entryId`) nhưng **không** đưa vào `inject`: thiếu service thì row vẫn activate và lùi về đọc đĩa.

### Verified
- `node test/doctor.mjs` pass (`ok: doctor — 30+ assertion, tất cả pass`); `test/smoke.mjs`, `test/guard.mjs` vẫn pass.
- Chạy trên máy thật (profile `desktop`, `desired` = `control/profiles/_example/cordis.patch.yml`): 2 lệch đúng — `row-unknown` cho `dev-hg-guard`, `dev-hg-doctor` (bản cài trên desktop còn 0.1.0, không khai hai row này).
- `pnpm check:docs` pass; `dsh --profile lab --dump-config` ghép row `dev-hg-doctor` trỏ `src/doctor-tool.js`.
- Boot `lab`: có URL, **0** `did not activate`.
- `verify:release`: 3/3 package cài từ GitHub ok.

### Known limits
- Chưa gọi `profile_doctor` trong một phiên chat thật (mới chứng minh register + boot + chạy CLI trên profile thật).
- Parsing patch là phẳng: chỉ `id` + `disabled` của entry, bỏ `disabled:` lồng trong `config`; không tự suy ra patch nào thuộc máy nào nên phải truyền `desired`.
- Render của tool còn tiếng Việt cứng (nợ i18n, xem `docs/FEATURES.md`).

## dsh-dev-hg 0.5.0 — 2026-11-21

Tag `dsh-dev-hg/v0.5.0`

### Added
- Row `dev-hg-snapshot` + tool `profile_snapshot`: export một profile thành manifest JSON (`name`, `bundles[]` với `spec` + `version` đọc từ `node_modules`, `files` chứa `cordis.patch.yml` và config rời) và import dựng lại thư mục profile. Manifest **không chứa credentials**: tên file khớp `credential|secret|token|*.key|*.pem|password|passwd|.env` hoặc nội dung khớp private key/`ghp_`/`sk-` bị loại. Import mặc định **dry-run**, phải `confirm: true` mới ghi; `force` để ghi đè. Không tự `dsh plugin add` — trả `needsInstall[]` để agent làm.
- `src/snapshot.js` (logic thuần, không import DSH), `src/snapshot-tool.js` (entry + tool), `test/snapshot.mjs` (35+ assertion: export→xoá patch→import→khôi phục, secret bị loại, dry-run/confirm/force, args validation).

### Verified
- `node test/snapshot.mjs` pass (`ok: snapshot — 35+ assertion, tất cả pass`); `smoke`/`guard`/`doctor` vẫn pass.
- `pnpm check:docs` pass; `pnpm index:check` khớp sau khi tag.
- Boot `lab` (link `dsh-dev-hg` → source mới): URL có, **0** `did not activate`; `dump-config` ghép `dev-hg-snapshot → src/snapshot-tool.js`.
- `pnpm verify:release`: cài `dsh-dev-hg@0.5.0` từ GitHub (commit `9160b50`), đăng ký `tools=[i18n_audit,profile_doctor,profile_snapshot] guards=1`.

### Changed
- `scripts/verify-release.mjs`: chấp nhận `PNPM_SCRIPT` (đường dẫn `pnpm.mjs` bundled) — cần khi máy không có `pnpm` trên PATH; lệnh add vẫn chạy `pnpm add <spec>` y hệt.

### Known limits
- `link:`/`file:` trong manifest giữ spec nguyên bản — import trên máy khác phải sửa spec trước khi `dsh plugin add`.
- Chặn secret theo pattern mạnh nhưng không phải máy quét toàn diện; file nhạy cảm ở thư mục con (ngoài root) không được gói và cũng không được quét.

## [Unreleased]

### Changed
- Đổi tên `workbench/` → `control/` (trong repo) vì trùng tên với thư mục làm việc `dsh-workbench/`. Không đổi nội dung, chỉ đổi đường dẫn; 21 file được cập nhật tham chiếu, `control/README.md` giải thích rõ hai thư mục.

### Added
- `PLUGINS.md`: danh sách plugin theo chủ đề, mục đích, package, giai đoạn — tầng "biết có gì" trước khi vào chi tiết.
- `packages/<pkg>/AGENTS.md` cho cả 3 package: giai đoạn, row, việc kế tiếp, chặn, luật riêng. Không nằm trong `files` nên không phát hành.
- `control/rules/`: quy trình dùng chung có lịch sử — `context-budget.md`, `sessions.md` (vùng sở hữu + chống xung đột), `process-changes.md` (cách áp một quy trình mới).
- Mục "Phiên theo plugin (chống xung đột)" trong `AGENTS.md`; cột **Giai đoạn** trong `docs/TRACKING.md`.
- Mục **Ngân sách context** trong luật user-level (`control/user/AGENTS.user.md`) và trong `AGENTS.md` của repo: đọc `read` thay `Get-Content`, không grep trong `app.asar`, chia việc > ~15 tool call.
- `HANDOFF.md` (repo): version đang phát hành, việc kế tiếp, nợ kỹ thuật, nhịp release — để phiên mới biết dừng ở đâu mà không cần đọc lại hội thoại cũ.
- `control/user/skills/`: hai skill học từ lỗi thật, bản chuẩn có lịch sử (`dsh-plain-tool-definition`, `foreign-repo-quarantine`); cài vào `~/.dsh/skills/` để DSH tự nạp.
- `docs/CAPABILITIES.md`: tool/script/môi trường đang thật sự có, mỗi dòng kèm lệnh kiểm, và danh sách "không có".
- `docs/VERIFY.md`: bằng chứng bắt buộc theo loại thay đổi (docs / policy / row host / release / patch profile / port), lệnh chuẩn, khi nào gọi judge, mẫu mục `### Verified`, và những gì không được dùng làm bằng chứng.
- Mục **Mức tự chủ (trust ladder)** trong `AGENTS.md`: bậc 0–4, điều kiện vào bậc, tự hạ bậc khi hỏng, và không có bậc 5.
- `control/user/AGENTS.user.md`: bản chuẩn có lịch sử của `~/.dsh/AGENTS.md` — luật user-level cho mọi phiên DSH (tiếng Việt, an toàn, precedence, bảng "công cụ nào đọc file nào", chỗ lưu skill tự học).
- RB-1 bước 3: máy mới phải copy file user-level trước khi dùng.
- `scripts/check-docs.mjs` (`pnpm check:docs`): mọi `.md` ≤ 200 dòng, link tương đối không gãy.
- `scripts/verify-release.mjs` (`pnpm verify:release`): cài từng plugin trong `index.json` từ GitHub vào thư mục tạm, kiểm file, resolve row, gọi `apply()`.
- `docs/RUNBOOKS.md`: RB-1 dựng máy mới, RB-2 cập nhật/rollback bundle, RB-3 DSH không boot sau khi cài plugin.
- `docs/ARCHITECTURE.md`: row → bundle → ba đường cài, thứ tự ghép profile, marketplace, chỗ hay gãy, và bảng quyết định tài liệu (có/không có PRD, RULES, TASKS, PROGRESS).
- `packages/dsh-ui-hg/docs/DESIGN.md`: luật UI (token, slot, locale, 4 trạng thái, checklist).
- Cột **Done when** trong `docs/FEATURES.md` của cả 4 package.
- Dòng `wip:` trong `TRACKING.md` làm nơi ghi tiến độ đang làm (thay cho `PROGRESS.md` riêng).
- `CHANGELOG.md` (file này); bước release bắt buộc cập nhật.

### Changed
- `docs/PORTING.md`: thêm checklist thăng cấp `lab → desktop` và quy tắc "slice đầu tiên phải cài được và dùng được".
- `AGENTS.md`: thêm Definition of Done + bước CHANGELOG trong release.

### Planned
- `dsh-dev-hg`: `dev-hg-rollback`
- `dsh-session-hg`: `session-hg-context-panel`, `session-hg-archive`, `session-hg-rewind`
- `dsh-ui-hg`: `ui-hg-statusbar`, `ui-hg-locale-switch`, `ui-hg-density`

## dsh-dev-hg 0.3.1 — 2026-11-21

Tag `dsh-dev-hg/v0.3.1`

### Fixed
- **`i18n_audit` chưa bao giờ activate trong DSH** (từ 0.2.0): output schema dùng `required: true` trên từng property — đó là dialect của `defineTool`, còn đăng ký trực tiếp cần mảng `required: [...]` chuẩn JSON Schema. DSH từ chối: *"unsupported JSON schema … required is not supported on type string"*.
- `test/smoke.mjs` đã chấp nhận chính dialect sai đó nên không bắt được. Nay kiểm theo chuẩn **và** có assertion cấm `required: true` trên property.

### Verified
- Profile `lab` boot trước khi sửa: `dsh: warning: 1 entry did not activate (dev-hg-i18n-audit …)`.
- Sau khi sửa: boot lại không còn cảnh báo; cả 2 row (`i18n-audit`, `guard`) activate.

### Known limits
- `pnpm verify:release` **không** bắt được lớp lỗi này: nó thay `ctx.tools.register` bằng hàm giả nên bỏ qua bước validate schema của DSH. Chỉ mount thật trong `lab` mới lộ.

## dsh-dev-hg 0.3.0 — 2026-11-21

Tag `dsh-dev-hg/v0.3.0`

### Added
- Row `dev-hg-guard` (mặc định **tắt**): khoá chạy trước mỗi `write`/`edit`/`pwsh`/`bash`, từ chối kèm lý do.
- Config-driven: `protectedPaths` (+ `allow`/`why`), `denyCommands` (regex), `secretScan`, `secretAllowPaths`, `disableDefaults`. Config **cộng** vào luật mặc định.
- Luật mặc định: `.git/config`, `.git/hooks/**`, `git push --force` (chừa `--force-with-lease`), `git reset --hard`, 6 mẫu secret (GitHub/AWS/Slack token, `sk-`, private key).
- `test/guard.mjs`: 30+ assertion, gồm config rác, đường dẫn Windows `\`, fail-open.

### Changed
- `control/profiles/_example/cordis.patch.yml`: bật guard + khai luật riêng của workspace (`research/inbox/**` với 3 ngoại lệ, `dsh-hagi/index.json`, chặn `git tag -d`).
- `scripts.test` chạy cả hai bộ test.

### Verified
- `node test/guard.mjs` và `node test/smoke.mjs` pass.
- Test bắt được 2 lỗi thật trước khi phát hành: `--force-with-lease` bị chặn nhầm (sửa regex), và so khớp hỏng với `\` của Windows (chuẩn hoá đường dẫn).
- `pnpm verify:release` cài bản 0.3.0 từ GitHub, resolve 2 row, `guards=1`.

### Known limits
- Chỉ thấy tool call; không thấy shell lồng nhau, không chặn được người dùng tự gõ lệnh.
- Không "hỏi trước" — chỉ cho qua hoặc từ chối.
- Fail-open khi lỗi nội bộ (có `console.warn`).
- Chưa chạy trong phiên DSH thật: guard mặc định tắt nên phải bật bằng patch mới thấy tác dụng.

## dsh-dev-hg 0.2.0 — 2026-11-21

Tag `dsh-dev-hg/v0.2.0` · commit `8a21a1b`

### Added
- Row `dev-hg-i18n-audit`: tool `i18n_audit` quét lỗ hổng bản địa hoá của plugin đã cài — không có `locale/`, thiếu `vi.json`, số dòng CJK cứng (bỏ comment), tỉ lệ CJK trong README, có UI hay không.
- Tham số `target` (một package, hoặc thư mục chứa `packages/*`) và `limit` (1–100).
- `test/smoke.mjs`: 20+ assertion, tự kiểm output đúng schema đã khai.

### Changed
- Gỡ row `dev-hg-boot` (skeleton không còn cần).
- `package.json`: thêm `src` vào `files`, thêm script `test`.

### Verified
- Cài từ GitHub (`#8a21a1b&path:/packages/dsh-dev-hg`): bản cài tự resolve row `./src/tool.js` và đăng ký tool.
- `parseMarketIndex` của DSH: index hợp lệ, entry pin đúng commit.

### Known limits
- Chưa kiểm mount thật trong DSH (cần cài vào profile và mở session mới).
- Chỉ quét package **của profile**, không quét package do DSH ship kèm.

## dsh-session-hg 0.1.0 — 2026-11-21

Tag `dsh-session-hg/v0.1.0` · commit `4e2c6fd`

### Added
- Skeleton package: row `session-hg-boot` rỗng, `locale/en.json` + `locale/vi.json`, `docs/FEATURES.md` với 3 tính năng dự kiến.

## dsh-ui-hg 0.1.0 — 2026-11-21

Tag `dsh-ui-hg/v0.1.0` · commit `4e2c6fd`

### Added
- Skeleton package: row `ui-hg-boot` rỗng, `locale/en.json` + `locale/vi.json`, `docs/FEATURES.md` với 3 tính năng dự kiến.

## Repo 0.1.0 — 2026-11-21

### Added
- `index.json` format 1 (3 bundle, validate bằng `parseMarketIndex`), `scripts/build-index.mjs`, `docs/TRACKING.md`, `docs/PORTING.md`, `docs/LICENSE-POLICY.md`, `control/profiles/_example/`.
