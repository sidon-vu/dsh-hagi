// E2E: machine_sessions on vHaGi — scan ~/.dsh/sessions/*/session-*/ via SSH.
// Run: node packages/dsh-machines-hg/test/sessions-e2e.mjs
import { sshExecWithRetry } from '../src/ssh.js'

const HOST = process.env.MACHINES_E2E_HOST
const USER = process.env.MACHINES_E2E_USER
if (HOST === undefined || USER === undefined) {
  console.log('set MACHINES_E2E_HOST + MACHINES_E2E_USER first')
  process.exit(1)
}
const device = { host: HOST, port: Number(process.env.MACHINES_E2E_PORT ?? 22), user: USER, keyPath: '' }
const remoteCmd = 'for d in ~/.dsh/sessions/*/session-*/; do [ -d "$d" ] || continue; mtime=$(stat -c %y "$d" 2>/dev/null | cut -d. -f1); sid=$(basename "$d"); echo "$mtime|$sid"; done | sort -r | head -50'

console.log('cmd:', remoteCmd)
const result = await sshExecWithRetry(device, remoteCmd, { timeoutMs: 30_000 })
console.log('ok:', result.ok, 'exit:', result.exitCode)
console.log('--- stdout ---')
console.log(result.stdout.split('\n').slice(0, 15).join('\n'))
if (result.stderr.trim() !== '') {
  console.log('--- stderr ---')
  console.log(result.stderr.split('\n').slice(0, 5).join('\n'))
}
process.exit(result.ok ? 0 : 1)
