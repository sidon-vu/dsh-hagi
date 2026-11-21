/**
 * Row `machines-hg-a2a`: A2A v1.0.1 rewrite (JS thuần, gọn hơn reference).
 *
 * Inbound: `POST /a2a/<machineId>` JSON-RPC + `GET /.well-known/agent-card.json`.
 * Executor: one remote DSH session per contextId — dispatch to local
 * `dsh headless` via SSH loopback (or reuse `machine_dispatch` on `self`).
 * Outbound: fetch `cardUrl` of each machine → register `a2a__<machine>__<skill>`.
 *
 * Subset v1: SendMessage, SendStreamingMessage (SSE), GetTask, ListTasks,
 * CancelTask. Bỏ: push-notification, gRPC, trace extension, metrics, rate-limit.
 */

import { openMachinesDomain } from './store.js'
import { sshExecWithRetry, shellQuote } from './ssh.js'
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const name = 'machines-hg-a2a'
export const inject = ['tools', 'storageDomain', 'webServer', 'credentials']

// ── Protocol constants (copy from research/dsh-a2a/src/protocol.ts) ───────
const PROTOCOL_VERSION = '1.0'
const A2A_METHODS = {
  sendMessage: 'SendMessage',
  sendStreamingMessage: 'SendStreamingMessage',
  getTask: 'GetTask',
  listTasks: 'ListTasks',
  cancelTask: 'CancelTask',
  subscribeToTask: 'SubscribeToTask',
}
const TASK_STATE = {
  SUBMITTED: 'TASK_STATE_SUBMITTED',
  WORKING: 'TASK_STATE_WORKING',
  INPUT_REQUIRED: 'TASK_STATE_INPUT_REQUIRED',
  COMPLETED: 'TASK_STATE_COMPLETED',
  FAILED: 'TASK_STATE_FAILED',
  CANCELED: 'TASK_STATE_CANCELED',
}
const TERMINAL = new Set([TASK_STATE.COMPLETED, TASK_STATE.FAILED, TASK_STATE.CANCELED])
const ERR = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
  TASK_NOT_FOUND: -32001,
  UNSUPPORTED: -32004,
  VERSION_NOT_SUPPORTED: -32007,
}

// ── JSON-RPC helpers ─────────────────────────────────────────────────────
const rpcOk = (id, result) => ({ jsonrpc: '2.0', id, result })
const rpcErr = (id, code, message, data) => ({ jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } })
const parseRpc = (body) => {
  try {
    const obj = JSON.parse(body)
    if (obj?.jsonrpc !== '2.0' || typeof obj.method !== 'string') return undefined
    return obj
  } catch { return undefined }
}

const partsToText = (parts) => (parts ?? [])
  .map((p) => (typeof p?.text === 'string' ? p.text : ''))
  .filter(Boolean)
  .join('\n')

// ── Task store (in-memory + persisted to a2a_tasks) ─────────────────────
class TaskStore {
  constructor(domain) {
    this.domain = domain
    this.tasks = new Map() // taskId → {id, contextId, state, parts, history, createdAt, updatedAt, abort?}
  }
  async load() {
    const entries = this.domain.a2aTasks.entries
    if (entries === undefined) return
    for (const [key, raw] of entries.call(this.domain.a2aTasks)) {
      try {
        const rec = JSON.parse(raw)
        if (rec?.id) this.tasks.set(rec.id, rec)
      } catch { /* skip */ }
    }
  }
  async persist(rec) {
    await this.domain.a2aTasks.put(`t:${rec.id}`, JSON.stringify(rec))
  }
  async create(contextId, message) {
    const id = randomUUID()
    const rec = {
      id, contextId, state: TASK_STATE.SUBMITTED,
      history: [message], parts: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    this.tasks.set(id, rec)
    await this.persist(rec)
    return rec
  }
  get(id) { return this.tasks.get(id) }
  list() { return [...this.tasks.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) }
  async setState(id, state, parts = []) {
    const rec = this.tasks.get(id)
    if (rec === undefined) return
    rec.state = state
    rec.updatedAt = new Date().toISOString()
    if (parts.length > 0) rec.parts.push(...parts)
    await this.persist(rec)
  }
  async appendArtifact(id, part) {
    const rec = this.tasks.get(id)
    if (rec === undefined) return
    rec.parts.push(part)
    rec.updatedAt = new Date().toISOString()
    await this.persist(rec)
  }
  toTask(rec, withHistory = false) {
    return {
      id: rec.id,
      contextId: rec.contextId,
      status: { state: rec.state, timestamp: rec.updatedAt },
      artifacts: rec.parts.length > 0 ? [{ artifactId: 'result', parts: rec.parts }] : [],
      ...(withHistory ? { history: rec.history } : {}),
    }
  }
}

// ── Outbound client ─────────────────────────────────────────────────────
class A2AClient {
  constructor(cardUrl, bearerToken) {
    this.cardUrl = cardUrl
    this.bearerToken = bearerToken
    this.card = undefined
    this.endpoint = undefined
  }
  async connect() {
    const res = await fetch(this.cardUrl, {
      headers: { accept: 'application/json', 'a2a-version': PROTOCOL_VERSION, ...(this.bearerToken ? { authorization: `Bearer ${this.bearerToken}` } : {}) },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`card fetch HTTP ${res.status}`)
    this.card = await res.json()
    const iface = this.card.supportedInterfaces?.find((i) => (i.protocolBinding ?? 'JSONRPC') === 'JSONRPC') ?? this.card.supportedInterfaces?.[0]
    if (iface?.url === undefined) throw new Error('card has no JSON-RPC interface')
    this.endpoint = iface.url
  }
  async sendMessage(message, opts = {}) {
    const body = { jsonrpc: '2.0', id: randomUUID(), method: A2A_METHODS.sendMessage, params: { message } }
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'a2a-version': PROTOCOL_VERSION,
        ...(this.bearerToken ? { authorization: `Bearer ${this.bearerToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: opts.signal ?? AbortSignal.timeout(120_000),
    })
    const data = await res.json()
    if (data.error !== undefined) throw new Error(`[${data.error.code}] ${data.error.message}`)
    return data.result
  }
}

// ── Inbound executor: run one turn on local dsh via SSH loopback ─────────
async function execLocal(rec, prompt, contextId) {
  const profile = rec.dshProfile ?? 'headless'
  const remoteCmd = [
    'export PATH="$HOME/.npm-global/bin:$PATH"',
    'eval "$(grep -E \'^export \' ~/.bashrc 2>/dev/null)"',
    `dsh --profile ${profile} headless --json --approval-policy never --session-id ${contextId} ${shellQuote(prompt)}`,
  ].join('; ')
  const device = {
    host: '127.0.0.1',
    port: 22,
    user: rec.sshUser ?? process.env.USER ?? 'hagi',
    keyPath: rec.sshKeyPath ?? '',
  }
  const socketDir = process.platform === 'win32' ? '' : join(tmpdir(), 'dsh-machines-hg-ssh')
  const result = await sshExecWithRetry(device, remoteCmd, { socketDir, timeoutMs: 300_000 })
  if (!result.ok) throw new Error(result.error ?? `ssh exit ${result.exitCode}`)
  // Extract last text from NDJSON stdout
  let last = ''
  for (const line of result.stdout.split('\n')) {
    try {
      const ev = JSON.parse(line)
      if (ev.type === 'text' && typeof ev.text === 'string') last = ev.text
      if (ev.type === 'final' && typeof ev.text === 'string') last = ev.text
    } catch { /* skip */ }
  }
  return last || result.stdout.trim() || '(no output)'
}

// ── AgentCard builder ────────────────────────────────────────────────────
function buildCard(rec, baseUrl) {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/a2a/${rec.id}`
  return {
    name: rec.name ?? rec.id,
    description: `A2A agent on ${rec.name ?? rec.id}`,
    version: '0.1.0',
    provider: { url: 'https://deepseek.com', organization: 'DeepSeek' },
    capabilities: { streaming: true, pushNotifications: false, extendedAgentCard: false, stateTransitionHistory: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [
      { id: 'chat', name: 'Chat', description: 'General assistant — send a prompt, get a text answer.' },
    ],
    supportedInterfaces: [{ url: endpoint, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
    ...(rec.a2aAuthToken !== undefined
      ? {
        securitySchemes: { bearer: { httpAuthSecurityScheme: { scheme: 'bearer', description: 'Shared bearer token' } } },
        securityRequirements: [{ schemes: { bearer: { list: ['bearer'] } } }],
      }
      : {}),
  }
}

// ── Inbound request handler ──────────────────────────────────────────────
function makeHandler(ctx, domain, selfRec, taskStore) {
  const listeners = new Map() // taskId → Set<fn(frame)>
  const running = new Map()   // taskId → AbortController

  const emit = (taskId, frame) => {
    const set = listeners.get(taskId)
    if (set === undefined) return
    for (const fn of set) fn(frame)
  }

  const runTask = async (taskId, prompt, contextId) => {
    const abort = new AbortController()
    running.set(taskId, abort)
    try {
      await taskStore.setState(taskId, TASK_STATE.WORKING)
      emit(taskId, { statusUpdate: { taskId, status: { state: TASK_STATE.WORKING, timestamp: new Date().toISOString() } } })

      const output = await execLocal(selfRec, prompt, contextId)
      if (abort.signal.aborted) return

      await taskStore.appendArtifact(taskId, { text: output })
      await taskStore.setState(taskId, TASK_STATE.COMPLETED)
      emit(taskId, { statusUpdate: { taskId, status: { state: TASK_STATE.COMPLETED, timestamp: new Date().toISOString() } } })
    } catch (err) {
      if (abort.signal.aborted) return
      await taskStore.setState(taskId, TASK_STATE.FAILED, [{ text: err.message }])
      emit(taskId, { statusUpdate: { taskId, status: { state: TASK_STATE.FAILED, timestamp: new Date().toISOString() } } })
    } finally {
      running.delete(taskId)
    }
  }

  const authorized = (req) => {
    const token = selfRec.a2aAuthToken
    if (token === undefined || token === '') return true
    const auth = req.headers['authorization'] ?? ''
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
    if (m === null) return false
    const expected = createHash('sha256').update(token).digest()
    const provided = createHash('sha256').update(m[1]).digest()
    return timingSafeEqual(expected, provided)
  }

  return async function handler(req, res) {
    const url = (req.url ?? '').split('?')[0]
    const body = await new Promise((resolve) => {
      let buf = ''
      req.on('data', (c) => { buf += c.toString('utf8') })
      req.on('end', () => resolve(buf))
    })

    // GET /.well-known/agent-card.json
    if (req.method === 'GET' && url === '/.well-known/agent-card.json') {
      res.writeHead(200, { 'content-type': 'application/json', 'a2a-version': PROTOCOL_VERSION })
      res.end(JSON.stringify(buildCard(selfRec, selfRec.publicUrl ?? selfRec.baseUrl)))
      return
    }

    // POST /a2a/<machineId> — JSON-RPC
    const endpointPath = `/a2a/${selfRec.id}`
    if (req.method !== 'POST' || url !== endpointPath) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('Not Found')
      return
    }
    if (!authorized(req)) {
      res.writeHead(401, { 'content-type': 'application/json', 'www-authenticate': 'Bearer' })
      res.end(JSON.stringify(rpcErr(null, -32040, 'Unauthorized')))
      return
    }

    const rpc = parseRpc(body)
    if (rpc === undefined) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(rpcErr(null, ERR.INVALID_REQUEST, 'Invalid JSON-RPC')))
      return
    }

    const streaming = (req.headers.accept ?? '').includes('text/event-stream')
    const params = rpc.params ?? {}
    const message = params.message

    try {
      switch (rpc.method) {
        case A2A_METHODS.sendMessage: {
          if (message === undefined) {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(JSON.stringify(rpcErr(rpc.id, ERR.INVALID_PARAMS, 'Missing message')))
            return
          }
          const contextId = message.contextId ?? randomUUID()
          const task = await taskStore.create(contextId, message)
          void runTask(task.id, partsToText(message.parts), contextId)
          // Wait for terminal state (or timeout)
          const settled = await makeWaitTerminal(taskStore)(task.id, 300_000)
          res.writeHead(200, { 'content-type': 'application/json', 'a2a-version': PROTOCOL_VERSION })
          res.end(JSON.stringify(rpcOk(rpc.id, { task: taskStore.toTask(settled ?? taskStore.get(task.id), true) })))
          return
        }

        case A2A_METHODS.sendStreamingMessage: {
          if (message === undefined) {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(JSON.stringify(rpcErr(rpc.id, ERR.INVALID_PARAMS, 'Missing message')))
            return
          }
          res.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
            'a2a-version': PROTOCOL_VERSION,
          })
          const contextId = message.contextId ?? randomUUID()
          const task = await taskStore.create(contextId, message)
          const sub = (frame) => {
            res.write(`data: ${JSON.stringify(frame)}\n\n`)
          }
          if (listeners.has(task.id) === false) listeners.set(task.id, new Set())
          listeners.get(task.id).add(sub)
          sub({ task: taskStore.toTask(task, true) })
          void runTask(task.id, partsToText(message.parts), contextId)
          req.on('close', () => {
            listeners.get(task.id)?.delete(sub)
          })
          return
        }

        case A2A_METHODS.getTask: {
          const rec = taskStore.get(params.id)
          if (rec === undefined) {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(JSON.stringify(rpcErr(rpc.id, ERR.TASK_NOT_FOUND, `Task ${params.id} not found`)))
            return
          }
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(rpcOk(rpc.id, { task: taskStore.toTask(rec, true) })))
          return
        }

        case A2A_METHODS.listTasks: {
          const tasks = taskStore.list().map((r) => taskStore.toTask(r, false))
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(rpcOk(rpc.id, { tasks, nextPageToken: '', pageSize: tasks.length, totalSize: tasks.length })))
          return
        }

        case A2A_METHODS.cancelTask: {
          const rec = taskStore.get(params.id)
          if (rec === undefined) {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(JSON.stringify(rpcErr(rpc.id, ERR.TASK_NOT_FOUND, `Task ${params.id} not found`)))
            return
          }
          if (TERMINAL.has(rec.state)) {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(JSON.stringify(rpcErr(rpc.id, ERR.UNSUPPORTED, `Task ${params.id} already terminal`)))
            return
          }
          running.get(params.id)?.abort()
          await taskStore.setState(params.id, TASK_STATE.CANCELED, [{ text: 'Task canceled' }])
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(rpcOk(rpc.id, { task: taskStore.toTask(taskStore.get(params.id), true) })))
          return
        }

        default:
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(rpcErr(rpc.id, ERR.METHOD_NOT_FOUND, `Unknown method ${rpc.method}`)))
      }
    } catch (err) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(rpcErr(rpc.id, ERR.INTERNAL, err.message ?? String(err))))
    }
  }
}

function makeWaitTerminal(taskStore) {
  return function waitTerminal(taskId, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    return new Promise((resolve) => {
      const check = () => {
        const rec = taskStore.get(taskId)
        if (rec === undefined) { resolve(undefined); return }
        if (TERMINAL.has(rec.state)) { resolve(rec); return }
        if (Date.now() > deadline) { resolve(undefined); return }
        setTimeout(check, 200)
      }
      check()
    })
  }
}

// ── Tool-name normalization (copy from outbound/tools.ts) ───────────────
function normalizeToolName(raw) {
  const norm = raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
  if (norm.length > 0 && /^[A-Za-z0-9_-]+$/.test(norm)) return norm
  let hash = 0
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  return `_${hash.toString(16)}`
}

// ── apply() ─────────────────────────────────────────────────────────────
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
    name: 'machine_a2a_start',
    description: 'Start the inbound A2A server on this machine: registers `POST /a2a/<machineId>` + `GET /.well-known/agent-card.json` on the local webServer. Other machines can then call this machine as `a2a__<machine>__<skill>`.',
    parameters: {
      type: 'object',
      properties: {
        skills: { type: 'array', items: { type: 'string' }, description: 'Skill ids to advertise (default: ["chat"]).' },
      },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const d = await needDomain()
      const selfRec = d.getMachine('self') ?? {
        id: 'self',
        name: 'this machine',
        baseUrl: ctx.webServer.getOrigin?.() ?? `http://127.0.0.1:${ctx.webServer.port ?? 3000}`,
        enabled: true,
      }

      const skills = (Array.isArray(args.skills) && args.skills.length > 0 ? args.skills : ['chat']).map((id) => ({
        id: String(id), name: String(id), description: `${id} skill`,
      }))
      const cardRec = { ...selfRec, a2aAuthToken: selfRec.a2aAuthToken, skills }
      const card = buildCard(cardRec, selfRec.publicUrl ?? selfRec.baseUrl)

      // Register routes on the local webServer
      const taskStore = new TaskStore(domain)
      await taskStore.load()
      const handler = makeHandler(ctx, domain, cardRec, taskStore)
      const disposers = [
        ctx.webServer.register({ kind: 'exact', path: '/.well-known/agent-card.json', handler }),
        ctx.webServer.register({ kind: 'exact', path: `/a2a/${selfRec.id}`, handler }),
      ]
      return `a2a server online: ${card.supportedInterfaces[0].url} (skills: ${skills.map((s) => s.id).join(', ')})`
    },
  })

  ctx.tools.register({
    name: 'machine_a2a_call',
    description: 'Call a remote A2A agent directly: fetch its AgentCard, SendMessage with the prompt, return the task text. Use machine_a2a_list_skills to see what skills a remote offers.',
    parameters: {
      type: 'object',
      properties: {
        machine: { type: 'string', description: 'Machine id from registry.' },
        prompt: { type: 'string', description: 'Message text for the remote agent.' },
        skill: { type: 'string', description: 'Skill id to invoke (default: first advertised).' },
      },
      required: ['machine', 'prompt'],
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args, exec) {
      const d = await needDomain()
      const rec = d.getMachine(String(args.machine))
      if (rec === undefined) throw new Error(`machine "${args.machine}" not found`)
      if (rec.cardUrl === undefined || rec.cardUrl === '') throw new Error(`machine "${args.machine}" has no cardUrl`)

      let bearerToken = ''
      if (rec.tokenEnv !== undefined && rec.tokenEnv !== '') {
        try { bearerToken = await ctx.credentials.resolve(rec.tokenEnv) ?? '' } catch { /* optional */ }
      }
      const client = new A2AClient(rec.cardUrl, bearerToken)
      await client.connect()

      const skillId = args.skill !== undefined ? String(args.skill) : (client.card.skills?.[0]?.id ?? 'chat')
      const contextId = exec.contextId ?? exec.sessionId ?? randomUUID()
      const message = {
        messageId: randomUUID(),
        contextId,
        role: 'ROLE_USER',
        parts: [{ text: String(args.prompt) }],
      }
      const result = await client.sendMessage(message, { signal: exec.signal })
      const task = result?.task ?? result
      const text = task?.artifacts?.flatMap((a) => a.parts ?? []).map((p) => p.text ?? '').filter(Boolean).join('\n')
      return `[${rec.name} ${skillId}] ${text ?? '(no output)'}`
    },
  })
}
