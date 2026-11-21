# AGENTS.md — dsh-hagi

Repo này là marketplace + code plugin. Luật gốc của workspace nằm ở `AGENTS.md` của thư mục workbench (ngoài repo) — file này chỉ nói phần riêng của repo.

## Việc thuộc repo này

- `packages/` — code plugin (package = 1 nhóm chủ đề, row = 1 tính năng).
- `index.json` — sinh bằng script, commit cùng mỗi lần release.
- `workbench/profiles/` — patch bật/tắt tính năng theo từng máy (có lịch sử).
- `docs/` — tracking, quy trình port, chính sách license.

## Không thuộc repo này

Hostname/mật khẩu/`machines.yml` (nằm ngoài repo), bản clone repo người khác, `node_modules`, session DSH, credentials.

## Bất biến

1. **Package name:** `dsh-<nhóm>-hg`. **Row id:** `<nhóm>-hg-<tính năng>`. Row id là hợp đồng — mọi patch máy trỏ vào id, đổi id là mất override.
2. **Một tính năng = một row.** Không gộp; không dùng `config.features.*` (config bị thay thế wholesale, override ở máy khác sẽ phải restate toàn bộ).
3. **Row mới:** còn thử nghiệm thì `disabled: true` trong patch của package; nếu bật mặc định thì ghi **một dòng lý do** trong `docs/FEATURES.md`.
4. **Chữ hiển thị:** người dùng nhìn thấy → `locale/en.json` + `locale/vi.json`; dành cho model (tool/parameter description) → tiếng Anh cố định. Chưa nối được locale thì ghi ngoại lệ ở `docs/FEATURES.md` mục "Ngoại lệ i18n".
5. **`index.json` chỉ do `scripts/build-index.mjs` ghi.** Không sửa tay, không resolve conflict bằng tay — sinh lại.
6. **Version theo package**, tag dạng `<package>/v<semver>`, ví dụ `dsh-dev-hg/v0.2.0`. Một commit có thể bump nhiều package.
7. **Không thêm dependency runtime** nếu không thật cần: package là JS thuần, không build. Có build thì phải commit `dist/` (cài từ git không chạy `prepare`).
8. **Không dùng `workspace:*`** trong `dependencies` của package — cài từ git sẽ hỏng (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`). Code dùng chung thì bundle/inline.

## Khi thêm package mới

1. Copy `packages/_template` → `packages/dsh-<nhóm>-hg`.
2. Đổi `name`, `description`, `dsh.market`, title/description trong `locale/*.json`, sửa `icon.svg`.
3. Thêm 1 row vào `cordis.patch.yml` + 1 file source; cập nhật `docs/FEATURES.md`.
4. Thêm dòng vào [docs/TRACKING.md](docs/TRACKING.md) và `research/GROUPS.md` (ngoài repo).
5. Đảm bảo `engines.dsh` đúng với bản DSH đang chạy.

## Khi release

1. `packages/<pkg>/docs/FEATURES.md`: trạng thái `done`.
2. Thêm mục vào [CHANGELOG.md](CHANGELOG.md) dưới package đó: Added/Changed/Fixed/Verified/Known limits.
3. Bump `version` trong `packages/<pkg>/package.json` (semver thật, không `-rc` trừ khi cần).
4. `git tag <pkg>/v<version>`.
5. `node scripts/build-index.mjs` (script tự kiểm tra tag khớp version và validate).
6. Commit `index.json` + `CHANGELOG.md`, push kèm tags.

## Kiểm tra trước khi báo xong

Chạy đủ mục **Definition of Done** trong `AGENTS.md` của workbench (ngoài repo). Chọn bộ kiểm theo bảng trong [docs/VERIFY.md](docs/VERIFY.md); tối thiểu:

- [ ] `pnpm index:check` không báo lệch.
- [ ] `pnpm check:docs` pass (≤ 200 dòng, không link gãy).
- [ ] `pnpm verify:release` pass (cài được từ GitHub + row resolve được).
- [ ] **Mount thật trong `lab`** (bắt buộc với row đăng ký tool/slot/service): `dsh --profile lab --no-open --port 0` rồi xác nhận **không** có `warning: … entry did not activate`. `verify:release` không thay được bước này vì nó dùng `ctx` giả.
- [ ] `node packages/<pkg>/test/smoke.mjs` pass (nếu package có test).
- [ ] Không có file `node_modules`/`dist` bất ngờ, không có secret trong diff.
- [ ] `docs/TRACKING.md`, `docs/FEATURES.md`, `CHANGELOG.md` khớp thực tế.
- [ ] Row id mới không trùng, đúng prefix nhóm.
- [ ] Gặp sự cố vận hành: theo [docs/RUNBOOKS.md](docs/RUNBOOKS.md), không tự nghĩ quy trình mới.
