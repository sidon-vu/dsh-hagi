/**
 * Row `machines-hg-pin`: pin the current chat session to a machine.
 *
 * When a session is pinned, `machine_dispatch` (same contextId) routes to the
 * pinned machine without needing an explicit `machine` arg. Pins live in
 * domain `machines`, table `pins` (key `p:<contextId>`).
 */
import { openMachinesDomain } from './store.js'

export const name = 'machines-hg-pin'
export const inject = ['tools', 'storageDomain']

const PIN_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['contextId', 'pinned', 'machineId'],
  properties: {
    contextId: { type: 'string' },
    pinned: { type: 'boolean' },
    machineId: { type: 'string' },
    machineName: { type: 'string' },
  },
}

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

  ctx.tools.register({
    name: 'machine_pin',
    description: 'Pin the current session to a machine so subsequent machine_dispatch calls on the same context route there without naming the machine again. Pass machine="local" to clear the pin.',
    parameters: {
      type: 'object',
      properties: {
        machine: { type: 'string', description: 'Machine id to pin, or "local" to clear the pin and run locally.' },
      },
      required: ['machine'],
    },
    output: {
      schema: PIN_OUTPUT,
      render: render((v) => (v.pinned ? `session pinned to ${v.machineName} (${v.machineId})` : 'pin cleared — session runs locally')),
    },
    async execute(args, exec) {
      const d = await needDomain()
      const contextId = exec.contextId ?? exec.sessionId ?? ''
      const machineId = String(args.machine)

      if (machineId === 'local' || machineId === '') {
        await d.clearPin(contextId)
        return { contextId, pinned: false, machineId: '' }
      }

      const rec = d.getMachine(machineId)
      if (rec === undefined) throw new Error(`machine "${machineId}" not found — run machine_list`)
      if (rec.sshHost === undefined || rec.sshHost === '') {
        throw new Error(`machine "${machineId}" has no sshHost — set it with machine_add`)
      }

      await d.setPin(contextId, machineId)
      return { contextId, pinned: true, machineId, machineName: rec.name }
    },
  })

  ctx.tools.register({
    name: 'machine_pin_status',
    description: 'Show which machine the current session is pinned to (or "local" if un-pinned).',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: PIN_OUTPUT,
      render: render((v) => (v.pinned ? `pinned → ${v.machineName} (${v.machineId})` : 'not pinned — running locally')),
    },
    async execute(_args, exec) {
      const d = await needDomain()
      const contextId = exec.contextId ?? exec.sessionId ?? ''
      const pin = d.getPin(contextId)
      if (pin === undefined) return { contextId, pinned: false, machineId: '' }
      const rec = d.getMachine(pin.machineId)
      return { contextId, pinned: true, machineId: pin.machineId, machineName: rec?.name ?? pin.machineId }
    },
  })
}
