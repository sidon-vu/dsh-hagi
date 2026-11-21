/**
 * Test cho `dev-hg-guard`. Không thư viện, chạy: node test/guard.mjs
 * ctx giả chỉ cần `tools.guard` để bắt lấy hàm kiểm.
 */
import { apply } from '../src/guard.js'

let failures = 0
const check = (label, condition, detail) => {
  if (condition) return
  failures++
  console.error(`FAIL  ${label}${detail === undefined ? '' : ' :: ' + JSON.stringify(detail)}`)
}
const eq = (label, actual, expected) => check(label, actual === expected, { actual, expected })

/** apply(config) rồi trả về hàm guard đã đăng ký. */
const guardOf = (config) => {
  const captured = []
  apply({ tools: { guard: (fn) => captured.push(fn) } }, config)
  if (captured.length !== 1) throw new Error(`guard đăng ký ${captured.length} lần`)
  return captured[0]
}

const call = (guard, name, args) => guard({ name, arguments: args })

// --- mặc định: chặn sửa cấu hình git
{
  const g = guardOf()
  check('mặc định chặn .git/config', typeof call(g, 'write', { file_path: 'D:/x/.git/config', content: 'x' }) === 'string')
  check('mặc định chặn hook', typeof call(g, 'edit', { file_path: 'D:\\x\\.git\\hooks\\pre-commit', new_string: 'x' }) === 'string')
  eq('file bình thường được qua', call(g, 'write', { file_path: 'D:/x/src/a.js', content: 'x' }), undefined)
  eq('tool khác không bị đụng', call(g, 'read', { file_path: 'D:/x/.git/config' }), undefined)
}

// --- protectedPaths từ config là CỘNG vào mặc định
{
  const g = guardOf({ protectedPaths: ['research/inbox/**'] })
  check('config chặn inbox', typeof call(g, 'write', { file_path: 'D:/w/research/inbox/clone/a.js', content: 'x' }) === 'string')
  check('mặc định vẫn còn hiệu lực', typeof call(g, 'write', { file_path: 'D:/x/.git/config', content: 'x' }) === 'string')
  eq('ngoài inbox qua', call(g, 'write', { file_path: 'D:/w/research/references/a/NOTICE.md', content: 'x' }), undefined)
}

// --- allow: ngoại lệ trong vùng bị chặn
{
  const g = guardOf({
    protectedPaths: [{ pattern: 'research/inbox/**', allow: ['research/inbox/**/_quarantine/**', 'research/inbox/**/ANALYSIS.md'], why: 'inbox read-only' }],
  })
  eq('_quarantine được phép', call(g, 'write', { file_path: 'D:/w/research/inbox/o__r/_quarantine/CLAUDE.md', content: 'x' }), undefined)
  eq('ANALYSIS.md được phép', call(g, 'write', { file_path: 'D:/w/research/inbox/o__r/ANALYSIS.md', content: 'x' }), undefined)
  check('file khác trong inbox bị chặn', typeof call(g, 'write', { file_path: 'D:/w/research/inbox/o__r/src/a.js', content: 'x' }) === 'string')
}

// --- lệnh phá huỷ
{
  const g = guardOf()
  check('chặn push --force', typeof call(g, 'pwsh', { command: 'git push --force origin main' }) === 'string')
  eq('cho qua push thường', call(g, 'pwsh', { command: 'git push origin main' }), undefined)
  eq('cho qua --force-with-lease', call(g, 'pwsh', { command: 'git push --force-with-lease origin main' }), undefined)
  check('chặn reset --hard', typeof call(g, 'bash', { command: 'git reset --hard HEAD~1' }) === 'string')
  eq('cho qua rm -rf (không nằm trong mặc định)', call(g, 'pwsh', { command: 'Remove-Item D:\\tmp\\x -Recurse -Force' }), undefined)
}

// --- denyCommands từ config
{
  const g = guardOf({ denyCommands: ['npm\\s+publish'] })
  check('chặn lệnh cấu hình', typeof call(g, 'pwsh', { command: 'npm publish --access public' }) === 'string')
  eq('lệnh khác qua', call(g, 'pwsh', { command: 'npm pack' }), undefined)
}

// --- secret scan
{
  const g = guardOf()
  check('chặn token trong nội dung', typeof call(g, 'write', { file_path: 'D:/x/a.md', content: 'token: ghp_' + 'a'.repeat(24) }) === 'string')
  check('chặn token trong lệnh', typeof call(g, 'pwsh', { command: 'curl -H "x: sk-' + 'b'.repeat(24) + '"' }) === 'string')
  eq('nội dung thường qua', call(g, 'write', { file_path: 'D:/x/a.md', content: 'token placeholder ghp_…' }), undefined)
  eq('secretScan:false tắt quét', call(guardOf({ secretScan: false }), 'write', { file_path: 'D:/x/a', content: 'ghp_' + 'a'.repeat(24) }), undefined)
  eq('secretAllowPaths bỏ qua', call(guardOf({ secretAllowPaths: ['**/fixtures/**'] }), 'write', { file_path: 'D:/x/fixtures/token.txt', content: 'ghp_' + 'a'.repeat(24) }), undefined)
}

// --- disableDefaults
{
  const g = guardOf({ disableDefaults: true })
  eq('tắt mặc định: .git/config qua', call(g, 'write', { file_path: 'D:/x/.git/config', content: 'x' }), undefined)
  eq('tắt mặc định: push --force qua', call(g, 'pwsh', { command: 'git push --force' }), undefined)
  check('nhưng rule tự thêm vẫn chạy', typeof call(guardOf({ disableDefaults: true, denyCommands: ['git\\s+push'] }), 'pwsh', { command: 'git push' }) === 'string')
}

// --- config rác không làm sập
{
  for (const bad of [null, undefined, 'x', 42, [], { protectedPaths: 'không phải mảng' }, { protectedPaths: [null, 3, { pattern: '[' }] }, { denyCommands: [{ pattern: '([' }] }]) {
    const g = guardOf(bad)
    eq(`config rác ${JSON.stringify(bad)} vẫn cho qua file thường`, call(g, 'write', { file_path: 'D:/x/a.js', content: 'ok' }), undefined)
  }
  eq('args không phải object', call(guardOf(), 'write', null), undefined)
}

// --- lỗi nội bộ: cho qua thay vì chặn cả phiên
{
  const g = guardOf({ protectedPaths: ['**/*'] })
  const bomb = { get arguments() { throw new Error('boom') } }
  const original = console.warn
  console.warn = () => {}
  try {
    eq('lỗi nội bộ → cho qua', g(bomb), undefined)
  } finally {
    console.warn = original
  }
}

if (failures === 0) console.log('ok: guard — toàn bộ assertion pass')
process.exitCode = failures === 0 ? 0 : 1
