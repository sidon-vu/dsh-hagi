/**
 * Logic của row `dev-hg-snapshot`: đóng gói một profile thành manifest JSON
 * (name, danh sách bundle + spec cài, nội dung `cordis.patch.yml`) và dựng lại
 * một profile mới từ manifest đó. Không kèm credentials — tên field/đường dẫn
 * có vẻ nhạy cảm bị loại khỏi `files`, và snapshot rỗng nếu không đọc được gì.
 *
 * Module thuần, không import gì từ DSH để cài từ git vẫn chạy.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Field của manifest (profile package.json) được giữ lại trong snapshot. */
const MANIFEST_FIELDS = ['name', 'private', 'dependencies', 'devDependencies', 'dsh']

/** Regex nhận diện tên file/field nhạy cảm — không bao giờ đưa vào snapshot. */
const SENSITIVE_NAME = /credential|secret|token|\.key$|\.pem$|password|passwd|\.env$/i
/** Regex quét nội dung: một file chứa mẫu secret thật thì bị loại (fail-safe). */
const SENSITIVE_BODY = /-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8')
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

const isSensitiveName = (name) => SENSITIVE_NAME.test(name)

/** Giữ lại chỉ các field an toàn của manifest profile. */
function sanitizeManifest(pkg) {
  if (pkg === null || typeof pkg !== 'object') return {}
  const clean = {}
  for (const field of MANIFEST_FIELDS) {
    if (pkg[field] !== undefined) clean[field] = pkg[field]
  }
  return clean
}

/** Thu thập các file cấu hình của profile (không đi vào node_modules). */
function collectFiles(profileDir) {
  const files = {}
  for (const entry of fs.readdirSync(profileDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const name = entry.name
    if (isSensitiveName(name)) continue
    if (name === 'package.json' || name === 'package-lock.json' || name === 'pnpm-lock.yaml') continue
    const text = readText(path.join(profileDir, name))
    if (text === undefined) continue
    if (SENSITIVE_BODY.test(text)) continue
    files[name] = text
  }
  return files
}

/**
 * Export một profile thành object snapshot.
 * @param {{ profileDir: string }} options
 * @returns {{format:number,name:string,createdAt:string,bundles:object[],manifest:object,files:object,warnings:string[]}}
 */
export function exportProfile({ profileDir }) {
  const dir = path.resolve(profileDir)
  const warnings = []
  const manifestPath = path.join(dir, 'package.json')
  if (!exists(manifestPath)) {
    warnings.push(`không có ${manifestPath} — sai thư mục profile?`)
  }
  const manifest = sanitizeManifest(readJson(manifestPath))

  const bundles = []
  const deps = manifest.dependencies ?? {}
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string') continue
    const installed = readJson(path.join(dir, 'node_modules', name, 'package.json'))
    bundles.push({
      name,
      spec,
      version: typeof installed?.version === 'string' ? installed.version : undefined,
      missing: !exists(path.join(dir, 'node_modules', name)),
    })
  }

  return {
    format: 1,
    name: typeof manifest.name === 'string' ? manifest.name : path.basename(dir),
    createdAt: new Date().toISOString(),
    bundles,
    manifest,
    files: collectFiles(dir),
    warnings,
  }
}

/**
 * Import một snapshot vào thư mục đích.
 * @param {{ snapshot: object, targetDir: string, force?: boolean, write?: boolean }} options
 * @returns {{targetDir:string,wrote:string[],skipped:string[],needsInstall:string[],warnings:string[]}}
 */
export function importProfile({ snapshot, targetDir, force = false, write = true }) {
  if (snapshot === null || typeof snapshot !== 'object' || snapshot.format !== 1) {
    throw new Error('snapshot: manifest không hợp lệ (thiếu format: 1)')
  }
  const dir = path.resolve(targetDir)
  const wrote = []
  const skipped = []
  const warnings = [...(Array.isArray(snapshot.warnings) ? snapshot.warnings : [])]

  const manifest = sanitizeManifest(snapshot.manifest)
  const files = snapshot.files !== null && typeof snapshot.files === 'object' ? snapshot.files : {}
  const patchText = files['cordis.patch.yml']

  // dựng manifest mới: field an toàn + dependencies lấy theo snapshot.bundles (nguồn chuẩn hơn manifest.dependencies)
  const dependencies = {}
  for (const bundle of Array.isArray(snapshot.bundles) ? snapshot.bundles : []) {
    if (bundle !== null && typeof bundle === 'object' && typeof bundle.name === 'string' && typeof bundle.spec === 'string') {
      dependencies[bundle.name] = bundle.spec
    }
  }
  const nextManifest = { ...manifest, private: true, dependencies }
  if (Object.keys(nextManifest.dependencies).length === 0) delete nextManifest.dependencies

  const plan = []
  plan.push({ name: 'package.json', text: JSON.stringify(nextManifest, null, 2) + '\n' })
  if (typeof patchText === 'string' && patchText.length > 0) {
    plan.push({ name: 'cordis.patch.yml', text: patchText })
  }
  for (const [name, text] of Object.entries(files)) {
    if (name === 'cordis.patch.yml') continue // đã plan ở trên
    if (isSensitiveName(name) || SENSITIVE_BODY.test(text)) {
      warnings.push(`bỏ ${name}: nội dung có vẻ nhạy cảm`)
      continue
    }
    plan.push({ name, text })
  }

  for (const item of plan) {
    const full = path.join(dir, item.name)
    if (exists(full) && !force) {
      skipped.push(item.name)
      continue
    }
    if (write) {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(full, item.text, 'utf8')
    }
    wrote.push(item.name)
  }

  const needsInstall = []
  for (const bundle of Array.isArray(snapshot.bundles) ? snapshot.bundles : []) {
    if (bundle !== null && typeof bundle === 'object' && typeof bundle.name === 'string') {
      needsInstall.push(`${bundle.name}@${bundle.spec}`)
    }
  }

  return { targetDir: dir, wrote, skipped, needsInstall, warnings }
}
