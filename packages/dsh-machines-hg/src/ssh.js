// Minimal SSH exec — copy & adapt from dph-fleet/src/ssh/ssh.ts (plain JS, no deps).
// Only what machine_dispatch needs: BatchMode, IdentitiesOnly, keyPath, retry on 255.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SSH_CONNECT_TIMEOUT = 10;
const SSH_EXEC_TIMEOUT_MS = 120_000;
const CONTROL_PERSIST = 30;
const CONNECT_RETRY_DELAYS_MS = [500, 1500];

/**
 * Build ssh args array.
 * device = { host, port, user, keyPath } — from MachinesDomain record.
 */
export function buildSshArgs(device, command, opts = {}) {
  const args = [
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', `ConnectTimeout=${SSH_CONNECT_TIMEOUT}`,
  ];
  // Only pin a specific key when one is configured — an empty IdentityFile
  // breaks ssh ("no argument after keyword identityfile").
  if (device.keyPath !== undefined && device.keyPath !== '') {
    args.push(
      '-o', `IdentityFile=${device.keyPath}`,
      '-o', 'IdentitiesOnly=yes',
      // Windows OpenSSH: avoid agent hang when no agent service running.
      '-o', 'IdentityAgent=none',
    );
  }
  args.push('-p', String(device.port));
  if (opts.socketDir && opts.socketDir.length > 0) {
    args.push(
      '-o', 'ControlMaster=auto',
      '-o', `ControlPath=${join(opts.socketDir, controlPathSegment(device))}`,
      '-o', `ControlPersist=${CONTROL_PERSIST}`,
    );
  }
  args.push(`${device.user}@${device.host}`, command);
  return args;
}

function controlPathSegment(device) {
  return `${device.user}@${device.host}:${device.port}`.replace(/[^A-Za-z0-9.@_-]/g, '_');
}

/** Map ssh exit code/stderr to readable error text (never throw). */
export function sshExitErrorText(code, signal, stderr) {
  const tail = stderr.trim();
  if (code === 255) {
    const detail = tail.length > 0 ? ` (${tail.slice(0, 200)})` : '';
    return `ssh connect failed${detail}`;
  }
  if (code !== null) {
    return `remote command exit ${code}${tail.length > 0 ? `: ${tail.slice(0, 200)}` : ''}`;
  }
  if (signal) return `remote killed by signal ${signal}`;
  return tail.length > 0 ? tail : 'ssh exec failed';
}

/**
 * Execute remote command via ssh.
 * Returns Promise<{ok, exitCode, stdout, stderr, error?}> — never throws.
 */
export function sshExec(device, command, opts = {}) {
  const socketDir = opts.socketDir ?? '';
  const args = buildSshArgs(device, command, { socketDir });
  if (socketDir.length > 0) mkdirSync(socketDir, { recursive: true });

  return new Promise((resolve) => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    let child;
    try {
      // stdio pipe + immediate end() — 'ignore' breaks && chains on Windows OpenSSH.
      child = spawn('ssh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({ ok: false, exitCode: null, stdout: '', stderr: '', error: `ssh spawn failed: ${err.message}` });
      return;
    }
    child.stdin?.end();

    const timeoutMs = opts.timeoutMs ?? SSH_EXEC_TIMEOUT_MS;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      resolve({ ok: false, exitCode: null, stdout, stderr, error: `exec timeout ${Math.round(timeoutMs / 1000)}s` });
    }, timeoutMs);

    const finish = (r) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      resolve(r);
    };

    child.stdout?.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr?.on('data', (d) => { stderr += d.toString('utf8'); });

    // Windows: ssh.exe exits but 'close' event never fires when conhost holds pipes.
    // Fall back to 15s idle timeout on Windows only.
    const WINDOWS_IDLE_GRACE_MS = 15000;
    let idleTimer = null;
    if (process.platform === 'win32') {
      const armIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (settled) return;
        idleTimer = setTimeout(() => {
          finish({ ok: true, exitCode: 0, stdout, stderr });
        }, WINDOWS_IDLE_GRACE_MS);
      };
      child.stdout?.on('data', armIdle);
      child.stderr?.on('data', armIdle);
      armIdle();
    }

    child.on('error', (err) => {
      finish({ ok: false, exitCode: null, stdout, stderr, error: `ssh spawn error: ${err.message}` });
    });
    child.on('close', (code, signal) => {
      if (code === 0) finish({ ok: true, exitCode: 0, stdout, stderr });
      else finish({ ok: false, exitCode: code, stdout, stderr, error: sshExitErrorText(code, signal, stderr) });
    });

    opts.signal?.addEventListener('abort', () => {
      child.kill('SIGKILL');
      finish({ ok: false, exitCode: null, stdout, stderr, error: 'aborted' });
    }, { once: true });
  });
}

/** Retry on connect-class failure (255 / spawn error) only — remote business failure passes through. */
export async function sshExecWithRetry(device, command, opts = {}) {
  let result = await sshExec(device, command, opts);
  for (const delayMs of CONNECT_RETRY_DELAYS_MS) {
    if (result.ok) return result;
    if (opts.signal?.aborted) return result;
    if (!isConnectFailure(result)) return result;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await sshExec(device, command, opts);
  }
  return result;
}

function isConnectFailure(r) {
  return !r.ok && (r.exitCode === 255 || r.exitCode === null);
}

/** Shell single-quote escape for embedding arbitrary strings. */
export function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
