/**
 * Row `machines-hg-dispatch`: run a prompt on a remote machine over SSH.
 *
 * Transport: `ssh user@host 'dsh --profile <p> headless --json "<prompt>"'`
 * (BatchMode + IdentitiesOnly — no passwords). `--json` streams run events;
 * the first `sessionId` is persisted in `a2a_contexts` so a follow-up dispatch
 * to the same contextId resumes the same remote Session.
 *
 * Pin resolution order: args.machine → pin for this contextId → error.
 * Dispatch does NOT move the local session — it spawns a new remote session.
 */
import { openMachinesDomain } from './store.js'
import { sshExecWithRetry, shellQuote } from './ssh.js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'machines-hg-dispatch'
export const inject = ['tools', 'storageDomain']

const DISPATCH_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['contextId', 'machineId', 'ok'],
  properties: {
    contextId: { type: 'string' },
    machineId: { type: 'string' },
    remoteSessionId: { type: 'string' },
    ok: { type: 'boolean' },
    output: { type: 'string' },
    error: { type: 'string' },
  },
}

const render = (fn) => (_args, value) => [{ type: 'text', text: String(fn(value)) }]

/** Extract remote session id from `dsh headless --json` output (`"sessionId"` or a `type:"session"` event's `id`). */
function extractSessionId(jsonLines) {
  for (const line of jsonLines.split('\n')) {
    const m = /"sessionId"\s*:\s*"([^"]+)"/.exec(line)
    if (m !== null) return m[1]
    try {
      const ev = JSON.parse(line)
      if (ev.type === 'session' && typeof ev.id === 'string') return ev.id
    } catch { /* not JSON — skip */ }
  }
  return undefined
}

/** Extract the last assistant `text` field — the final answer. */
function extractLastText(jsonLines) {
  let last = ''
  for (const line of jsonLines.split('\n')) {
    try {
      const ev = JSON.parse(line)
      if (ev.type === 'assistant' && typeof ev.text === 'string') last = ev.text
      if (ev.type === 'result' && typeof ev.text === 'string') last = ev.text
    } catch { /* not JSON — skip */ }
  }
  return last
}

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

  ctx.tools.register({
    name: 'machine_dispatch',
    description: 'Run a prompt on a remote machine via `ssh <host> dsh headless --json`. Returns the remote agent\'s final text. The remote session is bound to this contextId — subsequent dispatches on the same context resume it automatically. Use `machine` to override the pin for one call.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Task text sent to the remote `dsh headless`.' },
        machine: { type: 'string', description: 'Machine id — overrides the session pin for this call only.' },
        newSession: { type: 'boolean', description: 'Start a fresh remote session even if this context already has one (default false).' },
        timeoutMs: { type: 'integer', description: 'Overall timeout in ms (default 300000).' },
      },
      required: ['prompt'],
    },
    output: {
      schema: DISPATCH_OUTPUT,
      render: render((v) => {
        if (!v.ok) return `dispatch ${v.machineId} FAILED: ${v.error ?? 'unknown'}`
        const head = v.remoteSessionId !== undefined ? `remote session ${v.remoteSessionId}` : 'remote run'
        return `${head} on ${v.machineId}:\n${v.output}`
      }),
    },
    async execute(args, exec) {
      const d = await needDomain()
      const contextId = exec.contextId ?? exec.sessionId ?? randomUUID()
      const prompt = String(args.prompt)

      // Resolve target machine. Pin lookup must use the same key chain as
      // machine_pin ('' when exec has no context/session id) — a random
      // per-call id would never match the stored pin.
      const explicit = args.machine !== undefined && args.machine !== '' ? String(args.machine) : undefined
      const pinKey = exec.contextId ?? exec.sessionId ?? ''
      const pin = explicit === undefined ? d.getPin(pinKey) : undefined
      const machineId = explicit ?? pin?.machineId
      if (machineId === undefined) {
        return { contextId, machineId: '', ok: false, output: '', error: 'no machine — pass `machine` or pin the session first (machine_pin)' }
      }
      const rec = d.getMachine(machineId)
      if (rec === undefined) return { contextId, machineId, ok: false, output: '', error: `machine "${machineId}" not found` }
      if (rec.enabled === false) return { contextId, machineId, ok: false, output: '', error: `machine "${machineId}" is disabled` }
      if (rec.sshHost === undefined || rec.sshHost === '') {
        return { contextId, machineId, ok: false, output: '', error: `machine "${machineId}" has no sshHost` }
      }

      // Look up or start remote session binding
      const binding = args.newSession === true ? undefined : d.getA2AContext(contextId)
      const remoteSessionId = binding?.sessionId

      const profile = rec.dshProfile ?? 'headless'
      const sessionFlag = remoteSessionId !== undefined ? ` --session-id ${remoteSessionId}` : ''
      // Non-interactive ssh doesn't source ~/.bashrc — pull PATH and any
      // exported API keys out of it explicitly so `dsh headless` finds both.
      const remoteCmd = [
        'export PATH="$HOME/.npm-global/bin:$PATH"',
        'eval "$(grep -E \'^export \' ~/.bashrc 2>/dev/null)"',
        `dsh --profile ${profile} headless --json --approval-policy never${sessionFlag} ${shellQuote(prompt)}`,
      ].join('; ')

      const device = {
        host: rec.sshHost,
        port: rec.sshPort ?? 22,
        user: rec.sshUser ?? process.env.USER ?? 'root',
        keyPath: rec.sshKeyPath ?? '',
      }
      // ControlMaster unix sockets don't work on Windows OpenSSH
      // ("getsockname failed: Not a socket") — only enable on POSIX.
      const socketDir = process.platform === 'win32' ? '' : join(tmpdir(), 'dsh-machines-hg-ssh')

      const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs : 300_000
      const result = await sshExecWithRetry(device, remoteCmd, {
        socketDir,
        signal: exec.signal,
        timeoutMs,
      })

      if (!result.ok) {
        return {
          contextId, machineId, ok: false, output: '',
          ...(remoteSessionId !== undefined ? { remoteSessionId } : {}),
          error: result.error ?? `exit ${result.exitCode}`,
        }
      }

      // Capture remote sessionId and persist binding for resume
      const found = extractSessionId(result.stdout) ?? remoteSessionId
      if (found !== undefined) {
        await d.setA2AContext(contextId, {
          machineId,
          sessionId: found,
          createdAt: binding?.createdAt ?? new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        })
      }

      const output = extractLastText(result.stdout) || result.stdout.trim() || '(no output)'
      // remoteSessionId only when actually found — an undefined field breaks
      // the harness's lossless-JSON check on tool output.
      const out = { contextId, machineId, ok: true, output }
      if (found !== undefined) out.remoteSessionId = found
      return out
    },
  })
}
