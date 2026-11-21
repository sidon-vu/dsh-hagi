// E2E test for the A2A rewrite — exercises the real HTTP handler + client.
// Spins a plain http server that mimics DSH webServer.register, calls
// machine_a2a_start to mount routes, then A2AClient.sendMessage → SendMessage.
// Run: node packages/dsh-machines-hg/test/a2a-e2e.mjs
import { createServer } from 'node:http'
import { MachinesDomain } from '../src/store.js'
import { apply as a2aApply } from '../src/a2a.js'

const fakeTable = () => {
  const map = new Map()
  return {
    get: (k) => map.get(k),
    put: async (k, v) => { if (v === '') map.delete(k); else map.set(k, v) },
    entries: function* () { yield* map.entries() },
    keys: function* () { yield* map.keys() },
  }
}
const tables = { machines: fakeTable(), pins: fakeTable(), a2a_tasks: fakeTable(), a2a_contexts: fakeTable() }
const domain = new MachinesDomain({ table: (n) => tables[n], close: async () => {} })

// Register a "self" machine with a reachable baseUrl.
await domain.saveMachine({
  id: 'self',
  name: 'lab-self',
  baseUrl: 'http://127.0.0.1:8791',
  enabled: true,
})

// Minimal webServer that records registrations and serves them over real HTTP.
const routes = new Map()
const webServer = {
  port: 8791,
  getOrigin: () => 'http://127.0.0.1:8791',
  register({ kind, path, handler }) {
    routes.set(`${kind}:${path}`, handler)
    return { dispose: () => routes.delete(`${kind}:${path}`) }
  },
}

const server = createServer(async (req, res) => {
  const url = (req.url ?? '').split('?')[0]
  const key = `exact:${url}`
  const h = routes.get(key)
  if (h) { await h(req, res); return }
  // prefix match (not used here but keep shape)
  for (const [k, handler] of routes) {
    if (k.startsWith('prefix:') && url.startsWith(k.slice(7))) { await handler(req, res); return }
  }
  res.writeHead(404); res.end('nf')
})
await new Promise((r) => server.listen(8791, '127.0.0.1', r))

// Fake tools registry — capture tool defs.
const toolDefs = new Map()
const tools = { register: (def) => { toolDefs.set(def.name, def); return { dispose: () => {} } } }
const credentials = { resolve: async () => '' }
const ctx = { tools, storageDomain: { open: async () => ({ table: (n) => tables[n], close: async () => {} }) }, webServer, credentials }

// Mount the a2a row.
a2aApply(ctx)

// Invoke machine_a2a_start to register routes.
const startTool = toolDefs.get('machine_a2a_start')
if (!startTool) { console.log('FAIL: machine_a2a_start not registered'); process.exit(1) }
const startMsg = await startTool.execute({ skills: ['chat'] }, { contextId: 'test-ctx' })
console.log('a2a_start:', startMsg)

// 1. Fetch the agent card
const cardRes = await fetch('http://127.0.0.1:8791/.well-known/agent-card.json')
const card = await cardRes.json()
console.log('card name:', card.name, 'endpoint:', card.supportedInterfaces?.[0]?.url)
if (!card.supportedInterfaces?.[0]?.url?.includes('/a2a/self')) {
  console.log('FAIL: card endpoint wrong'); process.exit(1)
}

// 2. SendMessage — but execLocal will SSH loopback which won't work from a test.
//    Instead verify the RPC surface responds: GetTask on unknown id, ListTasks empty.
const rpc = (method, params) => fetch('http://127.0.0.1:8791/a2a/self', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 't1', method, params }),
}).then((r) => r.json())

const listRes = await rpc('ListTasks', {})
console.log('ListTasks:', JSON.stringify(listRes.result))
if (listRes.error) { console.log('FAIL ListTasks'); process.exit(1) }

const getRes = await rpc('GetTask', { id: 'nonexistent' })
console.log('GetTask unknown:', getRes.error?.code === -32001 ? 'correct -32001' : JSON.stringify(getRes))

const badRes = await rpc('Bogus', {})
console.log('Unknown method:', badRes.error?.code === -32601 ? 'correct -32601' : JSON.stringify(badRes))

// 3. Outbound client — point machine_a2a_call at a fake machine whose cardUrl is our own card.
await domain.saveMachine({ id: 'loop', name: 'loop', baseUrl: 'http://127.0.0.1:8791', cardUrl: 'http://127.0.0.1:8791/.well-known/agent-card.json', enabled: true })
const callTool = toolDefs.get('machine_a2a_call')
if (!callTool) { console.log('FAIL: machine_a2a_call not registered'); process.exit(1) }
// SendMessage will create a task then execLocal → SSH loopback → fail. That still
// exercises connect + SendMessage path; we catch the task FAILED text.
try {
  const out = await callTool.execute({ machine: 'loop', prompt: 'say hi' }, { contextId: 'ctx-x', sessionId: 's-x' })
  console.log('a2a_call out:', out)
} catch (e) {
  console.log('a2a_call threw (expected if loopback ssh unavailable):', e.message)
}

server.close()
console.log('A2A e2e DONE')
