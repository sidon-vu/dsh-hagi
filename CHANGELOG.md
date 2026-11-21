# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/), version SemVer **theo từng package**.
Mỗi mục ghi tên package + version + commit/tag tương ứng. `index.json` là hệ quả của mục mới nhất, không phải nguồn.

## [Unreleased]

### Added
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
- `dsh-dev-hg`: `dev-hg-doctor`, `dev-hg-snapshot`, `dev-hg-rollback`
- `dsh-session-hg`: `session-hg-context-panel`, `session-hg-archive`, `session-hg-rewind`
- `dsh-ui-hg`: `ui-hg-statusbar`, `ui-hg-locale-switch`, `ui-hg-density`

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
- `index.json` format 1 (3 bundle, validate bằng `parseMarketIndex`), `scripts/build-index.mjs`, `docs/TRACKING.md`, `docs/PORTING.md`, `docs/LICENSE-POLICY.md`, `workbench/profiles/_example/`.
