/**
 * Test của row `dev-hg-doctor`: fixture profile giả trong tmp, mỗi loại lệch một
 * ca, rồi kiểm tool registration đúng JSON Schema. Không thư viện, không mạng.
 *
 *   node test/doctor.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { doctor, parsePatch } from '../src/doctor.js'
import { apply } from '../src/doctor-tool.js'

let failures = 0
const check = (label, condition, detail) => {
  if (condition) return
  failures++
  console.error(`FAIL  ${label}${detail === undefined ? '' : ' :: ' + JSON.stringify(detail)}`)
}
const equal = (label, actual, expected) => check(label, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected })
const kinds = (report) => report.findings.map((item) => `${item.kind}:${item.target}`)

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text, 'utf8')
}

const bundlePatch = (rows) => rows.map((row) => `- insert:\n    - id: ${row}\n      name: './src/x.js'\n`).join('')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-'))
try {
  const profile = path.join(root, 'profile')
  const linked = path.join(root, 'linked-bundle')
  write(path.join(linked, 'package.json'), JSON.stringify({ name: 'dsh-linked', version: '0.4.0', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
  write(path.join(linked, 'cordis.patch.yml'), bundlePatch(['row-alive', 'row-off', 'row-shared']))

  write(path.join(profile, 'package.json'), JSON.stringify({
    name: 'p', private: true,
    dependencies: {
      'dsh-linked': `link:${linked.replace(/\\/g, '/')}`,
      'dsh-gone': 'link:D:/khong/co/that',
      'dsh-absent': '^1.0.0',
    },
    dsh: { profile: { bundles: ['dsh-linked', 'dsh-gone', 'dsh-absent'] } },
  }, null, 2))
  write(path.join(profile, 'node_modules', 'dsh-linked', 'package.json'),
    JSON.stringify({ name: 'dsh-linked', version: '0.4.0', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
  // máy tắt nhầm row-off (desired bật), để row-shared bật, và override một row builtin
  write(path.join(profile, 'cordis.patch.yml'), [
    '- id: row-off',
    '  disabled: true',
    '- id: row-shared',
    '  disabled: null',
    '- id: row-unknown',
    '  config:',
    '    checkIntervalMinutes: 30',
  ].join('\n'))

  const desired = path.join(root, 'desired.yml')
  write(desired, [
    '- id: row-alive',
    '  disabled: null',
    '- id: row-off',
    '  disabled: null',
    '- id: row-ghost',        // không patch nào trên máy khai → row mất tích
    '  disabled: null',
    '- id: row-unknown',      // có trong patch profile nhưng lồng config
    '  config:',
    '    checkIntervalMinutes: 30',
    '    disabled: true',      // lồng trong config → parser phẳng phải bỏ qua
    '- id: row-shared',
    '  disabled: null',
  ].join('\n'))

  // --- parser patch ---
  const parsed = parsePatch(fs.readFileSync(desired, 'utf8'))
  equal('parse: giữ mọi id', [...parsed.keys()], ['row-alive', 'row-off', 'row-ghost', 'row-unknown', 'row-shared'])
  equal('parse: id trong insert vẫn giữ', [...parsePatch('- insert:\n    - id: a\n      disabled: true\n').keys()], ['a'])
  equal('parse: insert gắn đúng disabled', parsePatch('- insert:\n    - id: a\n      disabled: true\n').get('a'), true)
  equal('parse: row bật = null', parsed.get('row-alive'), null)
  equal('parse: disabled lồng trong config không thắng', parsed.get('row-unknown'), null)
  equal('parse: disabled: true', parsePatch('- id: a\n  disabled: true\n').get('a'), true)
  equal('parse: rỗng', parsePatch('').size, 0)

  // --- DSH nói gì (mô phỏng listBundles của chính DSH) ---
  const bundles = [
    { name: 'dsh-linked', availability: 'profile', installed: true, enabled: true, version: '0.4.0', rows: [
      { rowId: 'row-alive', moduleName: './src/x.js', entryId: 'e1' },
      { rowId: 'row-off', moduleName: './src/x.js' },
      { rowId: 'row-shared', moduleName: './src/x.js', entryId: 'e3' },
    ] },
    { name: 'dsh-gone', availability: 'missing', installed: true, enabled: true, error: { code: 'unaddressable' } },
    { name: 'dsh-absent', availability: 'missing', installed: true, enabled: true, version: '0.9.0', error: { code: 'incompatible-version', incompatible: [{ name: '@deepseek-ai/dsh', version: '0.2.2-rc.5', runtimeVersion: '0.9.0', requirements: { 'engines.dsh': '>=0.9.0' } }] } },
  ]

  const report = doctor({
    profileDir: profile,
    desiredText: fs.readFileSync(desired, 'utf8'),
    desiredPath: desired,
    bundles,
  })
  const got = kinds(report)
  check('link gãy được báo', got.includes('link-missing:dsh-gone'), got)
  check('bundle không có trong node_modules', got.includes('bundle-missing:dsh-absent'), got)
  check('bundle thiếu file có trong bundle list', got.filter((k) => k === 'bundle-missing:dsh-gone').length >= 1, got)
  check('bundle error', got.includes('bundle-error:dsh-gone'), got)
  check('version bị DSH từ chối', got.includes('version-incompatible:dsh-absent'), got)
  check('row bị tắt nhầm', got.includes('row-disabled:row-off'), got)
  check('row khai mà không sống', got.includes('row-not-live:row-off'), got)
  check('row không patch nào khai', got.includes('row-unknown:row-ghost'), got)
  check('row override trong patch profile không bị coi là mất tích', !got.includes('row-unknown:row-unknown'), got)
  check('row sống đúng desired thì im', !got.includes('row-not-live:row-shared'), got)
  check('mọi finding có severity hợp lệ', report.findings.every((item) => item.severity === 'drift' || item.severity === 'info'))
  check('drift đếm > 0', report.drift > 0, report.drift)
  equal('desiredRows', report.desiredRows, 5)
  equal('bundles', report.bundles, 3)

  // --- limit + truncated ---
  const short = doctor({ profileDir: profile, desiredText: '', bundles, limit: 1 })
  equal('limit cắt findings', short.findings.length, 1)
  equal('truncated', short.truncated, true)

  // --- không có pluginManager: chỉ kiểm cấu trúc, không kiểm row sống ---
  const diskOnly = doctor({ profileDir: profile, desiredText: fs.readFileSync(desired, 'utf8'), includeUndeclared: false })
  check('không bundles: vẫn báo link gãy', kinds(diskOnly).includes('link-missing:dsh-gone'), kinds(diskOnly))
  check('không bundles: vẫn báo row bị tắt', kinds(diskOnly).includes('row-disabled:row-off'))

  // --- includeUndeclared ---
  const withUndeclared = doctor({ profileDir: profile, desiredText: '[]\n', bundles, includeUndeclared: true })
  check('row lạ khi includeUndeclared', kinds(withUndeclared).includes('row-undeclared:row-alive'), kinds(withUndeclared))
  equal('row lạ là info, không phải drift', withUndeclared.findings.find((item) => item.kind === 'row-undeclared')?.severity, 'info')

  // --- desired không đọc được ---
  const badDesired = doctor({ profileDir: profile, desiredPath: path.join(root, 'khong-co.yml') })
  check('desired thiếu → báo', kinds(badDesired).includes(`desired-missing:${path.join(root, 'khong-co.yml')}`), kinds(badDesired))

  // --- profile sai ---
  const badProfile = doctor({ profileDir: path.join(root, 'khong-co-profile') })
  check('profile thiếu → báo', kinds(badProfile).includes('profile-missing:' + path.join(root, 'khong-co-profile')), kinds(badProfile))
  equal('profile sai: không crash', badProfile.bundles, 0)

  // --- registration + schema + render ---
  const registered = []
  const fakeCtx = {
    tools: { register: (definition) => registered.push(definition) },
    pluginManager: { listBundles: async () => bundles.map((b) => ({ ...b })) },
  }
  apply(fakeCtx)
  equal('register đúng 1 tool', registered.length, 1)
  const def = registered[0]
  equal('tool name', def.name, 'profile_doctor')
  check('description không rỗng', def.description.length > 40)
  check('có parameters.profile', Object.keys(def.parameters).includes('profile'))
  check('có output.schema', def.output.schema.type === 'object')
  const requiredArray = Array.isArray(def.output.schema.required) && def.output.schema.required.includes('findings')
  check('required là mảng chuẩn', requiredArray)

  const value = await def.execute({ profile, desired, limit: 200 }, {})
  equal('finding đủ field schema', Object.keys(value.findings[0]).sort(), ['detail', 'kind', 'severity', 'target'])
  const text = def.output.render({}, value)[0].text
  check('render có kind', text.includes('[link-missing]'), text.slice(0, 200))
  check('render có tiêu đề', text.includes('Lệch trạng thái'))

  // --- pluginManager lỗi thì vẫn chạy ---
  const brokenCtx = { tools: { register: (d) => registered.push(d) }, pluginManager: { listBundles: async () => { throw new Error('boom') } } }
  apply(brokenCtx)
  const fromBroken = await registered.at(-1).execute({ profile }, {})
  equal('manager lỗi → lùi về đọc đĩa', fromBroken.drift >= 0, true)

  // --- args validation ---
  const argError = async (args, needle) => {
    let message = ''
    try {
      await def.execute(args, {})
    } catch (error) {
      message = error.message
    }
    check(`args: ${needle}`, message.includes(needle), message)
  }
  await argError({ profile: 42 }, 'profile must be a string')
  await argError({ limit: 1.5 }, 'limit must be an integer')
  await argError({ includeUndeclared: 'yes' }, 'includeUndeclared must be a boolean')

  if (failures === 0) console.log('ok: doctor — 30+ assertion, tất cả pass')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

if (failures > 0) process.exitCode = 1
