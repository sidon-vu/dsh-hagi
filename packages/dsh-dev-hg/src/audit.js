/**
 * Quét một thư mục package DSH để tìm lỗ hổng bản địa hoá:
 * - không có `locale/` nào
 * - có locale nhưng thiếu `vi.json`
 * - chuỗi CJK cứng trong source (bỏ qua dòng comment)
 *
 * Module thuần, không import gì từ DSH để cài từ git vẫn chạy.
 */
import fs from 'node:fs'
import path from 'node:path'

const SOURCE_EXT = /\.(?:js|mjs|cjs|jsx|ts|tsx|vue|svelte)$/
const CJK = /[\u3400-\u9FFF\uF900-\uFAFF]/
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*|<!--)/
const LOCALE_DIRS = ['locale', 'locales']
const SKIP_ALWAYS = new Set(['node_modules', '.git', 'coverage', '.output', '.turbo'])
const MAX_FILE_BYTES = 512 * 1024
const MAX_README_CHARS = 20000

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

const listDir = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/** Đếm dòng chứa CJK trong source, bỏ comment và bỏ `dist/` khi đã có `src/`. */
function scanSource(root) {
  const hasSrc = fs.existsSync(path.join(root, 'src'))
  const skip = new Set(SKIP_ALWAYS)
  if (hasSrc) skip.add('dist')

  let files = 0
  let cjkFiles = 0
  let cjkLines = 0

  const walk = (dir) => {
    for (const entry of listDir(dir)) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(full)
        continue
      }
      if (!SOURCE_EXT.test(entry.name)) continue
      let size = 0
      try {
        size = fs.statSync(full).size
      } catch {
        continue
      }
      if (size > MAX_FILE_BYTES) continue
      let text = ''
      try {
        text = fs.readFileSync(full, 'utf8')
      } catch {
        continue
      }
      files++
      let hit = 0
      for (const line of text.split(/\r?\n/)) {
        if (!CJK.test(line) || COMMENT_LINE.test(line)) continue
        hit++
      }
      if (hit > 0) {
        cjkFiles++
        cjkLines += hit
      }
    }
  }
  walk(root)
  return { files, cjkFiles, cjkLines }
}

/** Tỉ lệ ký tự CJK trong README (phần trăm, làm tròn). */
function readmeCjkPercent(root) {
  const readme = listDir(root).find((e) => e.isFile() && /^readme.*\.md$/i.test(e.name))
  if (!readme) return 0
  try {
    const text = fs.readFileSync(path.join(root, readme.name), 'utf8').slice(0, MAX_README_CHARS)
    const chars = text.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g)?.length ?? 0
    return text.length === 0 ? 0 : Math.round((chars / text.length) * 100)
  } catch {
    return 0
  }
}

/** Thông tin bản địa hoá của một thư mục package. */
export function auditPackage(dir) {
  const pkg = readJson(path.join(dir, 'package.json'))
  if (pkg === undefined) return undefined

  const localeDir = LOCALE_DIRS.map((name) => path.join(dir, name)).find((candidate) => fs.existsSync(candidate))
  const locales = localeDir === undefined
    ? []
    : listDir(localeDir)
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => e.name.slice(0, -'.json'.length))
      .sort()

  const source = scanSource(dir)
  const verdict = locales.length === 0 ? 'no-locale' : locales.includes('vi') ? 'has-vi' : 'no-vi'

  return {
    name: typeof pkg.name === 'string' ? pkg.name : path.basename(dir),
    version: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
    verdict,
    locales,
    cjkLines: source.cjkLines,
    cjkFiles: source.cjkFiles,
    readmeCjkPercent: readmeCjkPercent(dir),
    hasClient: Boolean(pkg.dsh?.client),
  }
}

const VERDICT_RANK = { 'no-locale': 0, 'no-vi': 1, 'has-vi': 2 }
const byWorstFirst = (a, b) => (VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]) || (b.cjkLines - a.cjkLines)

const isPluginPackage = (dir) => {
  const pkg = readJson(path.join(dir, 'package.json'))
  return pkg !== undefined && typeof pkg.dsh === 'object' && pkg.dsh !== null && 'bundle' in pkg.dsh
}

/** Các package plugin đã cài trong một profile (thư mục có `node_modules`). */
export function listProfilePackages(profileDir) {
  const modules = path.join(profileDir, 'node_modules')
  const found = []
  for (const entry of listDir(modules)) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    if (entry.name.startsWith('@')) {
      for (const scoped of listDir(path.join(modules, entry.name))) {
        if (!scoped.isDirectory()) continue
        const dir = path.join(modules, entry.name, scoped.name)
        if (isPluginPackage(dir)) found.push(dir)
      }
      continue
    }
    const dir = path.join(modules, entry.name)
    if (isPluginPackage(dir)) found.push(dir)
  }
  return found
}

/**
 * Quét phạm vi: một thư mục package, hoặc cả profile.
 * @param {{ target?: string, profileDir?: string, limit?: number }} options
 */
export function audit(options = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const target = options.target

  let scope
  let dirs
  if (typeof target === 'string' && target.length > 0) {
    const resolved = path.resolve(target)
    if (!fs.existsSync(resolved)) throw new Error(`i18n_audit: không thấy đường dẫn ${resolved}`)
    if (fs.existsSync(path.join(resolved, 'package.json'))) {
      scope = resolved
      dirs = [resolved]
    } else {
      // thư mục gốc repo/nhiều package: tự tìm các package có dsh.bundle
      scope = resolved
      dirs = listProfilePackages(resolved).filter((dir) => dir.startsWith(resolved))
      if (dirs.length === 0) dirs = ['packages', '.']
        .map((sub) => path.join(resolved, sub))
        .filter((sub) => fs.existsSync(sub))
        .flatMap((sub) => listDir(sub).filter((e) => e.isDirectory()).map((e) => path.join(sub, e.name)))
        .filter(isPluginPackage)
    }
  } else {
    const profileDir = options.profileDir ?? process.env.DSH_PROFILE_DIR
    if (typeof profileDir !== 'string' || profileDir.length === 0) {
      throw new Error('i18n_audit: chưa có target và biến DSH_PROFILE_DIR không được đặt — hãy truyền target là đường dẫn package')
    }
    scope = profileDir
    dirs = listProfilePackages(profileDir)
  }

  const audited = dirs.map(auditPackage).filter((item) => item !== undefined).sort(byWorstFirst)
  const summary = {
    missingLocale: audited.filter((item) => item.verdict === 'no-locale').length,
    missingVi: audited.filter((item) => item.verdict === 'no-vi').length,
    hasVi: audited.filter((item) => item.verdict === 'has-vi').length,
  }

  return {
    scope,
    scanned: audited.length,
    summary,
    packages: audited.slice(0, limit),
    truncated: audited.length > limit,
  }
}
