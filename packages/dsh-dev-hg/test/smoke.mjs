/**
 * Smoke test không phụ thuộc thư viện: fixture trong tmp, gọi audit + register
 * tool với ctx giả, rồi tự kiểm giá trị trả về đúng JSON schema đã khai.
 *
 *   node test/smoke.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { audit, auditPackage, listProfilePackages } from '../src/audit.js'
import { apply } from '../src/tool.js'

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

const makePackage = (dir, { name, localeFiles = [], source, readme = '# pkg\n', dsh = { bundle: { patch: './cordis.patch.yml' } } }) => {
  write(path.join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0', ...(dsh ? { dsh } : {}) }, null, 2))
  write(path.join(dir, 'cordis.patch.yml'), '- insert: []\n')
  if (source !== undefined) write(path.join(dir, 'src', 'index.js'), source)
  if (readme !== undefined) write(path.join(dir, 'README.md'), readme)
  for (const lang of localeFiles) write(path.join(dir, 'locale', `${lang}.json`), '{}\n')
}

const schemaProblems = (schema, value, at = '$') => {
  const problems = []
  switch (schema.type) {
    case 'object': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return [`${at} not object`]
      const props = schema.properties ?? {}
      for (const key of Array.isArray(schema.required) ? schema.required : []) {
        if (!(key in value)) problems.push(`${at}.${key} missing`)
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!(key in props)) problems.push(`${at}.${key} unexpected`)
      }
      for (const key of Object.keys(props)) {
        if (key in value) problems.push(...schemaProblems(props[key], value[key], `${at}.${key}`))
      }
      return problems
    }
    case 'array': {
      if (!Array.isArray(value)) return [`${at} not array`]
      const items = schema.items
      if (items === undefined) return problems
      value.forEach((item, i) => problems.push(...schemaProblems(items, item, `${at}[${i}]`)))
      return problems
    }
    case 'string': return typeof value === 'string' ? [] : [`${at} not string`]
    case 'integer': return Number.isInteger(value) ? [] : [`${at} not integer`]
    case 'boolean': return typeof value === 'boolean' ? [] : [`${at} not boolean`]
    default: return []
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-audit-'))
try {
  // --- fixtures ---
  const noLocale = path.join(root, 'node_modules', 'dsh-no-locale')
  makePackage(noLocale, {
    name: 'dsh-no-locale',
    source: [
      'export const a = 1',
      "const label = '设置面板'",          // CJK thật → đếm
      '// 中文注释 không được đếm',        // comment → bỏ
      '/* 块注释 */',
      "const ok = 'settings'",
    ].join('\n'),
    readme: '# Plugin\n\n这是一个中文说明文档，没有英文。\n',
  })

  const noVi = path.join(root, 'node_modules', '@scope', 'dsh-no-vi')
  makePackage(noVi, { name: '@scope/dsh-no-vi', localeFiles: ['en', 'zh'], source: "export const a = 'clean'\n" })

  const hasVi = path.join(root, 'node_modules', 'dsh-has-vi')
  makePackage(hasVi, { name: 'dsh-has-vi', localeFiles: ['en', 'zh', 'vi'], source: 'export const a = 1\n' })

  const notAPlugin = path.join(root, 'node_modules', 'some-lib')
  write(path.join(notAPlugin, 'package.json'), JSON.stringify({ name: 'some-lib', version: '1.0.0' }))
  write(path.join(notAPlugin, 'index.js'), "const x = '中文'\n")

  const repo = path.join(root, 'repo')
  makePackage(path.join(repo, 'packages', 'pkg-r'), { name: 'pkg-r', source: "const t = '面板'\n" })

  // --- package level ---
  const a = auditPackage(noLocale)
  equal('verdict no-locale', a.verdict, 'no-locale')
  equal('cjkLines bỏ comment', a.cjkLines, 1)
  equal('cjkFiles', a.cjkFiles, 1)
  check('readme CJK > 0', a.readmeCjkPercent > 20, a.readmeCjkPercent)

  equal('verdict no-vi', auditPackage(noVi).verdict, 'no-vi')
  equal('locales no-vi', auditPackage(noVi).locales, ['en', 'zh'])
  equal('verdict has-vi', auditPackage(hasVi).verdict, 'has-vi')
  equal('auditPackage non-package', auditPackage(path.join(root, 'khong-ton-tai')), undefined)

  // --- profile level ---
  equal('listProfilePackages chỉ lấy bundle', listProfilePackages(root).length, 3)

  const result = audit({ profileDir: root, limit: 20 })
  equal('scanned', result.scanned, 3)
  equal('summary', result.summary, { missingLocale: 1, missingVi: 1, hasVi: 1 })
  equal('thứ tự worst-first', result.packages.map((p) => p.verdict), ['no-locale', 'no-vi', 'has-vi'])
  equal('truncated=false', result.truncated, false)

  const limited = audit({ profileDir: root, limit: 1 })
  equal('truncated khi limit', { n: limited.packages.length, t: limited.truncated }, { n: 1, t: true })

  // --- target là thư mục repo có packages/* ---
  const repoResult = audit({ target: repo })
  equal('target repo', repoResult.packages.map((p) => p.name), ['pkg-r'])

  // --- target là package đơn lẻ ---
  equal('target package', audit({ target: noVi }).packages.map((p) => p.name), ['@scope/dsh-no-vi'])

  // --- lỗi rõ ràng ---
  let threw = ''
  const savedEnv = process.env.DSH_PROFILE_DIR
  delete process.env.DSH_PROFILE_DIR
  try {
    audit({})
  } catch (error) {
    threw = error.message
  }
  process.env.DSH_PROFILE_DIR = savedEnv
  check('thiếu profile → báo lỗi', threw.includes('DSH_PROFILE_DIR'), threw)

  // --- plugin registration + schema ---
  const registered = []
  apply({ tools: { register: (definition) => registered.push(definition) } })
  equal('register đúng 1 tool', registered.length, 1)
  const def = registered[0]
  equal('tool name', def.name, 'i18n_audit')
  check('description không rỗng', def.description.length > 40)
  check('có parameters', Object.keys(def.parameters).includes('target'))
  check('có output.schema', def.output.schema.type === 'object')

  const value = await def.execute({ target: noLocale }, {})
  equal('schema violations', schemaProblems(def.output.schema, value), [])

  // Chống tái phát: `required: true` trên property là dialect của defineTool, KHÔNG
  // phải JSON Schema chuẩn. Dùng sai thì DSH từ chối activate row (đã xảy ra ở 0.2.0).
  const perPropertyRequired = []
  const walkSchema = (node, at = '$') => {
    if (node === null || typeof node !== 'object') return
    if (node.properties) {
      for (const [key, child] of Object.entries(node.properties)) {
        if (child && child.required === true) perPropertyRequired.push(`${at}.${key}`)
        walkSchema(child, `${at}.${key}`)
      }
    }
    if (node.items) walkSchema(node.items, `${at}[]`)
  }
  walkSchema(def.output.schema)
  equal('output schema không dùng required:true trên property', perPropertyRequired, [])

  const text = def.output.render({}, value)[0].text
  check('render có tên package', text.includes('dsh-no-locale'), text.slice(0, 120))
  check('render có verdict', text.includes('không có locale'))

  // --- args validation ---
  let argError = ''
  try {
    await def.execute({ target: 42 }, {})
  } catch (error) {
    argError = error.message
  }
  check('target sai kiểu → lỗi', argError.includes('target must be a string'), argError)

  if (failures === 0) console.log('ok: 20+ assertion, tất cả pass')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

if (failures > 0) process.exitCode = 1
