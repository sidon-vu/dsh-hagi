/**
 * Row `dev-hg-rollback`: tool `profile_rollback` — undo một bước cho profile.
 *
 * `save`  : chụp profile hiện tại vào history (gọi TRƯỚC khi áp thay đổi).
 * `restore`: đưa profile về snapshot gần nhất. Mặc định dry-run — chỉ liệt kê
 * file sẽ ghi; `confirm: true` mới ghi và pop snapshot khỏi history.
 *
 * History là `<profile>/rollback-history.json`, giữ tối đa `limit` snapshot
 * (mặc định 5). Import bằng đường importProfile của dev-hg-snapshot nên vẫn
 * không chạy install — `needsInstall[]` trả về để agent tự `dsh plugin add`.
 *
 * Không import gì từ @deepseek-ai/* — package cài từ git không resolve được.
 */
import { checkpoint, rollback, clearHistory } from './rollback.js'

export const name = 'dev-hg-rollback'
export const inject = ['tools']

const DESCRIPTION = [
  'Save a checkpoint of a DSH profile (call BEFORE applying changes), then restore the most',
  'recent checkpoint to undo one step. Restore is a dry-run unless confirm is passed; each',
  'confirmed restore pops one snapshot. History keeps the latest `limit` snapshots',
  '(rollback-history.json in the profile).',
].join(' ')

const PARAMETERS = {
  action: {
    type: 'string',
    enum: ['save', 'restore', 'clear'],
    description: 'save: snapshot current profile into history. restore: go back to the newest snapshot. clear: delete history.',
  },
  profile: {
    type: 'string',
    description: 'Profile directory. Defaults to the running profile (DSH_PROFILE_DIR).',
  },
  limit: {
    type: 'integer',
    description: 'Max snapshots kept in history. Default 5.',
  },
  confirm: {
    type: 'boolean',
    description: 'restore/clear: actually write (and pop). Default false — only lists what would change.',
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'profile', 'depth', 'wrote', 'needsInstall', 'warnings', 'dryRun'],
  properties: {
    action: { type: 'string', description: 'save, restore, or clear.' },
    profile: { type: 'string', description: 'Profile directory touched.' },
    depth: { type: 'integer', description: 'Snapshots left in history after the call.' },
    restored: {
      type: 'object',
      additionalProperties: true,
      description: 'restore only: {name, createdAt, bundles} of the snapshot applied; {} when nothing was restored.',
    },
    wrote: { type: 'array', items: { type: 'string' }, description: 'Files written (restore with confirm).' },
    needsInstall: { type: 'array', items: { type: 'string' }, description: 'Specs to reinstall after restore.' },
    warnings: { type: 'array', items: { type: 'string' } },
    dryRun: { type: 'boolean', description: 'true when nothing was written (confirm was not set).' },
  },
}

const validateArgs = (args) => {
  if (args === null || typeof args !== 'object') throw new Error('profile_rollback: arguments must be an object')
  if (args.action !== 'save' && args.action !== 'restore' && args.action !== 'clear') {
    throw new Error('profile_rollback: action must be save, restore, or clear')
  }
  if (args.profile !== undefined && typeof args.profile !== 'string') throw new Error('profile_rollback: profile must be a string')
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50)) {
    throw new Error('profile_rollback: limit must be an integer between 1 and 50')
  }
  if (args.confirm !== undefined && typeof args.confirm !== 'boolean') throw new Error('profile_rollback: confirm must be a boolean')
  return args
}

const render = (value) => {
  if (value.action === 'save') {
    return [{ type: 'text', text: [`Đã checkpoint — ${value.profile}`, `history: ${value.depth} snapshot`, ...value.warnings.map((w) => `cảnh báo: ${w}`)].join('\n') }]
  }
  if (value.action === 'clear') {
    return [{ type: 'text', text: [value.dryRun ? `Dry-run xoá history — ${value.profile}` : `Đã xoá history — ${value.profile}`].join('\n') }]
  }
  const head = [
    `${value.dryRun ? 'Dry-run' : 'Đã rollback'} — ${value.profile}`,
    value.restored ? `snapshot: ${value.restored.name} @ ${value.restored.createdAt}` : 'history rỗng',
    `còn ${value.depth} snapshot`,
  ]
  const body = [
    ...value.wrote.map((f) => `ghi: ${f}`),
    ...value.needsInstall.map((s) => `cài lại: ${s}`),
    ...value.warnings.map((w) => `cảnh báo: ${w}`),
  ]
  if (value.dryRun && value.restored) body.push('Chưa ghi — truyền confirm: true để rollback thật.')
  return [{ type: 'text', text: [...head, ...body].join('\n') }]
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'profile_rollback',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => render(value) },
    async execute(args) {
      const parsed = validateArgs(args)
      const profileDir = parsed.profile ?? process.env.DSH_PROFILE_DIR ?? ''
      if (profileDir === '') {
        throw new Error('profile_rollback: no profile directory — pass profile or set DSH_PROFILE_DIR')
      }

      if (parsed.action === 'save') {
        const result = checkpoint({ profileDir, limit: parsed.limit })
        return {
          action: 'save', profile: result.profileDir, depth: result.depth,
          restored: {}, wrote: [result.historyFile], needsInstall: [],
          warnings: result.warnings, dryRun: false,
        }
      }

      if (parsed.action === 'clear') {
        const done = parsed.confirm === true ? clearHistory(profileDir) : false
        return {
          action: 'clear', profile: profileDir, depth: 0,
          restored: {}, wrote: done ? ['rollback-history.json'] : [], needsInstall: [],
          warnings: [], dryRun: parsed.confirm !== true,
        }
      }

      // restore
      const result = rollback({ profileDir, write: parsed.confirm === true, limit: parsed.limit })
      return {
        action: 'restore', profile: result.profileDir, depth: result.depth,
        restored: result.restored, wrote: result.wrote, needsInstall: result.needsInstall,
        warnings: result.warnings, dryRun: result.dryRun,
      }
    },
  })
}
