import argon2 from 'argon2';
import { AppError } from '../lib/app-error';
import { createSemaphore, type Semaphore } from '../lib/semaphore';
import { getArgon2MaxConcurrency, getArgon2MaxQueue } from '../lib/runtime-defaults';

const OPTIONS = { type: argon2.argon2id } as const;

// argon2 runs on the libuv thread pool; capping concurrency keeps a burst of
// login attempts from starving every other async operation (fs, DNS, sharp).
// The waiting queue is bounded too, so overload turns into fast 503s instead of unbounded memory and latency.
let limiter: Semaphore | undefined;
const limited = <T>(task: () => Promise<T>): Promise<T> => {
  limiter ??= createSemaphore(getArgon2MaxConcurrency(), {
    maxQueue: getArgon2MaxQueue(),
    onFull: () => new AppError(503, 'INTERNAL_ERROR', 'Hệ thống đang bận, vui lòng thử lại sau'),
  });
  return limiter.run(task);
};

export const hashPassword = (password: string): Promise<string> => limited(() => argon2.hash(password, OPTIONS));

/** A malformed hash counts as a mismatch; a full queue still propagates as 503. */
export const verifyPassword = (hash: string, password: string): Promise<boolean> =>
  limited(async () => {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  });

let dummyHash: Promise<string> | undefined;

/** Burns the same CPU as a real check so unknown emails are not distinguishable by timing. */
export const verifyAgainstDummy = async (password: string): Promise<void> => {
  if (!dummyHash) {
    const pending = hashPassword('timing-equalizer');
    // Do not cache a rejection (e.g. queue full): the next call must be able to retry.
    pending.catch(() => {
      if (dummyHash === pending) dummyHash = undefined;
    });
    dummyHash = pending;
  }
  await verifyPassword(await dummyHash, password);
};
