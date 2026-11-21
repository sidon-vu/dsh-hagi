// Test: pin → dispatch resolution khi exec không có contextId/sessionId
// (phiên web — bug trong ảnh user), và output lossless-JSON (không field undefined).
// Chạy: node packages/dsh-machines-hg/test/pin-context.mjs
import { openMachinesDomain } from '../src/store.js'
import * as pinRow from '../src/tools-pin.js'
import * as dispatchRow from '../src/tools-dispatch.js'

let failures = 0
const check = (name, cond) => {
  if (cond) console.log(`  ok ${name}`)
  else {
    failures += 1
    console.log(`  FAIL ${name}`)
  }
}

const fakeTable = () => {
  const map = new Map()
  return {
    get: (k) => map.get(k),
    put: async (k, v) => {
      if (v === '') map.delete(k)
      else map.set(k, v)
    },
    entries: function* () {
      yield* map.entries()
    },
    keys: function* () {
      yield* map.keys()
    },
  }
}

const tables = { machines: fakeTable(), pins: fakeTable(), a2a_tasks: fakeTable(), a2a_contexts: fakeTable() }
const storageDomain = {
  open: async () => ({
    table: (name) => {
      const t = tables[name]
      if (!t) throw new Error(`no table ${name}`)
      return t
    },
    close: async () => {},
  }),
}

const registered = {}
const ctx = { storageDomain, tools: { register: (t) => { registered[t.name] = t } } }
pinRow.apply(ctx)
dispatchRow.apply(ctx)

const domain = await openMachinesDomain(storageDomain)
await domain.saveMachine({ id: 'vhagi', name: 'vHaGi', baseUrl: 'http://127.0.0.1:9', sshHost: '127.0.0.1', sshPort: 1, enabled: true })

// exec không có contextId/sessionId — y hệt phiên web trong ảnh.
const exec = {}

console.log('pin → dispatch (anonymous context):')
const pin = await registered.machine_pin.execute({ machine: 'vhagi' }, exec)
check('pin stored under ""', pin.pinned === true && pin.contextId === '')
const status = await registered.machine_pin_status.execute({}, exec)
check('pin_status sees pin', status.pinned === true && status.machineId === 'vhagi')

// timeoutMs nhỏ để ssh fail nhanh; quan trọng là KHÔNG còn lỗi "no machine".
const res = await registered.machine_dispatch.execute({ prompt: 'hi', timeoutMs: 500 }, exec)
check('dispatch resolves pinned machine', res.machineId === 'vhagi')
check('not "no machine" error', !(res.error ?? '').includes('no machine'))

console.log('lossless-JSON output:')
const roundTrip = JSON.parse(JSON.stringify(res))
check('round-trip equal', JSON.stringify(roundTrip) === JSON.stringify(res))
check('no undefined remoteSessionId key', !('remoteSessionId' in res) || typeof res.remoteSessionId === 'string')

console.log(failures === 0 ? 'PASS' : `${failures} FAIL`)
process.exit(failures === 0 ? 0 : 1)
