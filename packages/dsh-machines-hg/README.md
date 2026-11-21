# dsh-machines-hg

Multi-machine fleet for DeepSeek Harness: pair DSH instances over SSH/Tailscale, pick one machine as the always-on agent host, dispatch and resume sessions across machines.

Part of [dsh-hagi](../../README.md), group `machines`. One package = one theme; inside, **one row = one feature** you can switch off without removing the package.

## Install

```
plugins → Discover → (add index source) → hg · Machines
```

or

```powershell
dsh plugin --profile <profile> add "dsh-machines-hg"
```

## Features

- `machines-hg-registry` — register machines (id, baseUrl, SSH/Tailscale endpoint), probe alive
- `machines-hg-pin` — pin a session to a machine so `machine_dispatch` runs there
- `machines-hg-dispatch` — send a prompt to a remote machine via SSH + `dsh headless`
- `machines-hg-tunnel` — Cloudflare quick tunnel for machines without public IP
- `machines-hg-handoff` — list remote sessions, get attach URL for phone/tablet

Full status table: [docs/FEATURES.md](docs/FEATURES.md).

**How to use:** [docs/USAGE.md](docs/USAGE.md) — pair machines, configure headless Ubuntu, dispatch prompts, attach from phone.

## Requirements

- DSH `>=0.2.2-rc.5 <0.3.0`
- No runtime dependencies, no build step

## Layout

```
dsh-machines-hg/
├─ package.json        # name, engines.dsh, dsh.bundle, dsh.market
├─ cordis.patch.yml    # rows (features)
├─ index.js            # host entry
├─ src/                # feature sources (one file per row)
├─ locale/en.json      # display strings
├─ locale/vi.json
└─ docs/FEATURES.md
```

## License

MIT.
