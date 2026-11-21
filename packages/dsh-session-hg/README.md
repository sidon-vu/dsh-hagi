# dsh-session-hg

Session and context tooling for DeepSeek Harness: inspect context usage, archive and rewind sessions.

Part of [dsh-hagi](../../README.md), group `session`. One package = one theme; inside, **one row = one feature** you can switch off without removing the package.

## Install

```
plugins → Discover → (add index source) → hg · Session & Context
```

or

```powershell
dsh plugin --profile <profile> add "dsh-session-hg"
```

## Features

- `session-hg-context-panel` — Phân rã token/context theo file, tool, lượt
- `session-hg-archive` — Xem và khôi phục session đã archive
- `session-hg-rewind` — Tua về message trước đó trong cửa sổ

Full status table: [docs/FEATURES.md](docs/FEATURES.md).

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
dsh-session-hg/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ index.js            # host entry
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## License

MIT.
