/**
 * Row `machines-hg-handoff`: list sessions on a remote machine and build the
 * URL a client (phone) can open to attach to one.
 */
import { openMachinesDomain } from './store.js'
import { sshExecWithRetry } from './ssh.js'

export const name = 'machines-hg-handoff'
export const inject = ['tools', 'storageDomain', 'credentials']

const render = (fn) => (_args, value) => [{ type: 'text', text: String(fn(value)) }]

const LIST_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['machineId', 'count'],
  properties: {
    machineId: { type: 'string' },
    sessions: { type: 'array', items: { type: 'object', additionalProperties: true } },
    count: { type: 'integer' },
    attachBase: { type: 'string' },
    error: { type: 'string' },
  },
}

const ATTACH_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['machineId', 'sessionId', 'attachUrl'],
  properties: {
    machineId: { type: 'string' },
    sessionId: { type: 'string' },
    attachUrl: { type: 'string' },
    hint: { type: 'string' },
  },
}

async function listRemoteSessions(rec) {
  if (!rec.sshHost) {
    throw new Error('machine ' + rec.id + ' has no sshHost')
  }
  const remoteCmd = 'for d in ~/.dsh/sessions/*/session-*/; do [ -d "$d" ] || continue; mtime=$(stat -c %y "$d" 2>/dev/null | cut -d. -f1); sid=$(basename "$d"); echo "$mtime|$sid"; done | sort -r | head -50'
  const device = {
    host: rec.sshHost,
    port: rec.sshPort ?? 22,
    user: rec.sshUser ?? 'hagi',
    keyPath: rec.sshKeyPath ?? '',
  }
  const result = await sshExecWithRetry(device, remoteCmd, { timeoutMs: 30_000 })
  if (!result.ok) throw new Error(result.error ?? 'ssh exit ' + result.exitCode)
  const sessions = []
  for (const line of result.stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const pipe = trimmed.indexOf('|')
    if (pipe === -1) continue
    sessions.push({ id: trimmed.slice(pipe + 1).trim(), updatedAt: trimmed.slice(0, pipe).trim() })
  }
  return sessions
}

export function apply(ctx) {
  let domain
  const ready = openMachinesDomain(ctx.storageDomain).then((d) => { domain = d; return d })
  const needDomain = async () => { await ready; return domain }

  ctx.tools.register({
    name: 'machine_sessions',
    description: 'List remote sessions by scanning ~/.dsh/sessions/*/session-*/ over SSH.',
    parameters: {
      type: 'object',
      properties: { machine: { type: 'string', description: 'Machine id (default: pinned or self).' } },
    },
    output: {
      schema: LIST_OUTPUT,
      render: render((v) => {
        if (v.error) return 'machine "' + v.machineId + '": ' + v.error
        if (v.count === 0) return 'machine "' + v.machineId + '": no sessions'
        const rows = v.sessions.slice(0, 10).map((s) => s.id + '\t' + (s.updatedAt ?? '')).join('\n')
        return 'machine "' + v.machineId + '" — ' + v.count + ' session(s):\n' + rows
      }),
    },
    async execute(args, exec) {
      const d = await needDomain()
      const contextId = exec.contextId ?? exec.sessionId ?? ''
      const machineId = args.machine ? String(args.machine) : (d.getPin(contextId)?.machineId ?? 'self')
      const rec = d.getMachine(machineId)
      if (!rec) return { machineId, sessions: [], count: 0, error: 'machine "' + machineId + '" not found' }
      try {
        const sessions = await listRemoteSessions(rec)
        return { machineId, sessions, count: sessions.length, attachBase: rec.publicUrl ?? rec.baseUrl }
      } catch (err) {
        return { machineId, sessions: [], count: 0, error: err.message }
      }
    },
  })

  ctx.tools.register({
    name: 'machine_attach',
    description: 'Build URL a client can open to attach to a remote session.',
    parameters: {
      type: 'object',
      properties: {
        machine: { type: 'string', description: 'Machine id (default: pinned or self).' },
        sessionId: { type: 'string', description: 'Remote session id.' },
      },
      required: ['sessionId'],
    },
    output: {
      schema: ATTACH_OUTPUT,
      render: render((v) => v.attachUrl + '\n\n' + (v.hint ?? '')),
    },
    async execute(args, exec) {
      const d = await needDomain()
      const contextId = exec.contextId ?? exec.sessionId ?? ''
      const machineId = args.machine ? String(args.machine) : (d.getPin(contextId)?.machineId ?? 'self')
      const rec = d.getMachine(machineId)
      if (!rec) throw new Error('machine "' + machineId + '" not found')
      const base = rec.publicUrl ?? rec.baseUrl
      let token = ''
      if (rec.tokenEnv) {
        try { token = await ctx.credentials.resolve(rec.tokenEnv) ?? '' } catch { /* optional */ }
      }
      const attachUrl = base + '/?session=' + encodeURIComponent(String(args.sessionId)) + (token ? '&token=' + encodeURIComponent(token) : '')
      const hint = token ? 'token included — single-use launch-token' : 'no tokenEnv configured'
      return { machineId, sessionId: String(args.sessionId), attachUrl, hint }
    },
  })
}
