/**
 * store.js — domain `machines` + JSON-record tables.
 *
 * dsh-storage-domain contract (verified in API.md / asar 0.2.2-rc.5):
 * `ctx.storageDomain.open(domainSpec)` → Domain handle; `handle.table(name)` →
 * KvTable {get, put, entries, keys}. `domainTable(schema)` wraps a standard
 * schema ({safeParse(value)}) — we hand-roll a tiny validator so the package
 * stays dependency-free (no zod in profile node_modules).
 */

/** Minimal standard-schema string validator (records are JSON-encoded). */
const jsonStringSchema = {
  safeParse(value) {
    return typeof value === 'string' ? { success: true, data: value } : { success: false, error: new Error('expected string') }
  },
}

/**
 * defineDomain spec — we cannot import '@deepseek-ai/dsh-storage-domain', so we
 * build the literal object it validates: name matching UNIT_NAME_RE, integer
 * version, tables = { name: { valueSchema } }.
 */
export const machinesDomainSpec = {
  name: 'machines',
  version: 1,
  tables: {
    // machines: id → JSON MachineRecord
    machines: { valueSchema: jsonStringSchema },
    // pins: sessionId → JSON { machineId, createdAt }
    pins: { valueSchema: jsonStringSchema },
    // a2a_tasks: taskId → JSON A2A task record (Phase 4)
    a2a_tasks: { valueSchema: jsonStringSchema },
    // a2a_contexts: contextId → sessionId binding (Phase 4)
    a2a_contexts: { valueSchema: jsonStringSchema },
  },
}

function encode(value) {
  return JSON.stringify(value)
}

function decode(raw) {
  if (raw === undefined || raw === '') return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Open the machines domain; caller keeps the handle and closes on teardown.
 * The underlying domain can only be opened ONCE per process — cache the
 * promise so multiple rows (registry/pin/dispatch) share a single handle.
 */
let _openPromise
export function openMachinesDomain(storageDomain) {
  if (_openPromise === undefined) {
    _openPromise = storageDomain.open(machinesDomainSpec).then((h) => new MachinesDomain(h))
  }
  return _openPromise
}

export class MachinesDomain {
  constructor(handle) {
    this.handle = handle
  }

  get machines() {
    return this.handle.table('machines')
  }
  get pins() {
    return this.handle.table('pins')
  }
  get a2aTasks() {
    return this.handle.table('a2a_tasks')
  }
  get a2aContexts() {
    return this.handle.table('a2a_contexts')
  }

  // ── MachineRecord: {id,name,baseUrl,cardUrl?,tokenEnv?,tags[],enabled,lastSeenAt?,lastError?,
  //                    sshHost?,sshPort?,sshUser?,sshKeyPath?,dshProfile?}  — ssh* + dshProfile drive machine_dispatch
  listMachines() {
    const out = []
    const entries = this.machines.entries
    if (entries === undefined) return out
    for (const [, raw] of entries.call(this.machines)) {
      const rec = decode(raw)
      if (rec !== undefined && typeof rec.id === 'string') out.push(rec)
    }
    return out
  }

  getMachine(id) {
    return decode(this.machines.get(`m:${id}`))
  }

  async saveMachine(record) {
    await this.machines.put(`m:${record.id}`, encode(record))
  }

  async removeMachine(id) {
    await this.machines.put(`m:${id}`, '')
  }

  // ── pins
  async setPin(sessionId, machineId) {
    await this.pins.put(`p:${sessionId}`, encode({ machineId, createdAt: new Date().toISOString() }))
  }

  getPin(sessionId) {
    return decode(this.pins.get(`p:${sessionId}`))
  }

  async clearPin(sessionId) {
    await this.pins.put(`p:${sessionId}`, '')
  }

  // ── a2a_contexts: dispatchContextId → {machineId, sessionId, createdAt, lastUsedAt}
  async setA2AContext(contextId, record) {
    await this.a2aContexts.put(`c:${contextId}`, encode(record))
  }

  getA2AContext(contextId) {
    return decode(this.a2aContexts.get(`c:${contextId}`))
  }

  async close() {
    await this.handle.close()
  }
}
