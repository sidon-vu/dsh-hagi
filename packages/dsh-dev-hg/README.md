# dsh-dev-hg

Development and operations for DeepSeek Harness: audit installed plugins, check profile health, snapshot and roll back changes.

Part of [dsh-hagi](../../README.md), group `dev`. One package = one theme; inside, **one row = one feature** you can switch off without removing the package.

## Install

From the marketplace: **Plugins → Discover → hg · Dev & Ops → Install**.

Or:

```powershell
dsh plugin --profile <profile> add "github:sidon-vu/dsh-hagi#dsh-dev-hg/v0.2.0&path:/packages/dsh-dev-hg"
```

## Features

### `i18n_audit` — localization coverage audit (0.2.0)

A read-only agent tool. It scans plugin packages and reports, worst first:

- packages with **no `locale/` files at all** (strings hardcoded),
- packages with locales but **no `vi.json`**,
- how many **non-comment source lines contain CJK characters**, and how much of the README is CJK,
- whether the package renders UI (`dsh.client`).

Parameters: `target` (optional absolute directory — one package, or a folder containing `packages/*`), `limit` (1–100, default 20). Without `target` it audits the plugins installed in the running profile.

```text
plugin@version              verdict          cjk lines  locales
dsh-config-manager@0.10.0   không có locale  71944      —
dsh-context@0.86.0 (UI)     thiếu vi         1453       de,en,es,fr,ja,pt,ru,zh
```

Full status table and design notes: [docs/FEATURES.md](docs/FEATURES.md).

Planned rows: `dev-hg-doctor` (desired state vs machine), `dev-hg-snapshot`, `dev-hg-rollback`.

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
dsh-dev-hg/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ src/audit.js        # pure scanning logic
├─ src/tool.js         # plugin entry: registers the i18n_audit tool
├─ test/smoke.mjs      # node test/smoke.mjs — no framework
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## Switch it off

In your profile patch — the package stays installed, the tool disappears:

```yaml
- id: dev-hg-i18n-audit
  disabled: true
```

## License

MIT.
