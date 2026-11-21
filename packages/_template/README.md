# dsh-template-hg

Internal template: copy this directory to start a new hg plugin package.

Part of [dsh-hagi](../../README.md), group `dev`. One package = one theme; inside, **one row = one feature** you can switch off without removing the package.

## Install

```
plugins → Discover → (add index source) → hg · Plugin template
```

or

```powershell
dsh plugin --profile <profile> add "dsh-template-hg"
```

## Features

- `template-hg-example` — Row ví dụ — xoá khi copy

Full status table: [docs/FEATURES.md](docs/FEATURES.md).

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
_template/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ index.js            # host entry
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## License

MIT.

> Template package: copy this directory to `packages/dsh-<group>-hg` and replace the name, icon, locale strings and the `template-hg-boot` row.
