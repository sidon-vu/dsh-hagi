# packages/ — một thư mục = một bundle package

| Thư mục | Package | Nhóm | Trạng thái |
|---|---|---|---|
| `dsh-dev-hg` | dsh-dev-hg | dev | skeleton |
| `dsh-session-hg` | dsh-session-hg | session | skeleton |
| `dsh-ui-hg` | dsh-ui-hg | interface | skeleton |
| `_template` | dsh-template-hg (private) | — | mẫu copy |

## Cấu trúc một package

```
dsh-<nhóm>-hg/
├─ package.json          # name, version, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml      # insert các row (mỗi row = 1 tính năng, id <nhóm>-hg-<tên>)
├─ index.js              # entry Host: export apply(ctx)
├─ src/                  # source từng tính năng (thêm khi có feature thật)
├─ locale/en.json        # meta.title / meta.description (+ vi.json)
├─ locale/vi.json
├─ icon.svg
└─ docs/FEATURES.md      # bảng tính năng của package này
```

## Tạo package mới

```powershell
Copy-Item -Recurse packages/_template packages/dsh-<nhóm>-hg
```

Rồi sửa: `name`, `description`, `dsh.market.category`, title/description trong `locale/*.json`, `icon.svg`, và thay row `template-hg-boot` bằng row thật.

## Luật

- Package name `dsh-<nhóm>-hg`; row id `<nhóm>-hg-<tính năng>`. Không đổi row id đã phát hành.
- `_template` **không** được có trong `index.json` (nó `private: true` và `listedByDefault: false`).
- Không import package khác bằng `workspace:*` (cài từ git sẽ hỏng) — code dùng chung thì inline.
- Package là JS thuần, không build. Nếu buộc phải build thì commit `dist/` và trỏ `exports` vào đó.
