/**
 * Row `machines-hg-tunnel`: manage a `cloudflared` quick-tunnel on THIS machine
 * so remote clients (phone, mmo) can reach the local `dsh web` without
 * Tailscale.
 *
 * Spawn `cloudflared tunnel --url http://127.0.0.1:<port>` → watch stderr for
 * `https://*.trycloudflare.com` → save into `machines` record `self.publicUrl`.
 * Detect binary first; absent → return install hint, never throw.
 *
 * No named-tunnel support in v1 (needs cert.pem + config.yml — defer).
 */
import { openMachinesDomain } from './store.js'
import { spawn } from 'node:child_process'

export const name = 'machines-hg-tunnel'
export const inject = ['tools', 'storageDomain', 'webServer']

const TUNNEL_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['starting', 'online', 'stopped', 'unavailable', 'error'] },
    publicUrl: { type: 'string' },
    localUrl: { type: 'string' },
    pid: { type: 'integer' },
    error: { type: 'string' },
    installHint: { type: 'string' },
  },
}

const render = (fn) => (_args, value) => [{ type: 'text', text: String(fn(value)) }]

const TUNNEL_START_TIMEOUT_MS = 30_000

export function apply(ctx) {
  let domain
  const ready = openMachinesDomain(ctx.storageDomain).then((d) => {
    domain = d
    return d
  })

  // Module-level handle for the spawned child so machine_tunnel_stop can kill it.
  let child = null
  let publicUrl = ''
  let lastError = ''

  const needDomain = async () => {
    await ready
    return domain
  }

  const selfRecord = async () => {
    const d = await needDomain()
    const rec = d.getMachine('self') ?? {
      id: 'self',
      name: 'this machine',
      baseUrl: ctx.webServer.getOrigin?.() ?? `http://127.0.0.1:${ctx.webServer.port ?? 3000}`,
      enabled: true,
    }
    return { d, rec }
  }

  ctx.tools.register({
    name: 'machine_tunnel_start',
    description: 'Start a Cloudflare quick-tunnel pointing at this machine\'s `dsh web`. Returns the public *.trycloudflare.com URL once it appears (≤30s).',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: TUNNEL_OUTPUT,
      render: render((v) => {
        if (v.status === 'unavailable') return `cloudflared missing — ${v.installHint}`
        if (v.status === 'online') return `tunnel online → ${v.publicUrl} (pid ${v.pid})`
        if (v.status === 'error') return `tunnel error: ${v.error}`
        return `tunnel ${v.status}`
      }),
    },
    async execute() {
      const { d, rec } = await selfRecord()
      const localUrl = rec.baseUrl
      const localPort = new URL(localUrl).port || '3000'

      if (child !== null && publicUrl !== '') {
        return { status: 'online', publicUrl, localUrl, pid: child.pid ?? 0 }
      }

      // Spawn cloudflared; it logs the public URL to stderr.
      let spawned
      try {
        spawned = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${localPort}`, '--no-autoupdate'], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (err) {
        if (err.code === 'ENOENT') {
          return {
            status: 'unavailable',
            installHint: 'install cloudflared — https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
          }
        }
        return { status: 'error', error: err.message }
      }

      child = spawned
      lastError = ''

      // Wait for the public URL on stderr.
      const found = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(''), TUNNEL_START_TIMEOUT_MS)
        let buf = ''
        spawned.stderr?.on('data', (chunk) => {
          buf += chunk.toString('utf8')
          const m = /(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/i.exec(buf)
          if (m !== null) {
            clearTimeout(timer)
            resolve(m[1])
          }
        })
        spawned.on('error', (err) => {
          lastError = err.message
          clearTimeout(timer)
          resolve('')
        })
        spawned.on('close', (code) => {
          lastError = `cloudflared exited ${code}`
          child = null
          clearTimeout(timer)
          resolve('')
        })
      })

      if (found === '') {
        if (child !== null) {
          child.kill('SIGKILL')
          child = null
        }
        return { status: 'error', error: lastError !== '' ? lastError : `no public URL within ${TUNNEL_START_TIMEOUT_MS / 1000}s` }
      }

      publicUrl = found
      await d.saveMachine({ ...rec, publicUrl, tunnelPid: child.pid ?? 0, tunnelStartedAt: new Date().toISOString() })
      return { status: 'online', publicUrl, localUrl, pid: child.pid ?? 0 }
    },
  })

  ctx.tools.register({
    name: 'machine_tunnel_status',
    description: 'Show the current Cloudflare tunnel state on this machine.',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: TUNNEL_OUTPUT,
      render: render((v) => {
        if (v.status === 'online') return `tunnel online → ${v.publicUrl} (pid ${v.pid})`
        if (v.status === 'stopped') return 'tunnel stopped'
        if (v.status === 'unavailable') return `cloudflared missing — ${v.installHint ?? ''}`
        return `tunnel ${v.status}${v.error !== undefined ? ` (${v.error})` : ''}`
      }),
    },
    async execute() {
      const { rec } = await selfRecord()
      if (child !== null && publicUrl !== '') {
        return { status: 'online', publicUrl, localUrl: rec.baseUrl, pid: child.pid ?? 0 }
      }
      if (rec.publicUrl !== undefined && rec.publicUrl !== '') {
        return { status: 'stopped', publicUrl: rec.publicUrl, localUrl: rec.baseUrl }
      }
      return { status: 'stopped', localUrl: rec.baseUrl }
    },
  })

  ctx.tools.register({
    name: 'machine_tunnel_stop',
    description: 'Stop the running Cloudflare tunnel (if any) and clear self.publicUrl.',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: TUNNEL_OUTPUT,
      render: render((v) => (v.status === 'stopped' ? 'tunnel stopped' : `tunnel ${v.status}`)),
    },
    async execute() {
      const { d, rec } = await selfRecord()
      if (child !== null) {
        child.kill('SIGKILL')
        child = null
      }
      publicUrl = ''
      const next = { ...rec }
      delete next.publicUrl
      delete next.tunnelPid
      delete next.tunnelStartedAt
      await d.saveMachine(next)
      return { status: 'stopped', localUrl: rec.baseUrl }
    },
  })
}
