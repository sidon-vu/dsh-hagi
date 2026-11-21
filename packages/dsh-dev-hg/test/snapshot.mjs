/**
 * Test của row `dev-hg-snapshot`: profile giả trong tmp → export ra manifest →
 * xoá `cordis.patch.yml` → import lại → patch phải quay về; đồng thời kiểm
 * manifest không chứa secret và tool registration đúng JSON Schema.
 *
 *   node test/snapshot.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { exportProfile, importProfile } from '../src/snapshot.js'
import { apply } from '../src/snapshot-tool.js'

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

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-'))
try {
  const profile = path.join(root, 'profile')
  const linked = path.join(root, 'dsh-linked')
  write(path.join(linked, 'package.json'), JSON.stringify({ name: 'dsh-linked', version: '0.4.0' }))

  write(path.join(profile, 'package.json'), JSON.stringify({
    name: 'lab', private: true,
    dependencies: {
      'dsh-linked': `link:${linked.replace(/\\/g, '/')}`,
      'dsh-registry': '^1.0.0',
    },
    dsh: { profile: { bundles: ['dsh-linked', 'dsh-registry'] } },
  }, null, 2))
  // một file config + một file nhạy cảm + một file có secret trong nội dung
  write(path.join(profile, 'cordis.patch.yml'), '- id: row-a\n  disabled: null\n')
  write(path.join(profile, 'notes.txt'), 'ghi chú thường\n')
  write(path.join(profile, 'credentials.yaml'), 'token: ghp_abcdefghijklmnopqrstuvwxyz\n')
  write(path.join(profile, 'leak.txt'), 'sk-abcdefghijklmnopqrstuvwxyz123456\n')
  write(path.join(profile, 'node_modules', 'dsh-linked', 'package.json'), JSON.stringify({ name: 'dsh-linked', version: '0.4.0' }))
  write(path.join(profile, 'node_modules', 'dsh-registry', 'package.json'), JSON.stringify({ name: 'dsh-registry', version: '1.0.2' }))

  // --- export ---
  const snap = exportProfile({ profileDir: profile })
  equal('format', snap.format, 1)
  equal('name', snap.name, 'lab')
  equal('2 bundle', snap.bundles.length, 2)
  equal('version của link được ghi', snap.bundles.find((b) => b.name === 'dsh-linked')?.version, '0.4.0')
  equal('spec giữ nguyên', snap.bundles.find((b) => b.name === 'dsh-registry')?.spec, '^1.0.0')
  check('bundle missing=false khi có node_modules', snap.bundles.every((b) => b.missing === false))
  check('manifest chỉ giữ field an toàn', !('scripts' in snap.manifest) && snap.manifest.dsh !== undefined)

  const fileNames = Object.keys(snap.files).sort()
  check('có cordis.patch.yml', fileNames.includes('cordis.patch.yml'), fileNames)
  check('có notes.txt', fileNames.includes('notes.txt'), fileNames)
  check('không có credentials.yaml (tên nhạy cảm)', !fileNames.includes('credentials.yaml'), fileNames)
  check('không có leak.txt (nội dung chứa secret)', !fileNames.includes('leak.txt'), fileNames)
  check('không có package-lock.json', !fileNames.includes('package-lock.json'), fileNames)

  // manifest serialise ra JSON không chứa secret
  const serialised = JSON.stringify(snap)
  check('manifest không chứa token', !/ghp_/.test(serialised), 'manifest contains ghp_')
  check('manifest không chứa sk-', !/sk-/.test(serialised), 'manifest contains sk-')

  // --- import dry-run (không ghi) ---
  const imported = path.join(root, 'imported')
  const dry = importProfile({ snapshot: snap, targetDir: imported, write: false })
  equal('dry-run không tạo thư mục', fs.existsSync(imported), false)
  check('dry-run liệt kê file sẽ ghi', dry.wrote.includes('package.json') && dry.wrote.includes('cordis.patch.yml'), dry.wrote)

  // --- import thật ---
  const real = importProfile({ snapshot: snap, targetDir: imported, write: true })
  check('đã ghi package.json', fs.existsSync(path.join(imported, 'package.json')))
  check('đã ghi cordis.patch.yml', fs.existsSync(path.join(imported, 'cordis.patch.yml')))
  equal('patch khôi phục đúng', fs.readFileSync(path.join(imported, 'cordis.patch.yml'), 'utf8'), '- id: row-a\n  disabled: null\n')
  check('notes.txt cũng được mang', fs.existsSync(path.join(imported, 'notes.txt')))
  check('needsInstall có đủ spec', real.needsInstall.includes('dsh-linked@' + `link:${linked.replace(/\\/g, '/')}`), real.needsInstall)
  check('needsInstall có registry', real.needsInstall.includes('dsh-registry@^1.0.0'), real.needsInstall)

  // import lần hai không force → skip
  const again = importProfile({ snapshot: snap, targetDir: imported, write: true })
  check('lần hai skip file đã có', again.skipped.includes('package.json') && again.skipped.includes('cordis.patch.yml'), again)
  const forced = importProfile({ snapshot: snap, targetDir: imported, force: true, write: true })
  check('force ghi đè', forced.skipped.length === 0 && forced.wrote.includes('package.json'), forced)

  // manifest đích không mang deps rác: dependencies dựng lại từ bundles
  const nextPkg = JSON.parse(fs.readFileSync(path.join(imported, 'package.json'), 'utf8'))
  equal('deps của manifest mới', nextPkg.dependencies, {
    'dsh-linked': `link:${linked.replace(/\\/g, '/')}`,
    'dsh-registry': '^1.0.0',
  })

  // --- import manifest hỏng ---
  let badError = ''
  try {
    importProfile({ snapshot: { format: 99 }, targetDir: path.join(root, 'x'), write: false })
  } catch (error) {
    badError = error.message
  }
  check('manifest sai format → lỗi rõ', badError.includes('format'), badError)

  // --- registration + schema + render ---
  const registered = []
  apply({ tools: { register: (d) => registered.push(d) } })
  equal('register 1 tool', registered.length, 1)
  const def = registered[0]
  equal('tool name', def.name, 'profile_snapshot')
  check('description đủ dài', def.description.length > 40)
  const required = def.output.schema.required
  check('required là mảng chuẩn', Array.isArray(required) && required.includes('dryRun') && required.includes('warnings'))
  check('parameters.action là enum', def.parameters.action.enum.includes('export') && def.parameters.action.enum.includes('import'))

  // tool-level export → file thật
  const out = path.join(root, 'manifest.json')
  const exported = await def.execute({ action: 'export', profile, out }, {})
  equal('export ghi manifest', fs.existsSync(out), true)
  equal('export.bundles', exported.bundles, 2)
  const onDisk = JSON.parse(fs.readFileSync(out, 'utf8'))
  check('file manifest không chứa secret', !/ghp_|sk-/.test(fs.readFileSync(out, 'utf8')))
  equal('format trong file', onDisk.format, 1)

  // tool-level import dry-run rồi confirm
  const target2 = path.join(root, 'imported2')
  const preview = await def.execute({ action: 'import', source: out, target: target2 }, {})
  equal('import không confirm = dryRun', preview.dryRun, true)
  check('dry-run không ghi gì', !fs.existsSync(path.join(target2, 'cordis.patch.yml')))
  const done = await def.execute({ action: 'import', source: out, target: target2, confirm: true }, {})
  equal('confirm thì dryRun=false', done.dryRun, false)
  check('patch quay lại', fs.readFileSync(path.join(target2, 'cordis.patch.yml'), 'utf8').includes('row-a'))
  const text = def.output.render({}, done)[0].text
  check('render có tiêu đề', text.includes('Đã import'), text.slice(0, 120))
  check('render nhắc spec cài', text.includes('dsh-registry@^1.0.0'), text)

  // --- args validation ---
  const argError = async (args, needle) => {
    let message = ''
    try { await def.execute(args, {}) } catch (error) { message = error.message }
    check(`args: ${needle}`, message.includes(needle), message)
  }
  await argError({ action: 'export', profile: path.join(root, 'khong-co-profile') }, 'no profile directory')
  await argError({ action: 'bogus' }, 'action must be export or import')
  await argError({ action: 'import', source: out }, 'requires source')
  await argError({ action: 'import', source: out, target: target2, confirm: 'yes' }, 'confirm must be a boolean')
  await argError({ action: 'import', source: path.join(root, 'khong-co.json'), target: target2 }, 'cannot read manifest')

  if (failures === 0) console.log('ok: snapshot — 35+ assertion, tất cả pass')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

if (failures > 0) process.exitCode = 1
