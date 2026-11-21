# dsh-hagi

Personal [DeepSeek Harness](https://deepseek.com/harness) plugin marketplace: a monorepo of small plugin packages and the `index.json` catalog that DSH's **Plugins → Discover** tab reads.

> Internal notes are in Vietnamese: [docs/TRACKING.md](docs/TRACKING.md), [docs/PORTING.md](docs/PORTING.md), [docs/LICENSE-POLICY.md](docs/LICENSE-POLICY.md), [AGENTS.md](AGENTS.md).

## Packages

| Package | Group | Status |
|---|---|---|
| [dsh-dev-hg](packages/dsh-dev-hg/README.md) | Development & Ops | skeleton |
| [dsh-session-hg](packages/dsh-session-hg/README.md) | Session & Context | skeleton |
| [dsh-ui-hg](packages/dsh-ui-hg/README.md) | UI & Experience | skeleton |
| [packages/_template](packages/_template/README.md) | — | copy to start a new package |

Each package is one DSH bundle and one marketplace entry. Inside a package, **one row = one feature**, so a feature can be switched off per machine without removing the package.

## Install from this marketplace

Once this repo is public, add one index source in DSH:

**Plugins → Discover → Add index source** →

```
https://raw.githubusercontent.com/sidon-vu/dsh-hagi/main/index.json
```

Then install any listed plugin with one click. Each entry pins a git commit, so installs are reproducible.

Install manually instead:

```powershell
dsh plugin --profile <profile> add "github:sidon-vu/dsh-hagi#<package>/v<version>&path:/packages/<package>"
```

## Layout

```
dsh-hagi/
├─ index.json                 # catalog, generated — never edit by hand
├─ scripts/build-index.mjs    # regenerate + validate the catalog
├─ packages/                  # one directory per bundle package
├─ docs/                      # tracking, porting, license policy
└─ control/profiles/        # per-machine feature switches (cordis patches)
```

## Release a package

```powershell
cd packages/dsh-dev-hg        # bump "version" in package.json
git commit -am "dsh-dev-hg: <change>"
git tag dsh-dev-hg/v0.2.0
node scripts/build-index.mjs  # validates, then rewrites index.json
git add index.json; git commit -m "index: dsh-dev-hg 0.2.0"; git push --tags
```

Discover caches an index for 10 minutes; press refresh there after pushing.

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0` (declared per package in `engines.dsh`).
- Node 20+ for the index script. No runtime dependencies in plugin packages.

## License

MIT. Each package states its own `license` field; ported work keeps attribution in `NOTICE.md` next to the package. See [docs/LICENSE-POLICY.md](docs/LICENSE-POLICY.md).
