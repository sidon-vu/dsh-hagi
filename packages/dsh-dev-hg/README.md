# dsh-dev-hg

Development and operations for DeepSeek Harness: audit installed plugins, check profile health, snapshot and roll back changes.

Part of [dsh-hagi](../../README.md), group `dev`. One package = one theme; inside, **one row = one feature** you can switch off without removing the package.

## Install

```
plugins → Discover → (add index source) → hg · Dev & Ops
```

or

```powershell
dsh plugin --profile <profile> add "dsh-dev-hg"
```

## Features

- `dev-hg-i18n-audit` — Quét plugin đang cài: chuỗi CJK cứng, thiếu `locale/vi.json`, xuất báo cáo
- `dev-hg-doctor` — So desired state với máy: bundle thiếu, link gãy, version lệch
- `dev-hg-snapshot` — Export/import profile (patch + bundle list), không kèm credentials
- `dev-hg-rollback` — Snapshot trước khi apply, rollback một bước

Full status table: [docs/FEATURES.md](docs/FEATURES.md).

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
dsh-dev-hg/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ index.js            # host entry
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## License

MIT.
