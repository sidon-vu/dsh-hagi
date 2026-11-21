/**
 * Row `dev-hg-snapshot`: tool `profile_snapshot` cho agent — đóng gói một
 * profile DSH (name + spec cài của từng bundle + `cordis.patch.yml`) thành một
 * file manifest JSON không credentials, và dựng lại profile mới từ file đó.
 *
 * Import luôn chạy dry-run trước: gọi không `confirm` thì chỉ liệt kê file sẽ
 * ghi — bắt buộc `confirm: true` mới thật sự ghi (bảo hiểm cho lệnh phá huỷ).
 *
 * Không import gì từ @deepseek-ai/* — package cài từ git không resolve được.
 */
import fs from 'node:fs'
import path from 'node:path'
import { exportProfile, importProfile } from './snapshot.js'

export const name = 'dev-hg-snapshot'
export const inject = ['tools']

const DESCRIPTION = [
  'Export a DSH profile to a portable manifest (bundle names + install specs + cordis.patch.yml,',
  'never credentials), or restore a profile from one. Import runs dry-run first — pass confirm',
  'to actually write. The manifest is a single JSON file you can keep or copy to another machine.',
].join(' ')

const PARAMETERS = {
  action: {
    type: 'string',
    enum: ['export', 'import'],
    description: 'export: profile directory → manifest file. import: manifest file → profile directory.',
  },
  profile: {
    type: 'string',
    description: 'Export: profile directory to read. Defaults to the running profile (DSH_PROFILE_DIR).',
  },
  out: {
    type: 'string',
    description: 'Export: file the manifest is written to. Defaults to <profile>/snapshot.json.',
  },
  source: {
    type: 'string',
    description: 'Import: manifest file to read (required).',
  },
  target: {
    type: 'string',
    description: 'Import: directory the profile is written to (required).',
  },
  force: {
    type: 'boolean',
    description: 'Import: overwrite files that already exist. Default false — existing files are skipped.',
  },
  confirm: {
    type: 'boolean',
    description: 'Import: actually write files. Default false — only lists what would change.',
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'profile', 'target', 'bundles', 'files', 'needsInstall', 'warnings', 'dryRun'],
  properties: {
    action: { type: 'string', description: 'export or import.' },
    profile: { type: 'string', description: 'Profile directory read (export) or written (import).' },
    target: { type: 'string', description: 'Manifest path (export) or target directory (import).' },
    bundles: { type: 'integer', description: 'Bundles in the manifest.' },
    files: { type: 'integer', description: 'Config files carried besides package.json + cordis.patch.yml.' },
    needsInstall: { type: 'array', items: { type: 'string' }, description: 'Specs to install with `dsh plugin add` after import.' },
    warnings: { type: 'array', items: { type: 'string' } },
    dryRun: { type: 'boolean', description: 'Import only: true when nothing was written (confirm was not set).' },
  },
}

const validateArgs = (args) => {
  if (args === null || typeof args !== 'object') throw new Error('profile_snapshot: arguments must be an object')
  if (args.action !== 'export' && args.action !== 'import') throw new Error('profile_snapshot: action must be export or import')
  for (const key of ['profile', 'out', 'source', 'target']) {
    if (args[key] !== undefined && typeof args[key] !== 'string') throw new Error(`profile_snapshot: ${key} must be a string`)
  }
  for (const key of ['force', 'confirm']) {
    if (args[key] !== undefined && typeof args[key] !== 'boolean') throw new Error(`profile_snapshot: ${key} must be a boolean`)
  }
  return args
}

const render = (value) => {
  const head = value.action === 'export'
    ? [`Đã export — ${value.profile}`, `manifest: ${value.target}`, `${value.bundles} bundle · ${value.files} file cấu hình`]
    : [
      `${value.dryRun ? 'Dry-run' : 'Đã import'} — ${value.profile}`,
      `vào: ${value.target}`,
      `${value.bundles} bundle · ${value.files} file cấu hình`,
    ]
  const body = value.needsInstall.map((line) => `cài: ${line}`)
  const warnings = value.warnings.map((line) => `cảnh báo: ${line}`)
  if (value.action === 'import' && value.dryRun) body.push('Chưa ghi — truyền confirm: true để ghi thật.')
  return [{ type: 'text', text: [...head, ...warnings, ...body].join('\n') }]
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'profile_snapshot',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => render(value) },
    async execute(args) {
      const parsed = validateArgs(args)

      if (parsed.action === 'export') {
        const profileDir = path.resolve(parsed.profile ?? process.env.DSH_PROFILE_DIR ?? '')
        if (profileDir === '' || !fs.existsSync(profileDir)) {
          throw new Error('profile_snapshot: no profile directory — pass profile or set DSH_PROFILE_DIR')
        }
        const snapshot = exportProfile({ profileDir })
        const out = path.resolve(parsed.out ?? path.join(profileDir, 'snapshot.json'))
        fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
        return {
          action: 'export',
          profile: profileDir,
          target: out,
          bundles: snapshot.bundles.length,
          files: Object.keys(snapshot.files).length,
          needsInstall: snapshot.bundles.map((b) => `${b.name}@${b.spec}`),
          warnings: snapshot.warnings,
          dryRun: false,
        }
      }

      // import
      if (typeof parsed.source !== 'string' || typeof parsed.target !== 'string') {
        throw new Error('profile_snapshot: import requires source (manifest file) and target (profile directory)')
      }
      let snapshot
      try {
        snapshot = JSON.parse(fs.readFileSync(path.resolve(parsed.source), 'utf8'))
      } catch (error) {
        throw new Error(`profile_snapshot: cannot read manifest — ${error.message}`)
      }
      const result = importProfile({ snapshot, targetDir: parsed.target, force: parsed.force === true, write: parsed.confirm === true })
      return {
        action: 'import',
        profile: result.targetDir,
        target: result.targetDir,
        bundles: snapshot.bundles?.length ?? 0,
        files: Object.keys(snapshot.files ?? {}).length,
        needsInstall: result.needsInstall,
        warnings: [...result.warnings, ...(result.skipped.length > 0 ? [`bỏ qua ${result.skipped.length} file đã có (force để ghi đè)`] : [])],
        dryRun: parsed.confirm !== true,
      }
    },
  })
}
