/**
 * Row `dev-hg-i18n-audit`: công cụ cho agent quét lỗ hổng bản địa hoá của
 * plugin DSH đã cài (hoặc của một thư mục bất kỳ).
 *
 * Không import gì từ @deepseek-ai/* — package cài từ git không có node_modules
 * và không resolve được package của DSH. Tool definition vì vậy là object
 * thuần, đúng contract `ctx.tools.register(definition)`.
 */
import { audit } from './audit.js'

export const name = 'dev-hg-i18n-audit'
export const inject = ['tools']

const VERDICT_TEXT = {
  'no-locale': 'không có locale',
  'no-vi': 'thiếu vi',
  'has-vi': 'có vi',
}

// comment giữ file này ≤ 200 dòng, xem docs/FEATURES.md
const DESCRIPTION = [
  'Audit localization coverage of DSH plugin packages: which have no locale files at all,',
  'which have locales but no Vietnamese, and how much hardcoded CJK text remains in their source.',
  'Scans the plugins installed in the running profile by default; pass `target` to audit one',
  'package directory or a directory of packages. Returns the worst packages first.',
].join(' ')

const PARAMETERS = {
  target: {
    type: 'string',
    description: 'Absolute directory to audit: a single package directory, or a folder whose package subdirectories are scanned. Omit to audit the plugins installed in the running profile.',
  },
  limit: {
    type: 'integer',
    description: 'Maximum number of packages returned, 1 to 100. Defaults to 20, worst first.',
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scope: { type: 'string', required: true, description: 'Profile directory or absolute target that was scanned.' },
    scanned: { type: 'integer', required: true, description: 'Number of plugin packages audited.' },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: true,
      properties: {
        missingLocale: { type: 'integer', required: true, description: 'Packages with no locale files at all.' },
        missingVi: { type: 'integer', required: true, description: 'Packages with locale files but no vi.json.' },
        hasVi: { type: 'integer', required: true, description: 'Packages that already ship vi.json.' },
      },
    },
    packages: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          version: { type: 'string', required: true },
          verdict: { type: 'string', required: true },
          locales: { type: 'array', required: true, items: { type: 'string' } },
          cjkLines: { type: 'integer', required: true, description: 'Non-comment lines containing CJK characters.' },
          cjkFiles: { type: 'integer', required: true },
          readmeCjkPercent: { type: 'integer', required: true },
          hasClient: { type: 'boolean', required: true, description: 'True when the package renders UI (dsh.client).' },
        },
      },
    },
    truncated: { type: 'boolean', required: true, description: 'True when some packages are not listed; narrow with target or raise limit.' },
  },
}

const validateArgs = (args) => {
  if (args === null || typeof args !== 'object') throw new Error('i18n_audit: arguments must be an object')
  if (args.target !== undefined && typeof args.target !== 'string') throw new Error('i18n_audit: target must be a string')
  if (args.limit !== undefined && !Number.isInteger(args.limit)) throw new Error('i18n_audit: limit must be an integer')
  return { target: args.target, limit: args.limit }
}

const renderTable = (value) => {
  const lines = [
    `Lỗ hổng bản địa hoá — ${value.scope}`,
    `${value.scanned} plugin · không locale: ${value.summary.missingLocale} · thiếu vi: ${value.summary.missingVi} · có vi: ${value.summary.hasVi}`,
    '',
    'plugin@version\tverdict\tcjk dòng\tlocale\tnhãn README',
  ]
  for (const p of value.packages) {
    const locales = p.locales.length > 0 ? p.locales.join(',') : '—'
    const ui = p.hasClient ? ' (UI)' : ''
    lines.push(`${p.name}@${p.version}${ui}\t${VERDICT_TEXT[p.verdict] ?? p.verdict}\t${p.cjkLines}\t${locales}\t${p.readmeCjkPercent}%`)
  }
  if (value.truncated) lines.push('', 'Còn nữa — tăng limit hoặc thu hẹp target.')
  return [{ type: 'text', text: lines.join('\n') }]
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'i18n_audit',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => renderTable(value) },
    execute(args) {
      const parsed = validateArgs(args)
      return Promise.resolve(audit({ target: parsed.target, limit: parsed.limit }))
    },
  })
}
