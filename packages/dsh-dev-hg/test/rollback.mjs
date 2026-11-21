/**
 * Test của row `dev-hg-rollback`: profile giả trong tmp → checkpoint → sửa
 * `cordis.patch.yml` + thêm file → rollback → trạng thái phải quay về; đồng
 * thời kiểm dry-run không ghi, pop chỉ sau khi confirm, và schema đúng chuẩn.
 *
 *   node test/rollback.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkpoint, rollback, clearHistory } from '../src/rollback.js'
import { apply } from '../src/rollback-tool.js'

let failures = 0
const check = (label, condition, detail) => {
  if (condition) return
  failures++
  console.error(`FAIL  ${label}${detail === undefined ? '' : ' :: ' + JSON.stringify(detail)}`)
}
const equal = (label, actual, expected) => check(label, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected })

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text, 'utf8')
}
const read = (file) => fs.readFileSync(file, 'utf8')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rollback-'))
try {
  const profile = path.join(root, 'profile')
  write(path.join(profile, 'package.json'), JSON.stringify({
    name: 'lab', private: true,
    dependencies: { 'dsh-a': '^1.0.0' },
  }, null, 2))
  write(path.join(profile, 'cordis.patch.yml'), '- id: row-a\n  disabled: null\n')
  write(path.join(profile, 'node_modules', 'dsh-a', 'package.json'), JSON.stringify({ name: 'dsh-a', version: '1.2.0' }))

  // --- checkpoint ---
  const first = checkpoint({ profileDir: profile })
  equal('depth sau save 1', first.depth, 1)
  check('history file được tạo', fs.existsSync(path.join(profile, 'rollback-history.json')))
  check('history không tự chứa nó trong files', !JSON.parse(read(path.join(profile, 'rollback-history.json'))).snapshots[0].files['rollback-history.json'])

  // --- áp một thay đổi ---
  write(path.join(profile, 'cordis.patch.yml'), '- id: row-a\n- id: row-b\n')
  write(path.join(profile, 'newfile.txt'), 'file mới sau thay đổi\n')

  // --- restore dry-run ---
  const dry = rollback({ profileDir: profile, write: false })
  equal('dry-run báo dryRun', dry.dryRun, true)
  equal('dry-run giữ depth', dry.depth, 1)
  check('dry-run KHÔNG ghi patch', read(path.join(profile, 'cordis.patch.yml')).includes('row-b'))
  check('dry-run KHÔNG pop history', JSON.parse(read(path.join(profile, 'rollback-history.json'))).snapshots.length === 1)
  check('dry-run liệt kê file sẽ ghi', dry.wrote.includes('cordis.patch.yml'), dry.wrote)

  // --- restore thật ---
  const done = rollback({ profileDir: profile, write: true })
  equal('restore xong dryRun=false', done.dryRun, false)
  equal('depth về 0 sau pop', done.depth, 0)
  equal('patch về trạng thái cũ', read(path.join(profile, 'cordis.patch.yml')), '- id: row-a\n  disabled: null\n')
  check('package.json được ghi lại (có dep)', read(path.join(profile, 'package.json')).includes('dsh-a'))
  check('needsInstall có spec', done.needsInstall.includes('dsh-a@^1.0.0'), done.needsInstall)
  check('history rỗng sau pop', JSON.parse(read(path.join(profile, 'rollback-history.json'))).snapshots.length === 0)

  // rollback khi history rỗng: không ném, chỉ cảnh báo
  const empty = rollback({ profileDir: profile, write: true })
  check('empty không restore gì', empty.restored === undefined)
  check('empty báo history rỗng', empty.warnings.some((w) => w.includes('history rỗng')), empty.warnings)

  // --- limit: giữ tối đa N snapshot ---
  for (let i = 0; i < 7; i++) checkpoint({ profileDir: profile, limit: 3 })
  const kept = JSON.parse(read(path.join(profile, 'rollback-history.json')))
  equal('limit cắt còn 3', kept.snapshots.length, 3)

  // hai lần restore: lần 1 pop snapshot mới nhất, lần 2 lấy cái cũ hơn
  write(path.join(profile, 'marker.txt'), 'A\n')
  checkpoint({ profileDir: profile }) // snapshot chứa marker A
  write(path.join(profile, 'marker.txt'), 'B\n')
  rollback({ profileDir: profile, write: true })
  equal('undo 1 bước: marker về A', read(path.join(profile, 'marker.txt')), 'A\n')

  // --- clear ---
  checkpoint({ profileDir: profile })
  check('clear xoá file', clearHistory(profile) === true && !fs.existsSync(path.join(profile, 'rollback-history.json')))

  // --- history hỏng / format lạ → coi như rỗng ---
  write(path.join(profile, 'rollback-history.json'), '{"snapshots":[{"format":99}]}')
  const bad = rollback({ profileDir: profile, write: true })
  check('format lạ không restore', bad.restored === undefined)

  // --- registration + schema + tool-level ---
  const registered = []
  apply({ tools: { register: (d) => registered.push(d) } })
  equal('register 1 tool', registered.length, 1)
  const def = registered[0]
  equal('tool name', def.name, 'profile_rollback')
  const required = def.output.schema.required
  check('required là mảng chuẩn', Array.isArray(required) && required.includes('depth') && required.includes('dryRun'))
  check('parameters.action đủ 3', def.parameters.action.enum.length === 3)
  check('không có required:true trên property', !Object.values(def.output.schema.properties).some((p) => p.required === true))
  check('không có required:true trong parameters', !Object.values(def.parameters).some((p) => p.required === true))
  // type phải là chuỗi đơn — DSH từ chối `type: [...]` và enum lồng
  check('mọi property.type là string đơn', !Object.values(def.output.schema.properties).some((p) => !p.type || typeof p.type !== 'string'))

  // tool-level: save → đổi → restore dry → confirm
  const p2 = path.join(root, 'p2')
  write(path.join(p2, 'package.json'), JSON.stringify({ name: 'p2', private: true }))
  write(path.join(p2, 'cordis.patch.yml'), '- id: x\n')
  await def.execute({ action: 'save', profile: p2 }, {})
  write(path.join(p2, 'cordis.patch.yml'), '- id: x\n- id: y\n')
  const preview = await def.execute({ action: 'restore', profile: p2 }, {})
  equal('tool restore dry-run', preview.dryRun, true)
  check('tool dry-run không đổi file', read(path.join(p2, 'cordis.patch.yml')).includes('id: y'))
  const applied = await def.execute({ action: 'restore', profile: p2, confirm: true }, {})
  equal('tool confirm rollback', applied.dryRun, false)
  equal('tool patch về cũ', read(path.join(p2, 'cordis.patch.yml')), '- id: x\n')
  const text = def.output.render({}, applied)[0].text
  check('render có tiêu đề rollback', text.includes('Đã rollback'), text.slice(0, 80))

  // clear qua tool: dry rồi confirm
  await def.execute({ action: 'save', profile: p2 }, {})
  const clearDry = await def.execute({ action: 'clear', profile: p2 }, {})
  equal('tool clear dryRun', clearDry.dryRun, true)
  check('file history còn', fs.existsSync(path.join(p2, 'rollback-history.json')))
  await def.execute({ action: 'clear', profile: p2, confirm: true }, {})
  check('tool clear xoá file', !fs.existsSync(path.join(p2, 'rollback-history.json')))

  // --- args validation ---
  const argError = async (args, needle) => {
    let message = ''
    try { await def.execute(args, {}) } catch (error) { message = error.message }
    check(`args: ${needle}`, message.includes(needle), message)
  }
  await argError({ action: 'bogus' }, 'action must be save, restore, or clear')
  await argError({ action: 'save', limit: 0 }, 'limit must be an integer')
  await argError({ action: 'save', limit: 99 }, 'limit must be an integer')
  await argError({ action: 'restore', confirm: 'yes' }, 'confirm must be a boolean')
  await argError({ action: 'save', profile: 1 }, 'profile must be a string')

  if (failures === 0) console.log('ok: rollback — 30+ assertion, tất cả pass')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

if (failures > 0) process.exitCode = 1
