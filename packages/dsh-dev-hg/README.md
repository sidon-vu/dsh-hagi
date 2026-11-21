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

### `dev-hg-guard` — rules as code (0.3.0)

Runs before every `write`, `edit`, `pwsh` and `bash` call and refuses the call with a reason: protected paths, history-destroying commands, secrets in file content or command lines. **Off by default** — a bundle that touches every tool call must be opted in.

| Config | Default | Effect |
|---|---|---|
| `protectedPaths` | `.git/config`, `.git/hooks/**` | globs to block, appended to the defaults; entries may carry `allow` globs and a `why` |
| `denyCommands` | `git push --force`, `git reset --hard` | regexes on shell commands, appended to the defaults |
| `secretScan` | `true` | scan written content and commands for tokens / private keys |
| `secretAllowPaths` | `[]` | globs where the secret scan is skipped |
| `disableDefaults` | `false` | drop the built-in rules, keep only your config |

Enable it for this workspace by copying the `dev-hg-guard` block from `workbench/profiles/_example/cordis.patch.yml` into your profile patch.

Limits: it sees tool calls only (not nested shell), it cannot ask for confirmation, and it fails open on an internal error so a bug never blocks a whole session.

### `profile_doctor` — desired state vs machine (0.4.0)

A read-only agent tool. It compares a profile with the patch that machine is supposed to have and reports drift, worst first:

- dependencies that are declared but **unavailable** — missing `node_modules` entry, or a `link:` / `file:` target that no longer exists,
- bundles **DSH itself refuses** (unreadable files, incompatible `engines.dsh`),
- rows the profile patch keeps **disabled although the desired patch enables them**, rows nothing declares any more,
- optionally, live rows no patch on the machine mentions.

Parameters: `profile` (default: the running profile), `desired` (path to `workbench/profiles/<machine>/cordis.patch.yml`), `includeUndeclared`, `limit` (1–200, default 50).

```text
Lệch trạng thái — C:\Users\me\.dsh\profiles\lab
desired: workbench/profiles/wHAGI/cordis.patch.yml
3 bundle khai · 4 row mong muốn · 2 lệch

[row-unknown] dev-hg-guard — không patch nào trên máy khai row này
[row-disabled] dev-hg-doctor — patch của máy đang tắt row này
```

It only reports — it never writes or fixes. When DSH's own plugin manager is available it also asks it, so "row not live" reflects what actually loaded.

Full status table and design notes: [docs/FEATURES.md](docs/FEATURES.md).

Planned rows: `dev-hg-snapshot` (export/import a profile without credentials), `dev-hg-rollback` (undo one step).

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
dsh-dev-hg/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ src/audit.js        # pure scanning logic (i18n_audit)
├─ src/tool.js         # plugin entry: registers the i18n_audit tool
├─ src/doctor.js       # pure drift checks (profile_doctor)
├─ src/doctor-tool.js  # plugin entry: registers the profile_doctor tool
├─ test/smoke.mjs      # node test/smoke.mjs — no framework
├─ test/doctor.mjs     # node test/doctor.mjs — no framework
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## Switch it off

In your profile patch — the package stays installed, the tool disappears:

```yaml
- id: dev-hg-i18n-audit
  disabled: true
- id: dev-hg-doctor
  disabled: true
```

## License

MIT.
