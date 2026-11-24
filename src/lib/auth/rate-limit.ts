const DEFAULT_MAX_KEYS = 5000;
const attemptsByKey = new Map<string, number[]>();

function pruneExpired(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return timestamps.filter((ts) => ts > cutoff);
}

function evictOverflowKeys(): void {
  while (attemptsByKey.size >= DEFAULT_MAX_KEYS) {
    const oldestKey = attemptsByKey.keys().next().value;
    if (oldestKey === undefined) break;
    attemptsByKey.delete(oldestKey);
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const valid = pruneExpired(attemptsByKey.get(key) ?? [], windowMs, now);
  if (valid.length === 0) {
    attemptsByKey.delete(key);
    return { allowed: true, retryAfterSec: 0 };
  }
  attemptsByKey.set(key, valid);
  if (valid.length >= maxAttempts) {
    const oldest = valid[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailedAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  if (!attemptsByKey.has(key)) {
    evictOverflowKeys();
  }
  const valid = pruneExpired(attemptsByKey.get(key) ?? [], windowMs, now);
  valid.push(now);
  attemptsByKey.delete(key);
  attemptsByKey.set(key, valid);
}

export function resetRateLimit(key: string): void {
  attemptsByKey.delete(key);
}
