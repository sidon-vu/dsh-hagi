# AGENTS.md — dsh-hagi

Repo này là marketplace + code plugin. Luật gốc của workspace nằm ở [../AGENTS.md](../AGENTS.md) — file này chỉ nói phần riêng của repo.

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
3. **Row mới mặc định tắt** nếu còn thử nghiệm: thêm `disabled: true` vào patch của package, bật ở `workbench/profiles/<máy>/`.
4. **Chuỗi hiển thị đi qua locale**, không hardcode: sửa `locale/en.json` + `locale/vi.json` cùng lúc.
5. **`index.json` chỉ do `scripts/build-index.mjs` ghi.** Không sửa tay, không resolve conflict bằng tay — sinh lại.
6. **Version theo package**, tag dạng `<package>/v<semver>`, ví dụ `dsh-dev-hg/v0.2.0`. Một commit có thể bump nhiều package.
7. **Không thêm dependency runtime** nếu không thật cần: package là JS thuần, không build. Có build thì phải commit `dist/` (cài từ git không chạy `prepare`).
8. **Không dùng `workspace:*`** trong `dependencies` của package — cài từ git sẽ hỏng (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`). Code dùng chung thì bundle/inline.

## Khi thêm package mới

1. Copy `packages/_template` → `packages/dsh-<nhóm>-hg`.
2. Đổi `name`, `description`, `dsh.market`, title/description trong `locale/*.json`, sửa `icon.svg`.
3. Thêm 1 row vào `cordis.patch.yml` + 1 file source; cập nhật `docs/FEATURES.md`.
4. Thêm dòng vào [docs/TRACKING.md](docs/TRACKING.md) và [../research/GROUPS.md](../research/GROUPS.md).
5. Đảm bảo `engines.dsh` đúng với bản DSH đang chạy.

## Khi release

1. `packages/<pkg>/docs/FEATURES.md`: trạng thái `done`.
2. Bump `version` trong `packages/<pkg>/package.json` (semver thật, không `-rc` trừ khi cần).
3. `git tag <pkg>/v<version>`.
4. `node scripts/build-index.mjs` (script tự kiểm tra tag khớp version và validate).
5. Commit `index.json`, push kèm tags.

## Kiểm tra trước khi báo xong

- [ ] `node scripts/build-index.mjs --check` không báo lệch.
- [ ] Không có file `node_modules`/`dist` bất ngờ, không có secret trong diff.
- [ ] `docs/TRACKING.md` và `docs/FEATURES.md` khớp thực tế.
- [ ] Row id mới không trùng, đúng prefix nhóm.
