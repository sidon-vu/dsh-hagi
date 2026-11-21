#!/usr/bin/env node
/**
 * Kiểm luật "cài được từ bản phát hành": lấy từng plugin trong index.json,
 * cài vào thư mục tạm bằng spec pinned (git+https + commit + path), rồi:
 *   - so name/version với index
 *   - đọc cordis.patch.yml, resolve từng row `name:` tương đối, import
 *   - gọi apply() với ctx giả và xác nhận có đăng ký
 * Xoá thư mục tạm sau khi xong. Không đụng profile DSH.
 *
 * Chạy: node scripts/verify-release.mjs [--pkg=dsh-dev-hg] [--keep]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const only = argv.find((a) => a.startsWith('--pkg='))?.slice(6)
const keep = argv.includes('--keep')

const fail = (message) => {
  console.error(`verify-release: ${message}`)
  process.exit(1)
}

const index = JSON.parse(fs.readFileSync(path.join(REPO, 'index.json'), 'utf8'))
const targets = index.plugins.filter((p) => (only ? p.name === only : true))
if (targets.length === 0) fail(`không có plugin nào khớp ${only ?? '(tất cả)'}`)

const pnpmArgs = (args) => process.env.PNPM_SCRIPT
  ? [process.execPath, process.env.PNPM_SCRIPT, ...args]
  : ['pnpm', ...args]

try {
  const [cmd, ...rest] = pnpmArgs(['--version'])
  execFileSync(cmd, rest, { encoding: 'utf8' })
} catch {
  fail('không chạy được pnpm trên PATH')
}

const installSpec = (version) => {
  const { url, commit, path: dir } = version.source
  if (version.source.type !== 'git') return `${index.plugins[0].name}@${version.version}`
  const base = `git+${url.replace(/\.git$/, '')}.git#${commit}`
  return dir ? `${base}&path:/${dir}` : base
}

/** ctx giả: service lạ trả về hàm no-op để row không làm sập kiểm tra. */
const fakeCtx = (record) => {
  const callable = new Proxy(function () {}, {
    get: (_t, key) => {
      if (key === 'then') return undefined
      return callable
    },
    apply: () => undefined,
  })
  const known = {
    tools: {
      register: (definition) => record.tools.push(definition?.name ?? '?'),
      guard: (fn) => record.guards.push(fn),
      restrict: () => () => undefined,
    },
    slots: { inject: () => () => undefined, register: () => () => undefined },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
    effect: (fn) => { if (typeof fn === 'function') fn(); return () => undefined },
    on: () => () => undefined,
    onEvent: () => () => undefined,
  }
  return new Proxy(known, { get: (target, key) => (key in target ? target[key] : callable) })
}

let failures = 0
for (const plugin of targets) {
  const version = plugin.versions[0]
  const spec = installSpec(version)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hg-verify-'))
  const label = `${plugin.name}@${version.version}`
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'hg-verify', private: true }))
    const [addCmd, ...addArgs] = pnpmArgs(['add', spec, '--reporter=silent'])
    execFileSync(addCmd, addArgs, { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000 })
    const pkgDir = path.join(tmp, 'node_modules', plugin.name)
    if (!fs.existsSync(pkgDir)) throw new Error(`cài xong nhưng không thấy ${plugin.name} trong node_modules`)

    const installed = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
    if (installed.name !== plugin.name) throw new Error(`name lệch: index=${plugin.name} cài=${installed.name}`)
    if (installed.version !== version.version) throw new Error(`version lệch: index=${version.version} cài=${installed.version}`)

    const patchFile = path.join(pkgDir, 'cordis.patch.yml')
    if (!fs.existsSync(patchFile)) throw new Error('thiếu cordis.patch.yml trong bản cài')
    const rows = [...fs.readFileSync(patchFile, 'utf8').matchAll(/^\s*name:\s*'([^']+)'/gm)].map((m) => m[1])
    if (rows.length === 0) throw new Error('patch không khai báo row nào')

    const record = { tools: [], guards: [] }
    // Row `name` là đường dẫn tương đối cạnh patch (`./src/x.js`) hoặc một package specifier
    // (tên package, hoặc subpath đã khai trong `exports`). Resolve đúng như loader.
    const require = createRequire(path.join(tmp, 'package.json'))
    for (const rowName of rows) {
      let target
      if (rowName.startsWith('.')) {
        target = path.resolve(pkgDir, rowName)
        if (!fs.existsSync(target)) throw new Error(`row "${rowName}" trỏ tới file không tồn tại: ${target}`)
      } else {
        try {
          target = require.resolve(rowName)
        } catch (error) {
          throw new Error(`row "${rowName}" không resolve được từ bản cài: ${error.code ?? error.message}`)
        }
      }
      const mod = await import(pathToFileURL(target).href)
      if (typeof mod.apply !== 'function') throw new Error(`row "${rowName}" không export apply()`)
      mod.apply(fakeCtx(record))
    }
    console.log(`ok  ${label} — ${rows.length} row, đăng ký: tools=[${record.tools.join(',')}] guards=${record.guards.length}`)
  } catch (error) {
    failures++
    const detail = String(error.stderr ?? error.message ?? error).split('\n').slice(0, 3).join(' | ')
    console.log(`FAIL ${label} — ${detail}`)
  } finally {
    if (!keep) fs.rmSync(tmp, { recursive: true, force: true })
    else console.log(`     giữ lại: ${tmp}`)
  }
}

console.log(failures === 0 ? `verify-release: ${targets.length}/${targets.length} package ok` : `verify-release: ${failures} package FAIL`)
process.exitCode = failures === 0 ? 0 : 1
