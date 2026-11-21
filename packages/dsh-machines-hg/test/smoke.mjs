// Smoke test Phase 1: MachinesDomain round-trip qua KvTable giả.
// Chạy: node packages/dsh-machines-hg/test/smoke.mjs
import { MachinesDomain } from '../src/store.js'

let failures = 0
const check = (name, cond) => {
  if (cond) console.log(`  ok ${name}`)
  else {
    failures += 1
    console.log(`  FAIL ${name}`)
  }
}

// Minimal KvTable giả theo contract {get,put,entries,keys}.
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
const domain = new MachinesDomain({
  table: (name) => {
    const t = tables[name]
    if (!t) throw new Error(`no table ${name}`)
    return t
  },
  close: async () => {},
})

console.log('machines domain round-trip:')
await domain.saveMachine({ id: 'vhagi', name: 'vHaGi', baseUrl: 'http://100.x:3000', tags: ['always-on'], enabled: true })
await domain.saveMachine({ id: 'whagi', name: 'wHaGi', baseUrl: 'http://100.y:3000', enabled: true })
check('listMachines=2', domain.listMachines().length === 2)
check('getMachine vhagi', domain.getMachine('vhagi')?.name === 'vHaGi')
check('unknown id → undefined', domain.getMachine('nope') === undefined)
await domain.removeMachine('whagi')
check('after remove=1', domain.listMachines().length === 1)

await domain.setPin('sess-1', 'vhagi')
check('pin read', domain.getPin('sess-1')?.machineId === 'vhagi')
await domain.clearPin('sess-1')
check('pin cleared', domain.getPin('sess-1') === undefined)

await domain.setA2AContext('ctx-9', { machineId: 'vhagi', sessionId: 'remote-abc', createdAt: 'x', lastUsedAt: 'y' })
check('a2a context read', domain.getA2AContext('ctx-9')?.sessionId === 'remote-abc')
check('a2a context unknown', domain.getA2AContext('nope') === undefined)

console.log(failures === 0 ? 'PASS' : `${failures} FAIL`)
process.exit(failures === 0 ? 0 : 1)
