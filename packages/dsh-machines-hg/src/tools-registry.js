/**
 * Row `machines-hg-registry` + `machines-hg-status`: machine registry tools.
 *
 * Tools (plain objects, standard JSON Schema output — see skill
 * `dsh-plain-tool-definition`): machine_add, machine_list, machine_remove,
 * machine_probe. Records live in domain `machines`, table `machines`.
 */
import { openMachinesDomain } from './store.js'

export const name = 'machines-hg-registry'
export const inject = ['tools', 'storageDomain', 'credentials']

const MACHINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'baseUrl', 'enabled'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    baseUrl: { type: 'string' },
    cardUrl: { type: 'string' },
    tokenEnv: { type: 'string' },
    sshHost: { type: 'string' },
    sshPort: { type: 'integer' },
    sshUser: { type: 'string' },
    sshKeyPath: { type: 'string' },
    dshProfile: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    enabled: { type: 'boolean' },
    lastSeenAt: { type: 'string' },
    lastError: { type: 'string' },
  },
}

const LIST_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['machines', 'count'],
  properties: {
    machines: { type: 'array', items: MACHINE_SCHEMA },
    count: { type: 'integer' },
  },
}

const PROBE_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'online', 'latencyMs'],
  properties: {
    id: { type: 'string' },
    online: { type: 'boolean' },
    latencyMs: { type: 'integer' },
    status: { type: 'string' },
    error: { type: 'string' },
  },
}

// render must return MessagePart[] — [{type:'text',text}], NOT nested arrays.
const render = (fn) => (_args, value) => [{ type: 'text', text: String(fn(value)) }]

export function apply(ctx) {
  let domain
  const ready = openMachinesDomain(ctx.storageDomain).then((d) => {
    domain = d
    return d
  })

  const needDomain = async () => {
    await ready
    return domain
  }

  const find = async (id) => {
    const d = await needDomain()
    const rec = d.getMachine(id)
    if (rec === undefined) throw new Error(`machine "${id}" not found`)
    return rec
  }

  ctx.tools.register({
    name: 'machine_add',
    description: 'Register a DSH machine (endpoint URL of its `dsh web`) in the local machines registry.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Short machine id, e.g. "vhagi" (letters/digits/hyphen).' },
        name: { type: 'string', description: 'Display name.' },
        baseUrl: { type: 'string', description: 'Base URL of the remote `dsh web`, e.g. http://100.x.y.z:3000 or the Cloudflare Tunnel URL.' },
        cardUrl: { type: 'string', description: 'Optional A2A agent-card URL if the remote exposes one.' },
        tokenEnv: { type: 'string', description: 'Name of the env var / credentials key holding the bearer token for this machine.' },
        sshHost: { type: 'string', description: 'SSH host for machine_dispatch (Tailscale IP or hostname). Required to run agents on this machine.' },
        sshPort: { type: 'integer', description: 'SSH port (default 22).' },
        sshUser: { type: 'string', description: 'SSH user (default: current user).' },
        sshKeyPath: { type: 'string', description: 'Absolute path to the SSH private key (BatchMode, IdentitiesOnly).' },
        dshProfile: { type: 'string', description: 'DSH profile name on the remote used by `dsh headless` (default "headless").' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Labels, e.g. ["always-on","tailnet"].' },
      },
      required: ['id', 'baseUrl'],
    },
    output: { schema: MACHINE_SCHEMA, render: render((v) => `machine "${v.id}" saved (${v.baseUrl})`) },
    async execute(args) {
      const d = await needDomain()
      const record = {
        id: String(args.id),
        name: args.name !== undefined ? String(args.name) : String(args.id),
        baseUrl: String(args.baseUrl),
        ...(args.cardUrl !== undefined ? { cardUrl: String(args.cardUrl) } : {}),
        ...(args.tokenEnv !== undefined ? { tokenEnv: String(args.tokenEnv) } : {}),
        ...(args.sshHost !== undefined ? { sshHost: String(args.sshHost) } : {}),
        ...(args.sshPort !== undefined ? { sshPort: Number(args.sshPort) } : {}),
        ...(args.sshUser !== undefined ? { sshUser: String(args.sshUser) } : {}),
        ...(args.sshKeyPath !== undefined ? { sshKeyPath: String(args.sshKeyPath) } : {}),
        ...(args.dshProfile !== undefined ? { dshProfile: String(args.dshProfile) } : {}),
        tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
        enabled: true,
      }
      await d.saveMachine(record)
      return record
    },
  })

  ctx.tools.register({
    name: 'machine_list',
    description: 'List every machine in the local machines registry.',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: LIST_OUTPUT,
      render: render((v) => {
        if (v.count === 0) return 'machines: (empty — use machine_add)'
        return v.machines.map((m) => `${m.id}\t${m.name}\t${m.enabled ? 'on' : 'off'}\t${m.baseUrl}`).join('\n')
      }),
    },
    async execute() {
      const d = await needDomain()
      const machines = d.listMachines()
      return { machines, count: machines.length }
    },
  })

  ctx.tools.register({
    name: 'machine_remove',
    description: 'Remove a machine from the registry by id.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Machine id to remove.' } },
      required: ['id'],
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const d = await needDomain()
      if (d.getMachine(String(args.id)) === undefined) throw new Error(`machine "${args.id}" not found`)
      await d.removeMachine(String(args.id))
      return `machine "${args.id}" removed`
    },
  })

  ctx.tools.register({
    name: 'machine_probe',
    description: 'Check whether a registered machine is reachable (HTTP GET on baseUrl or its A2A agent card) and measure latency.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Machine id to probe.' } },
      required: ['id'],
    },
    output: {
      schema: PROBE_OUTPUT,
      render: render((v) => `${v.id}: ${v.online ? `online in ${v.latencyMs}ms` : `OFFLINE${v.error !== undefined ? ` (${v.error})` : ''}`}`),
    },
    async execute(args) {
      const rec = await find(String(args.id))
      const target = rec.cardUrl ?? rec.baseUrl
      const started = Date.now()
      try {
        const res = await fetch(target, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        })
        const latency = Date.now() - started
        const d = await needDomain()
        const next = { ...rec, lastSeenAt: new Date().toISOString(), lastError: res.ok ? '' : `HTTP ${res.status}` }
        await d.saveMachine(next)
        return { id: rec.id, online: res.ok, latencyMs: latency, status: `HTTP ${res.status}` }
      } catch (err) {
        const d = await needDomain()
        await d.saveMachine({ ...rec, lastError: err.message })
        return { id: rec.id, online: false, latencyMs: Date.now() - started, error: err.message }
      }
    },
  })
}
