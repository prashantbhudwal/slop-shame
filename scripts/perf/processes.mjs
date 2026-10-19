import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { rm } from 'node:fs/promises';

const exec = promisify(execFile);
const psArgs = ['-axo', 'pid=,ppid=,rss=,command='];
const active = new Set();

export function parseProcesses(output) {
  return output.split('\n').flatMap(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/u);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), rssBytes: Number(match[3]) * 1024, command: match[4] }] : [];
  });
}

export function ownedTree(rows, profileDir, tracked = new Map()) {
  const marker = `--user-data-dir=${profileDir}`;
  const hasProfile = command => {
    const index = command.indexOf(marker);
    return index >= 0 && (index + marker.length === command.length || /\s/u.test(command[index + marker.length]));
  };
  const selected = new Set(rows.filter(row => hasProfile(row.command)
    || tracked.get(row.pid) === row.command).map(row => row.pid));
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) if (!selected.has(row.pid) && selected.has(row.ppid)) { selected.add(row.pid); changed = true; }
  }
  return rows.filter(row => selected.has(row.pid));
}

async function processes() {
  const { stdout } = await exec('ps', psArgs, { maxBuffer: 16 * 1024 ** 2 });
  return parseProcesses(stdout);
}

function signalRows(rows, signal) {
  // Descendants first, then roots, so a root cannot leave its children undiscovered.
  for (const row of [...rows].reverse()) {
    try { process.kill(row.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}

/** One active browser maximum. Matching uses this run's random temporary profile. */
export class BrowserProcessGuard {
  constructor(profileDir) {
    if (active.size) throw new Error('A perf browser is still active; refusing to launch another Chromium');
    this.profileDir = profileDir;
    this.tracked = new Map();
    this.peakRssBytes = 0;
    this.peakProcessCount = 0;
    this.sampleCount = 0;
    this.context = null;
    this.closing = null;
    this.shutdownVerified = false;
    active.add(this);
  }

  async sample() {
    const rows = ownedTree(await processes(), this.profileDir, this.tracked);
    for (const row of rows) this.tracked.set(row.pid, row.command);
    const rssBytes = rows.reduce((sum, row) => sum + row.rssBytes, 0);
    this.peakRssBytes = Math.max(this.peakRssBytes, rssBytes);
    this.peakProcessCount = Math.max(this.peakProcessCount, rows.length);
    this.sampleCount++;
    return { rssBytes, processCount: rows.length };
  }

  killSync() {
    try {
      const rows = ownedTree(parseProcesses(execFileSync('ps', psArgs, { encoding: 'utf8', maxBuffer: 16 * 1024 ** 2 })), this.profileDir, this.tracked);
      signalRows(rows, 'SIGKILL');
    } catch { /* Best effort during Node's synchronous exit hook. */ }
  }

  async shutdown() {
    if (this.closing) return this.closing;
    this.closing = this.closeAndVerify();
    return this.closing;
  }

  async closeAndVerify() {
    try {
      await this.sample(); // Capture child PIDs before the parent exits/reparents them.
      await Promise.race([this.context?.close().catch(() => {}), delay(5000, undefined, { ref: false })]);
      let rows = ownedTree(await processes(), this.profileDir, this.tracked);
      if (rows.length) signalRows(rows, 'SIGTERM');
      for (let attempt = 0; rows.length && attempt < 15; attempt++) {
        await delay(100);
        rows = ownedTree(await processes(), this.profileDir, this.tracked);
      }
      if (rows.length) signalRows(rows, 'SIGKILL');
      for (let attempt = 0; rows.length && attempt < 15; attempt++) {
        await delay(100);
        rows = ownedTree(await processes(), this.profileDir, this.tracked);
      }
      if (rows.length) throw new Error(`Owned Chromium processes survived cleanup: ${rows.map(row => row.pid).join(', ')}`);
      this.shutdownVerified = true;
      active.delete(this);
    } catch (error) { this.killSync(); throw error; }
  }

  result() {
    return {
      peakRssBytes: this.peakRssBytes, peakProcessCount: this.peakProcessCount, sampleCount: this.sampleCount,
      observedPids: [...this.tracked.keys()], shutdownVerified: this.shutdownVerified,
      method: 'Sum of ps RSS (KiB × 1024) across the owned Chromium browser process tree; shared pages may be counted more than once',
    };
  }
}

export function installProcessCleanup() {
  let terminating = false;
  const terminate = async (reason, code) => {
    if (terminating) { for (const guard of active) guard.killSync(); process.exit(code); }
    terminating = true;
    console.error(`\n${reason}: closing the owned perf browser process tree`);
    const watchdog = setTimeout(() => { for (const guard of active) guard.killSync(); process.exit(code); }, 10000);
    watchdog.unref();
    await Promise.allSettled([...active].map(async guard => {
      await guard.shutdown();
      await rm(guard.profileDir, { recursive: true, force: true, maxRetries: 3 });
    }));
    clearTimeout(watchdog);
    process.exit(code);
  };
  process.on('exit', () => { for (const guard of active) guard.killSync(); });
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) process.on(signal, () => { void terminate(signal, code); });
  process.on('uncaughtException', error => { console.error(error); void terminate('uncaughtException', 1); });
  process.on('unhandledRejection', error => { console.error(error); void terminate('unhandledRejection', 1); });
}

export const memoryLimitedArgs = ['--js-flags=--max-old-space-size=1024', '--renderer-process-limit=2'];
