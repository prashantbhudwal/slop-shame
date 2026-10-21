// The content script's writes the user would notice losing: today's counters
// and remembered Destroys. A write the worker could not commit, or that got
// no answer at all, goes out again with backoff. Every retry is safe to apply
// twice: a daily delta carries an id the worker applies once, and a Destroy
// carries the time it happened, so it can't undo a later "forget".
import { StoreRequestError } from '../store/transport';
import { addDailyStats, rememberDestroyed, today, type DailyDelta } from './index';

const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 60_000;
const MAX_ATTEMPTS = 8;
const MAX_QUEUED = 100;

interface Write { send(): Promise<void>; attempts: number }

const queue: Write[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let stopped = false;

/** Sends once. A failure worth another try goes back in the queue. */
async function attempt(write: Write): Promise<void> {
  try {
    await write.send();
  } catch (error) {
    if (/extension context invalidated/i.test(error instanceof Error ? error.message : String(error))) {
      stopped = true;
      queue.length = 0;
      return;
    }
    // The worker rejected the message itself: it fails the same way every time.
    if (error instanceof StoreRequestError && !error.retryable) return;
    if (++write.attempts >= MAX_ATTEMPTS) return;
    queue.push(write);
    if (queue.length > MAX_QUEUED) queue.shift();
  }
}

function schedule(): void {
  if (stopped || timer !== undefined || !queue.length) return;
  timer = setTimeout(() => {
    timer = undefined;
    void retryQueued();
  }, Math.min(MAX_RETRY_MS, FIRST_RETRY_MS * 2 ** failures));
}

async function retryQueued(): Promise<void> {
  for (const write of queue.splice(0)) await attempt(write);
  failures = queue.length ? Math.min(failures + 1, 5) : 0;
  schedule();
}

async function post(write: Write): Promise<void> {
  if (stopped) return;
  await attempt(write);
  schedule();
}

/** Add to today's counters; retried until the worker commits it, counted once. */
export function postDailyStats(delta: DailyDelta): Promise<void> {
  const op = { id: crypto.randomUUID(), day: today() };
  return post({ send: () => addDailyStats(delta, op), attempts: 0 });
}

/** Keep a destroyed post hidden across sessions; retried until the worker commits it. */
export function postDestroyed(postId: string): Promise<void> {
  const at = Date.now();
  return post({ send: () => rememberDestroyed(postId, true, at), attempts: 0 });
}
