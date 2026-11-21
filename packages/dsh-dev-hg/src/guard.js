/**
 * Row `dev-hg-guard`: khoá chạy mỗi tool call, biến vài luật "không sửa lại được"
 * thành code. Chỉ chặn hoặc cho qua — không hỏi, không sửa, không hoàn tác.
 *
 * Config (row config, tuỳ chọn) — mọi field đều thêm vào mặc định, không thay thế:
 *   protectedPaths:  (string | { pattern, allow?, why? })[]  glob đường dẫn, CỘNG vào mặc định
 *   denyCommands:    (string | { pattern, why? })[]          regex, CỘNG vào mặc định
 *   secretScan:      boolean     (mặc định true)
 *   secretAllowPaths: string[]   glob bỏ quét secret
 *   disableDefaults: boolean     bỏ 4 luật mặc định
 *
 * Không import gì từ @deepseek-ai/* — package cài từ git không resolve được.
 */
export const name = 'dev-hg-guard'
export const inject = ['tools']

const FILE_TOOLS = new Set(['write', 'edit'])
const SHELL_TOOLS = new Set(['pwsh', 'bash'])
const MAX_RULES = 100

const DEFAULT_PROTECTED = [
  { pattern: '**/.git/config', why: 'cấu hình git phải do người sửa, không do agent (AGENTS.md)' },
  { pattern: '**/.git/hooks/**', why: 'hook git chạy như code — tự tạo là rủi ro' },
]
const DEFAULT_COMMANDS = [
  // `--force-with-lease` an toàn hơn: chỉ chặn đúng `--force` / `-f`.
  { pattern: 'git\\s+push\\s+(?:--force(?!-)|-f\\b)', why: 'đẩy đè lịch sử remote: không hoàn tác được' },
  { pattern: 'git\\s+reset\\s+--hard\\b', why: 'xoá thay đổi chưa commit: dùng git stash' },
]
const SECRETS = [
  { re: /ghp_[A-Za-z0-9]{20,}/, label: 'GitHub token' },
  { re: /github_pat_[A-Za-z0-9_]{20,}/, label: 'GitHub fine-grained token' },
  { re: /sk-[A-Za-z0-9]{20,}/, label: 'API key dạng sk-' },
  { re: /AKIA[0-9A-Z]{16}/, label: 'AWS access key' },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/, label: 'Slack token' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: 'private key' },
]

/** Glob (hỗ trợ `*` và `**`) → regex khớp đuôi đường dẫn, không phân biệt hoa thường. */
const globToRegExp = (pattern) => {
  const normalized = String(pattern).replace(/\\/g, '/').replace(/^\.?\//, '')
  const body = normalized
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*')
  return new RegExp(`(?:^|/)${body}$`, 'i')
}

const toEntry = (value) => (typeof value === 'string' ? { pattern: value } : value)
const asArray = (value) => (Array.isArray(value) ? value.slice(0, MAX_RULES) : [])
/** Tool trên Windows có thể đưa `\` hoặc `/` — chuẩn hoá trước khi so. */
const normalizePath = (value) => String(value).replace(/\\/g, '/')

const compilePaths = (entries, label) => {
  const compiled = []
  for (const raw of entries) {
    const entry = toEntry(raw)
    if (entry === null || typeof entry !== 'object' || typeof entry.pattern !== 'string') continue
    try {
      compiled.push({
        re: globToRegExp(entry.pattern),
        allow: asArray(entry.allow).filter((a) => typeof a === 'string').map(globToRegExp),
        why: typeof entry.why === 'string' ? entry.why : `${label}: ${entry.pattern}`,
      })
    } catch {
      /* pattern hỏng: bỏ qua luật đó thay vì làm sập guard */
    }
  }
  return compiled
}

const compileCommands = (entries) => {
  const compiled = []
  for (const raw of entries) {
    const entry = toEntry(raw)
    if (entry === null || typeof entry !== 'object' || typeof entry.pattern !== 'string') continue
    try {
      compiled.push({ re: new RegExp(entry.pattern, 'i'), why: typeof entry.why === 'string' ? entry.why : `lệnh bị chặn: ${entry.pattern}` })
    } catch {
      /* regex hỏng: bỏ qua */
    }
  }
  return compiled
}

export function apply(ctx, config = {}) {
  const settings = config !== null && typeof config === 'object' ? config : {}
  const useDefaults = settings.disableDefaults !== true
  const protectedPaths = compilePaths(
    [...(useDefaults ? DEFAULT_PROTECTED : []), ...asArray(settings.protectedPaths)],
    'đường dẫn được bảo vệ',
  )
  const denyCommands = compileCommands([...(useDefaults ? DEFAULT_COMMANDS : []), ...asArray(settings.denyCommands)])
  const secretScan = settings.secretScan !== false
  const secretAllow = asArray(settings.secretAllowPaths).filter((a) => typeof a === 'string').map(globToRegExp)

  const checkPath = (path) => {
    const normalized = normalizePath(path)
    for (const rule of protectedPaths) {
      if (rule.allow.some((re) => re.test(normalized))) continue
      if (rule.re.test(normalized)) return rule.why
    }
    return undefined
  }

  const checkCommand = (command) => {
    for (const rule of denyCommands) {
      if (rule.re.test(command)) return rule.why
    }
    return undefined
  }

  const checkText = (text, path) => {
    if (!secretScan || typeof text !== 'string' || text.length === 0) return undefined
    if (path !== undefined && secretAllow.some((re) => re.test(normalizePath(path)))) return undefined
    for (const { re, label } of SECRETS) {
      if (re.test(text)) return `nội dung chứa ${label} — không ghi secret vào file/lệnh (AGENTS.md)`
    }
    return undefined
  }

  ctx.tools.guard((execution) => {
    try {
      const args = execution?.arguments
      if (args === null || typeof args !== 'object') return undefined

      if (FILE_TOOLS.has(execution.name)) {
        const filePath = typeof args.file_path === 'string' ? args.file_path : typeof args.path === 'string' ? args.path : undefined
        if (filePath !== undefined) {
          const denied = checkPath(filePath)
          if (denied !== undefined) return denied
        }
        return checkText(args.content, filePath) ?? checkText(args.new_string, filePath)
      }

      if (SHELL_TOOLS.has(execution.name)) {
        const command = typeof args.command === 'string' ? args.command : ''
        const denied = checkCommand(command)
        if (denied !== undefined) return denied
        return checkText(command, undefined)
      }

      return undefined
    } catch (error) {
      // Cố ý cho qua: guard lỗi nội bộ không được chặn cả phiên làm việc.
      console.warn(`[dev-hg-guard] lỗi nội bộ, cho qua: ${error?.message ?? error}`)
      return undefined
    }
  })
}
