export interface Semaphore {
  run<T>(task: () => Promise<T>): Promise<T>;
}

export interface SemaphoreOptions {
  /** Tasks allowed to wait for a slot; beyond that `run` rejects with `onFull()`. */
  maxQueue: number;
  onFull: () => Error;
}

/** Runs at most `limit` tasks at once; up to `maxQueue` more wait in FIFO order. */
export const createSemaphore = (limit: number, { maxQueue, onFull }: SemaphoreOptions): Semaphore => {
  let active = 0;
  const waiting: (() => void)[] = [];

  const release = (): void => {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  };

  return {
    async run(task) {
      if (active >= limit) {
        if (waiting.length >= maxQueue) throw onFull();
        await new Promise<void>((resolve) => waiting.push(resolve));
      } else {
        active += 1;
      }
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
};
