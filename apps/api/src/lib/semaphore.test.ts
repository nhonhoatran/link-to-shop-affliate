import { describe, expect, it } from 'vitest';
import { createSemaphore } from './semaphore';

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const options = { maxQueue: 100, onFull: () => new Error('full') };

describe('createSemaphore', () => {
  it('never runs more than the limit at once and finishes every task', async () => {
    const semaphore = createSemaphore(2, options);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        semaphore.run(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await tick();
          active -= 1;
          return index;
        }),
      ),
    );
    expect(peak).toBe(2);
    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('releases the slot when a task throws', async () => {
    const semaphore = createSemaphore(1, options);
    await expect(semaphore.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(semaphore.run(async () => 'next')).resolves.toBe('next');
  });

  it('rejects with onFull once the waiting queue is full and recovers afterwards', async () => {
    const semaphore = createSemaphore(1, { maxQueue: 2, onFull: () => new Error('busy') });
    let unblock!: () => void;
    const gate = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const running = semaphore.run(() => gate.then(() => 'running'));
    const queued = [semaphore.run(async () => 'q1'), semaphore.run(async () => 'q2')];

    await expect(semaphore.run(async () => 'overflow')).rejects.toThrow('busy');

    unblock();
    await expect(Promise.all([running, ...queued])).resolves.toEqual(['running', 'q1', 'q2']);
    await expect(semaphore.run(async () => 'after')).resolves.toBe('after');
  });
});
