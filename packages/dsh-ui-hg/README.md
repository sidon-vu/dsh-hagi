# dsh-ui-hg

Interface additions for DeepSeek Harness: a multi-machine status bar, a language switch for hg plugins, and display density.

Part of [dsh-hagi](../../README.md), group `interface`. One package = one theme; inside, **one row = one feature** you can switch off without removing the package.

## Install

```
plugins → Discover → (add index source) → hg · UI & Experience
```

or

```powershell
dsh plugin --profile <profile> add "dsh-ui-hg"
```

## Features

- `ui-hg-statusbar` — Status bar đa máy: máy hiện tại, profile, plugin lệch
- `ui-hg-locale-switch` — Chuyển EN/VI cho chuỗi của các plugin hg
- `ui-hg-density` — Mật độ hiển thị compact/normal

Full status table: [docs/FEATURES.md](docs/FEATURES.md).

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
dsh-ui-hg/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ index.js            # host entry
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## License

MIT.
