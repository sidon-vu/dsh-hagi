/**
 * Row `dev-hg-doctor`: công cụ cho agent so trạng thái mong muốn của một profile
 * (patch trong `workbench/profiles/<máy>/`) với trạng thái thật trên máy, và báo
 * lệch: bundle thiếu, link gãy, version lệch, row bị tắt nhầm. Chỉ đọc.
 *
 * Không import gì từ @deepseek-ai/* — package cài từ git không resolve được.
 * `ctx.pluginManager` là nguồn phán quyết của chính DSH, nhưng **không** đưa vào
 * `inject`: thiếu service thì row vẫn activate và lùi về đọc đĩa.
 */
import fs from 'node:fs'
import path from 'node:path'
import { doctor } from './doctor.js'

export const name = 'dev-hg-doctor'
export const inject = ['tools']

const DESCRIPTION = [
  'Compare a DSH profile with its desired state and report drift: bundles that are declared but',
  'missing or unreadable, broken link targets, versions the running DSH rejects, and rows the',
  'profile patch keeps disabled although the desired patch enables them. Read-only; run it before',
  'touching a machine or after a sync between machines.',
].join(' ')

const PARAMETERS = {
  profile: {
    type: 'string',
    description: 'Absolute profile directory to inspect. Defaults to the profile of the running session (DSH_PROFILE_DIR).',
  },
  desired: {
    type: 'string',
    description: 'Absolute path to the desired patch file, usually workbench/profiles/<machine>/cordis.patch.yml. Row-level checks run only when given.',
  },
  includeUndeclared: {
    type: 'boolean',
    description: 'Also report live rows that no profile patch declares. Noisier on profiles with many bundles.',
  },
  limit: {
    type: 'integer',
    description: 'Maximum number of findings returned, 1 to 200. Defaults to 50, drift before info.',
  },
}

/** Output schema là JSON Schema chuẩn: `required` là mảng tên field ở cấp object. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['profile', 'desired', 'bundles', 'desiredRows', 'drift', 'findings', 'truncated'],
  properties: {
    profile: { type: 'string', description: 'Profile directory inspected.' },
    desired: { type: 'string', description: 'Desired patch file, empty when none was given.' },
    bundles: { type: 'integer', description: 'Dependencies declared by the profile manifest.' },
    desiredRows: { type: 'integer', description: 'Rows the desired patch mentions.' },
    drift: { type: 'integer', description: 'Findings with severity drift.' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'severity', 'target', 'detail'],
        properties: {
          kind: {
            type: 'string',
            description: 'profile-missing, desired-missing, link-missing, bundle-missing, bundle-error, version-incompatible, version-mismatch, row-disabled, row-not-live, row-unknown, row-undeclared.',
          },
          severity: { type: 'string', description: 'drift or info.' },
          target: { type: 'string', description: 'Bundle name, row id or path the finding is about.' },
          detail: { type: 'string', description: 'What is wrong, in the words of the check that found it.' },
        },
      },
    },
    truncated: { type: 'boolean', description: 'True when findings were dropped; raise limit.' },
  },
}

const validateArgs = (args) => {
  if (args === null || typeof args !== 'object') throw new Error('profile_doctor: arguments must be an object')
  if (args.profile !== undefined && typeof args.profile !== 'string') throw new Error('profile_doctor: profile must be a string')
  if (args.desired !== undefined && typeof args.desired !== 'string') throw new Error('profile_doctor: desired must be a string')
  if (args.includeUndeclared !== undefined && typeof args.includeUndeclared !== 'boolean') {
    throw new Error('profile_doctor: includeUndeclared must be a boolean')
  }
  if (args.limit !== undefined && !Number.isInteger(args.limit)) throw new Error('profile_doctor: limit must be an integer')
  return { profile: args.profile, desired: args.desired, includeUndeclared: args.includeUndeclared, limit: args.limit }
}

/** Bundle list của DSH, hoặc undefined khi service vắng (profile không quản lý plugin). */
const readBundles = async (ctx) => {
  try {
    const manager = ctx?.pluginManager
    if (manager === undefined || typeof manager.listBundles !== 'function') return undefined
    return await manager.listBundles()
  } catch {
    return undefined
  }
}

const render = (value) => {
  const head = [
    `Lệch trạng thái — ${value.profile}`,
    `desired: ${value.desired === '' ? '(không đưa, chỉ kiểm cấu trúc)' : value.desired}`,
    `${value.bundles} bundle khai · ${value.desiredRows} row mong muốn · ${value.drift} lệch`,
  ]
  const body = value.findings.map((item) => `[${item.kind}] ${item.target} — ${item.detail}`)
  if (body.length === 0) body.push('Không thấy lệch.')
  if (value.truncated) body.push('Còn nữa — tăng limit.')
  return [{ type: 'text', text: [...head, '', ...body].join('\n') }]
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'profile_doctor',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => render(value) },
    async execute(args) {
      const parsed = validateArgs(args)
      const profileDir = parsed.profile ?? process.env.DSH_PROFILE_DIR
      if (typeof profileDir !== 'string' || profileDir.length === 0) {
        throw new Error('profile_doctor: no profile argument and DSH_PROFILE_DIR is unset — pass the profile directory')
      }
      let desiredText
      if (parsed.desired !== undefined) {
        try {
          desiredText = fs.readFileSync(path.resolve(parsed.desired), 'utf8')
        } catch {
          desiredText = undefined
        }
      }
      return doctor({
        profileDir,
        desiredText,
        desiredPath: parsed.desired,
        bundles: await readBundles(ctx),
        includeUndeclared: parsed.includeUndeclared,
        limit: parsed.limit,
      })
    },
  })
}
