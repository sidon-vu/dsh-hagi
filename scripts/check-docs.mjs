#!/usr/bin/env node
/**
 * Kiểm hai luật đang chỉ là lời dặn:
 *   1. mỗi file .md ≤ 200 dòng
 *   2. link markdown tương đối phải trỏ tới file/thư mục tồn tại
 *
 * Chạy: node scripts/check-docs.mjs [--max=200] [--no-links]
 * Không sửa gì. Exit 1 nếu vi phạm.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const MAX = Number(argv.find((a) => a.startsWith('--max='))?.slice(6) ?? 200)
const CHECK_LINKS = !argv.includes('--no-links')

const isWorkspace = (dir) =>
  fs.existsSync(path.join(dir, 'AGENTS.md')) && fs.existsSync(path.join(dir, 'dsh-hagi', 'package.json'))
const ROOT = isWorkspace(path.resolve(REPO, '..')) ? path.resolve(REPO, '..') : REPO

const SKIP_DIRS = new Set(['.git', 'node_modules', 'inbox', 'scratch', 'dist', 'coverage', '.turbo', '.pnpm', 'research'])

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.md')) files.push(full)
  }
  return files
}

/** Bỏ code fence để link trong ví dụ không bị tính. */
const stripFences = (text) => text.replace(/^```[\s\S]*?^```/gm, '')

const files = walk(ROOT)
const tooLong = []
const brokenLinks = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/).length
  if (lines > MAX) tooLong.push(`${path.relative(ROOT, file)} — ${lines} dòng`)

  if (!CHECK_LINKS) continue
  for (const match of stripFences(text).matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1]
    if (/^(?:[a-z]+:|#)/i.test(target)) continue
    const filePart = decodeURIComponent(target.split('#')[0])
    if (filePart === '') continue
    if (!fs.existsSync(path.resolve(path.dirname(file), filePart))) {
      brokenLinks.push(`${path.relative(ROOT, file)} → ${target}`)
    }
  }
}

const show = (items, limit = 25) => items.slice(0, limit).join('\n  ')
console.log(`check-docs: ${files.length} file .md · gốc ${ROOT} · giới hạn ${MAX} dòng`)
if (tooLong.length > 0) console.log(`  QUÁ DÀI (${tooLong.length}):\n  ${show(tooLong)}`)
if (brokenLinks.length > 0) console.log(`  LINK GÃY (${brokenLinks.length}):\n  ${show(brokenLinks)}`)
if (tooLong.length + brokenLinks.length === 0) console.log('  ok: không file nào quá dài, không link gãy')
process.exitCode = tooLong.length + brokenLinks.length === 0 ? 0 : 1
