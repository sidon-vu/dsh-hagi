/**
 * Logic của row `dev-hg-rollback`: giữ một lịch sử ngắn các snapshot của
 * profile (dùng exportProfile của dev-hg-snapshot) và khôi phục profile về
 * snapshot gần nhất — "undo một bước" sau khi áp thay đổi.
 *
 * History nằm ở `<profile>/rollback-history.json`, ngoài các file mà
 * exportProfile gói (nó chỉ gói config ở gốc profile nên tự loại trừ khi nào
 * tên file đụng pattern nhạy cảm — tên này không đụng).
 *
 * Module thuần, không import gì từ DSH để cài từ git vẫn chạy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { exportProfile, importProfile } from './snapshot.js'

/** Giới hạn mặc định: giữ tối đa 5 snapshot — đủ để lùi vài bước, không phình. */
const DEFAULT_LIMIT = 5

const HISTORY_FILE = 'rollback-history.json'

const historyPath = (profileDir) => path.join(path.resolve(profileDir), HISTORY_FILE)

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
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

/** Đọc history (mảng snapshot). Trả [] khi file chưa có / hỏng. */
function loadHistory(profileDir) {
  const raw = readJson(historyPath(profileDir))
  const snapshots = Array.isArray(raw?.snapshots) ? raw.snapshots : []
  // Chỉ nhận snapshot đúng format của dev-hg-snapshot — file hỏng/ngoại lai
  // thì history coi như rỗng thay vì restore nhầm manifest lạ.
  return snapshots.filter((s) => s !== null && typeof s === 'object' && s.format === 1)
}

/** Ghi history với cắt trần `limit`. Trả số snapshot còn giữ. */
function saveHistory(profileDir, snapshots, limit) {
  const kept = snapshots.slice(0, Math.max(1, limit))
  const file = historyPath(profileDir)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ format: 1, snapshots: kept }, null, 2) + '\n', 'utf8')
  return kept.length
}

/**
 * Chụp snapshot hiện tại và đẩy vào đầu history (mới nhất trước).
 * @param {{ profileDir: string, limit?: number }} options
 */
export function checkpoint({ profileDir, limit = DEFAULT_LIMIT }) {
  const snapshot = exportProfile({ profileDir })
  // History nằm ngay gốc profile nên exportProfile gói luôn — bỏ ra khỏi files,
  // nếu không restore sẽ đè history hiện tại bằng bản cũ (và snapshot phình dần).
  if (snapshot.files !== null && typeof snapshot.files === 'object') delete snapshot.files[HISTORY_FILE]
  const snapshots = [snapshot, ...loadHistory(profileDir)]
  const kept = saveHistory(profileDir, snapshots, limit)
  return {
    profileDir: path.resolve(profileDir),
    historyFile: historyPath(profileDir),
    depth: kept,
    dropped: snapshots.length - kept,
    warnings: snapshot.warnings,
  }
}

/**
 * Khôi phục snapshot gần nhất trong history vào profile.
 * Dry-run mặc định: chỉ liệt kê file sẽ ghi; `write: true` mới ghi và pop.
 * Pop chỉ xảy ra SAU khi import thành công — lịch sử không mất nếu ghi hỏng.
 * @param {{ profileDir: string, write?: boolean, limit?: number }} options
 */
export function rollback({ profileDir, write = false, limit = DEFAULT_LIMIT }) {
  const dir = path.resolve(profileDir)
  const snapshots = loadHistory(dir)
  if (snapshots.length === 0) {
    return { profileDir: dir, depth: 0, restored: undefined, wrote: [], skipped: [], needsInstall: [], warnings: ['history rỗng — chưa có checkpoint nào'], dryRun: write === false }
  }

  const latest = snapshots[0]
  const result = importProfile({ snapshot: latest, targetDir: dir, force: true, write })
  if (write) saveHistory(dir, snapshots.slice(1), limit)

  return {
    profileDir: dir,
    depth: snapshots.length - (write ? 1 : 0),
    restored: { name: latest.name, createdAt: latest.createdAt, bundles: latest.bundles?.length ?? 0 },
    wrote: result.wrote,
    skipped: result.skipped,
    needsInstall: result.needsInstall,
    warnings: result.warnings,
    dryRun: !write,
  }
}

/** Xoá file history (dọn tay khi muốn). */
export function clearHistory(profileDir) {
  const file = historyPath(profileDir)
  if (exists(file)) fs.rmSync(file)
  return !exists(file)
}
