#!/usr/bin/env node
/**
 * Dựng index.json (plugin market format 1) từ packages/*.
 * Chỉ dùng Node builtins. Không tự commit/push.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = path.join(ROOT, 'packages')
const INDEX_FILE = path.join(ROOT, 'index.json')
const argv = process.argv.slice(2)
const CHECK = argv.includes('--check')
const LOCAL = argv.includes('--local')
const repoArg = argv.find((a) => a.startsWith('--repo-url='))?.slice('--repo-url='.length)

const CATEGORY_TITLES = {
  dev: { en: 'Development & Operations', vi: 'Phát triển & Vận hành' },
  session: { en: 'Sessions & Messages', vi: 'Phiên & Tin nhắn' },
  interface: { en: 'UI & Experience', vi: 'Giao diện & Trải nghiệm' },
}
const LABEL_TITLES = {
  beta: { en: 'Beta', vi: 'Thử nghiệm' },
  vi: { en: 'Vietnamese', vi: 'Tiếng Việt' },
}

const fail = (msg) => {
  console.error('error: ' + msg)
  process.exit(1)
}
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

const rootPkg = readJson(path.join(ROOT, 'package.json'))
const repoUrl = (repoArg || rootPkg.repository?.url || '').replace(/\.git$/, '')
if (!/^https:\/\/[^/]+\/.+\/.+$/.test(repoUrl)) fail(`repository url không hợp lệ: "${repoUrl}"`)
if (/\/OWNER\//.test(repoUrl)) console.warn('warn: repository url còn placeholder OWNER — index sẽ trỏ repo không tồn tại')

const declared = new Set()
const labels = new Set()
const plugins = []

for (const dir of fs.readdirSync(PACKAGES).sort()) {
  const pkgDir = path.join(PACKAGES, dir)
  const manifestFile = path.join(pkgDir, 'package.json')
  if (!fs.existsSync(manifestFile)) continue
  const pkg = readJson(manifestFile)
  if (pkg.private) {
    console.log(`skip ${dir} (private)`)
    continue
  }
  if (!pkg.dsh?.bundle) fail(`${dir}: thiếu dsh.bundle trong package.json`)
  if (!SEMVER.test(pkg.version ?? '')) fail(`${dir}: version không phải SemVer: ${pkg.version}`)

  const tag = `${pkg.name}/v${pkg.version}`
  let commit = git('rev-list', '-n', '1', tag)
  if (!commit) {
    if (!LOCAL) fail(`${dir}: không thấy tag "${tag}". Tạo tag hoặc dùng --local khi thử.`)
    commit = git('rev-list', '-n', '1', 'HEAD')
    console.warn(`warn: ${dir} dùng HEAD (${commit.slice(0, 7)}) vì chưa có tag ${tag}`)
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) fail(`${dir}: commit không hợp lệ: "${commit}"`)
  const stamp = Number(git('log', '-1', '--format=%ct', commit)) * 1000
  if (!Number.isFinite(stamp) || stamp <= 0) fail(`${dir}: không đọc được thời gian commit ${commit.slice(0, 7)}`)

  const localeFile = path.join(pkgDir, 'locale', 'en.json')
  const meta = fs.existsSync(localeFile) ? readJson(localeFile).meta ?? {} : {}
  const market = pkg.dsh?.market ?? {}
  if (market.category) declared.add(market.category)
  for (const label of market.labels ?? []) labels.add(label)

  const iconFile = path.join(pkgDir, 'icon.svg')
  plugins.push({
    name: pkg.name,
    ...(meta.title ? { title: meta.title } : {}),
    ...(meta.description ?? pkg.description ? { description: meta.description ?? pkg.description } : {}),
    ...(pkg.author ? { author: typeof pkg.author === 'string' ? pkg.author : pkg.author.name } : {}),
    ...(market.homepage ? { homepage: market.homepage } : {}),
    repository: { url: repoUrl, directory: `packages/${dir}` },
    ...(fs.existsSync(iconFile) ? { icon: `packages/${dir}/icon.svg` } : {}),
    metadata: {
      ...(market.category ? { category: market.category } : {}),
      keywords: market.keywords ?? [],
      labels: market.labels ?? [],
      sortKeys: {},
    },
    versions: [
      {
        version: pkg.version,
        publishTimestamp: Math.floor(stamp / 1000),
        source: { type: 'git', url: repoUrl, commit, path: `packages/${dir}` },
        engines: pkg.engines?.dsh ? { dsh: pkg.engines.dsh } : {},
      },
    ],
  })
}

plugins.sort((a, b) => a.name.localeCompare(b.name))
if (plugins.length === 0) fail('không có package nào để đưa vào index')

const index = {
  format: 1,
  title: { en: 'hg plugins for DeepSeek Harness', vi: 'Plugin hg cho DeepSeek Harness' },
  description: {
    en: 'Personal collection of DeepSeek Harness plugins: dev/ops tooling, session insight and interface additions.',
    vi: 'Bộ plugin DeepSeek Harness cá nhân: công cụ dev/ops, hiểu phiên làm việc và bổ sung giao diện.',
  },
  metadata: {
    categories: Object.fromEntries([...declared].map((c) => [c, { title: CATEGORY_TITLES[c] ?? { en: c } }])),
    labels: Object.fromEntries([...labels].map((l) => [l, { title: LABEL_TITLES[l] ?? { en: l } }])),
    sortKeys: {},
  },
  plugins,
}

// --- kiểm tra hình dạng (luôn chạy) ---
const seen = new Set()
for (const p of plugins) {
  if (seen.has(p.name)) fail(`trùng package name: ${p.name}`)
  seen.add(p.name)
  if (!p.versions.length) fail(`${p.name}: không có version`)
  for (const v of p.versions) {
    const versions = new Set()
    if (versions.has(v.version)) fail(`${p.name}: trùng version ${v.version}`)
    versions.add(v.version)
    if (v.source.type === 'git' && !/^[0-9a-f]{40}$/.test(v.source.commit)) fail(`${p.name}: commit sai`)
    if (v.source.path?.startsWith('/')) fail(`${p.name}: source.path phải tương đối`)
  }
}

// --- validator chính thức của DSH, nếu resolve được ---
const tryOfficial = async () => {
  for (const base of [process.env.DSH_INSTALL_DIR, process.env.DSH_PROFILE_DIR]) {
    if (!base) continue
    try {
      const { createRequire } = await import('node:module')
      const { pathToFileURL } = await import('node:url')
      const require = createRequire(path.join(base, 'noop.js'))
      const entry = require.resolve('@deepseek-ai/dsh-plugin-market-index')
      const mod = await import(pathToFileURL(entry).href)
      mod.parseMarketIndex(index, 'https://example.invalid/index.json')
      return 'official'
    } catch {
      /* thử nguồn kế tiếp */
    }
  }
  return 'shape-only'
}

const text = JSON.stringify(index, null, 2) + '\n'
const mode = await tryOfficial()
if (mode === 'shape-only') console.warn('warn: không resolve được @deepseek-ai/dsh-plugin-market-index — chỉ kiểm hình dạng')

if (CHECK) {
  const current = fs.existsSync(INDEX_FILE) ? fs.readFileSync(INDEX_FILE, 'utf8') : ''
  if (current !== text) fail('index.json lệch với packages/ — chạy: node scripts/build-index.mjs')
  console.log(`ok: index.json khớp (${plugins.length} plugin, validate=${mode})`)
} else {
  fs.writeFileSync(INDEX_FILE, text)
  console.log(`ok: ghi index.json — ${plugins.length} plugin, validate=${mode}`)
}
for (const p of plugins) console.log(`  ${p.name}@${p.versions[0].version} → ${p.versions[0].source.commit.slice(0, 7)}`)
