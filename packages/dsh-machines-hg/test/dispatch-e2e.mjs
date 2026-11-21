// E2E smoke for machine_dispatch: registers vHaGi in a fake domain, calls the
// real sshExecWithRetry + remote `dsh headless --json`. Not a unit test — needs
// SSH to vHaGi (Tailscale) + DEEPSEEK_API_KEY in vHaGi ~/.bashrc.
// Run: node packages/dsh-machines-hg/test/dispatch-e2e.mjs
import { MachinesDomain } from '../src/store.js'
import { sshExecWithRetry, shellQuote } from '../src/ssh.js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

// Machine params come from env — no internal hostnames in the repo:
//   MACHINES_E2E_HOST (required) MACHINES_E2E_USER (required) MACHINES_E2E_PORT (default 22)
const HOST = process.env.MACHINES_E2E_HOST
const USER = process.env.MACHINES_E2E_USER
if (HOST === undefined || USER === undefined) {
  console.log('set MACHINES_E2E_HOST + MACHINES_E2E_USER first')
  process.exit(1)
}
const PORT = Number(process.env.MACHINES_E2E_PORT ?? 22)

// Register the machine the same way machine_add would.
await domain.saveMachine({
  id: 'vhagi',
  name: 'vHaGi',
  baseUrl: `http://${HOST}:3000`,
  sshHost: HOST,
  sshPort: PORT,
  sshUser: USER,
  sshKeyPath: '',           // default key discovery
  dshProfile: 'headless',
  enabled: true,
})

const device = {
  host: HOST,
  port: PORT,
  user: USER,
  keyPath: '',
}
const prompt = 'reply with the single word DISPATCH_OK'
const remoteCmd = [
  'export PATH="$HOME/.npm-global/bin:$PATH"',
  'eval "$(grep -E \'^export \' ~/.bashrc 2>/dev/null)"',
  `dsh --profile headless headless --json --approval-policy never ${shellQuote(prompt)}`,
].join('; ')

console.log('ssh cmd:', remoteCmd)
const result = await sshExecWithRetry(device, remoteCmd, {
  timeoutMs: 120_000,
})
console.log('ok:', result.ok, 'exit:', result.exitCode)
const sessionId = /"sessionId":"([^"]+)"/.exec(result.stdout)?.[1]
console.log('sessionId:', sessionId)
console.log('--- stdout (first 10 lines) ---')
console.log(result.stdout.split('\n').slice(0, 10).join('\n'))

if (!result.ok || sessionId === undefined) {
  console.log('FAIL — no session')
  process.exit(1)
}

// Resume the same session — verify --session-id works.
const resumeCmd = [
  'export PATH="$HOME/.npm-global/bin:$PATH"',
  'eval "$(grep -E \'^export \' ~/.bashrc 2>/dev/null)"',
  `dsh --profile headless headless --json --approval-policy never --session-id ${sessionId} ${shellQuote('what word did you just say? one word only')}`,
].join('; ')
console.log('\n--- resume ---')
const r2 = await sshExecWithRetry(device, resumeCmd, { timeoutMs: 120_000 })
console.log('ok:', r2.ok, 'exit:', r2.exitCode)
console.log(r2.stdout.split('\n').slice(-5).join('\n'))
process.exit(r2.ok ? 0 : 1)
