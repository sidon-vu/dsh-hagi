/**
 * Logic của row `dev-hg-doctor`: so trạng thái mong muốn (patch của máy) với
 * trạng thái thật của profile, rồi báo lệch. Chỉ đọc — không ghi, không sửa.
 *
 * Đọc từ đĩa (manifest profile, node_modules, các lớp patch) và, khi caller có,
 * từ `ctx.pluginManager.listBundles()` để lấy phán quyết của chính DSH
 * (`availability`, `error`, `entryId` của row còn sống hay không).
 *
 * Module thuần, không import gì từ DSH để cài từ git vẫn chạy.
 */
import fs from 'node:fs'
import path from 'node:path'

// `row-undeclared` là thông tin; mọi kind còn lại là lệch thật.
const severityOf = (kind) => (kind === 'row-undeclared' ? 'info' : 'drift')

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
}

const readJson = (file) => {
  const text = readText(file)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const exists = (target) => {
  try {
    fs.statSync(target)
    return true
  } catch {
    return false
  }
}

/**
 * Đọc các `- id:` của một patch YAML. Parser phẳng, có chủ ý: chỉ lấy id ở
 * indent nông nhất và `disabled:` đi kèm; `disabled:` lồng trong `config` bị bỏ qua.
 * @returns {Map<string, boolean|null>} id → disabled (null = bật tường minh)
 */
export function parsePatch(text) {
  const entries = new Map()
  if (typeof text !== 'string') return entries
  const lines = text.split(/\r?\n/)
  const ids = []
  for (const line of lines) {
    const match = /^(\s*)-\s+id:\s*['"]?([\w.@/-]+)['"]?\s*$/.exec(line)
    if (match !== null) ids.push({ indent: match[1].length, id: match[2] })
  }
  if (ids.length === 0) return entries
  const top = Math.min(...ids.map((entry) => entry.indent))
  const kept = ids.filter((entry) => entry.indent === top).map((entry) => entry.id)
  for (const id of kept) if (!entries.has(id)) entries.set(id, null)

  let current
  let indent = -1
  for (const line of lines) {
    const open = /^(\s*)-\s+id:\s+['"]?([\w.@/-]+)['"]?\s*$/.exec(line)
    if (open !== null) {
      current = open[1].length === top ? open[2] : undefined
      indent = open[1].length
      continue
    }
    if (current === undefined) continue
    const flag = /^(\s*)disabled:\s*(true|false|null|~)\s*$/.exec(line)
    // Thuộc tính của entry nằm ngay dưới `- id`; `disabled:` lồng sâu hơn là của `config`.
    if (flag === null || flag[1].length > indent + 2) continue
    entries.set(current, flag[2] === 'true' ? true : flag[2] === 'false' ? false : null)
  }
  return entries
}

/** Dependencies của profile, và các patch layer theo thứ tự áp dụng (cuối = thắng). */
function readState(profileDir) {
  const manifest = readJson(path.join(profileDir, 'package.json'))
  const deps = manifest !== undefined && typeof manifest.dependencies === 'object' && manifest.dependencies !== null
    ? Object.entries(manifest.dependencies).filter(([, spec]) => typeof spec === 'string')
    : []

  const layers = []
  for (const [name] of deps) {
    const dir = path.join(profileDir, 'node_modules', name)
    layers.push(path.join(dir, 'cordis.patch.yml'))
  }
  layers.push(path.join(profileDir, 'cordis.patch.yml'))

  const disabled = new Map()
  const claimed = new Set()
  for (const layer of layers) {
    const entries = parsePatch(readText(layer))
    for (const [id, value] of entries) {
      disabled.set(id, value)
      claimed.add(id)
    }
  }
  return { deps, disabled, claimed }
}

/** Row còn sống khi DSH báo có `entryId`; không có pluginManager thì bỏ qua bước này. */
function liveRowIds(bundles) {
  if (bundles === undefined) return undefined
  const live = new Set()
  for (const bundle of bundles) {
    for (const row of bundle.rows ?? []) if (typeof row.entryId === 'string') live.add(row.rowId)
  }
  return live
}

const isLocalSpec = (spec) => /^(?:link|file):/.test(spec) || spec.startsWith('.')
const isExactVersion = (spec) => /^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(spec)

const localTarget = (profileDir, spec) => {
  const raw = spec.replace(/^(?:link|file):/, '')
  return path.isAbsolute(raw) ? raw : path.resolve(profileDir, raw)
}

/**
 * So profile với trạng thái mong muốn.
 * @param {{
 *   profileDir: string,
 *   desiredText?: string,
 *   desiredPath?: string,
 *   bundles?: object[],
 *   includeUndeclared?: boolean,
 *   limit?: number,
 * }} options
 */
export function doctor(options) {
  const profileDir = path.resolve(options.profileDir)
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const findings = []
  const add = (kind, target, detail) => findings.push({ kind, severity: severityOf(kind), target, detail })

  const state = exists(path.join(profileDir, 'package.json')) ? readState(profileDir) : { deps: [], disabled: new Map(), claimed: new Set() }
  if (!exists(path.join(profileDir, 'package.json'))) add('profile-missing', profileDir, 'không có package.json — sai thư mục profile?')

  const desired = options.desiredText === undefined ? new Map() : parsePatch(options.desiredText)
  if (options.desiredPath !== undefined && options.desiredText === undefined) {
    add('desired-missing', options.desiredPath, 'không đọc được patch mong muốn')
  }

  const byName = new Map((options.bundles ?? []).map((bundle) => [bundle.name, bundle]))
  const declared = new Set(state.deps.map(([name]) => name))

  // --- bundle: dependency khai mà không dùng được ---
  const missingSeen = new Set()
  const reportMissing = (name, detail) => {
    if (missingSeen.has(name)) return
    missingSeen.add(name)
    add('bundle-missing', name, detail)
  }
  for (const [name, spec] of state.deps) {
    const resolved = isLocalSpec(spec) ? localTarget(profileDir, spec) : undefined
    if (resolved !== undefined && !exists(resolved)) add('link-missing', name, `${spec} → ${resolved} không tồn tại`)
    if (!exists(path.join(profileDir, 'node_modules', name))) reportMissing(name, 'khai trong dependencies nhưng không có trong node_modules')

    const bundle = byName.get(name)
    if (bundle === undefined) continue
    if (bundle.availability === 'missing') reportMissing(name, 'DSH báo không đọc được file của bundle')
    if (typeof bundle.version === 'string' && isExactVersion(spec) && bundle.version !== spec) {
      add('version-mismatch', name, `khai ${spec}, đang cài ${bundle.version}`)
    }
    const error = bundle.error
    if (error === undefined) continue
    if (error.code === 'incompatible-version') {
      const needs = (error.incompatible ?? []).map((item) => `${item.name} ${JSON.stringify(item.requirements)}`).join('; ')
      add('version-incompatible', name, needs.length > 0 ? needs : String(error.code))
    } else {
      add('bundle-error', name, error.diagnostic ?? String(error.code))
    }
  }

  // --- row: mong muốn bật nhưng thực tế không sống ---
  const live = liveRowIds(options.bundles)
  // Row được coi là có thật khi DSH khai nó, hoặc một patch trên máy (kể cả patch
  // của chính profile) nhắc tới nó — hàng builtin chỉ xuất hiện ở dạng override.
  const known = new Set(state.claimed)
  for (const bundle of options.bundles ?? []) for (const row of bundle.rows ?? []) known.add(row.rowId)
  for (const [rowId, wanted] of desired) {
    if (wanted === true) continue
    // Hai nguồn độc lập: patch của máy nói gì, và DSH có nạp entry hay không.
    if (state.disabled.get(rowId) === true) add('row-disabled', rowId, 'patch của máy đang tắt row này')
    if (!known.has(rowId)) add('row-unknown', rowId, 'không patch nào trên máy khai row này')
    else if (live !== undefined && !live.has(rowId)) add('row-not-live', rowId, 'row có khai nhưng DSH không nạp entry nào')
  }

  // --- row lạ: đang sống mà không patch máy nào nhắc tới (tuỳ chọn) ---
  if (options.includeUndeclared === true && live !== undefined) {
    for (const rowId of live) if (!desired.has(rowId) && !state.disabled.has(rowId)) add('row-undeclared', rowId, 'row đang sống, không patch máy nào khai')
  }

  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'drift' ? -1 : 1))
  const drift = findings.filter((item) => item.severity === 'drift').length
  return {
    profile: profileDir,
    desired: options.desiredPath ?? '',
    bundles: declared.size,
    desiredRows: desired.size,
    drift,
    findings: findings.slice(0, limit),
    truncated: findings.length > limit,
  }
}
