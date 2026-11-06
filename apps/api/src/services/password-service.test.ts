import { beforeEach, describe, expect, it, vi } from 'vitest';

const hash = vi.fn();
const verify = vi.fn();

vi.mock('argon2', () => ({ default: { argon2id: 2, hash, verify } }));

beforeEach(() => {
  hash.mockReset();
  verify.mockReset();
  vi.resetModules();
  delete process.env.ARGON2_MAX_QUEUE;
  delete process.env.ARGON2_MAX_CONCURRENCY;
});

describe('verifyAgainstDummy', () => {
  it('retries the dummy hash after a rejected attempt instead of caching the failure', async () => {
    hash.mockRejectedValueOnce(new Error('hash failed')).mockResolvedValue('$argon2id$dummy');
    verify.mockResolvedValue(false);
    const { verifyAgainstDummy } = await import('./password-service.js');

    await expect(verifyAgainstDummy('x')).rejects.toThrow('hash failed');
    await expect(verifyAgainstDummy('x')).resolves.toBeUndefined();
    expect(hash).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenCalledWith('$argon2id$dummy', 'x');
  });

  it('caches a successful dummy hash', async () => {
    hash.mockResolvedValue('$argon2id$dummy');
    verify.mockResolvedValue(false);
    const { verifyAgainstDummy } = await import('./password-service.js');

    await verifyAgainstDummy('a');
    await verifyAgainstDummy('b');
    expect(hash).toHaveBeenCalledTimes(1);
  });
});

describe('argon2 queue', () => {
  it('answers 503 in Vietnamese once the waiting queue is full', async () => {
    process.env.ARGON2_MAX_CONCURRENCY = '1';
    process.env.ARGON2_MAX_QUEUE = '1';
    let release!: () => void;
    hash.mockImplementationOnce(() => new Promise<string>((resolve) => (release = () => resolve('h1'))));
    hash.mockResolvedValue('h');
    const { hashPassword } = await import('./password-service.js');

    const first = hashPassword('a');
    const queued = hashPassword('b');
    await expect(hashPassword('c')).rejects.toMatchObject({ status: 503, message: 'Hệ thống đang bận, vui lòng thử lại sau' });

    release();
    await expect(Promise.all([first, queued])).resolves.toEqual(['h1', 'h']);
  });

  it('keeps treating a malformed hash as a mismatch', async () => {
    verify.mockRejectedValue(new Error('bad hash'));
    const { verifyPassword } = await import('./password-service.js');
    await expect(verifyPassword('garbage', 'pw')).resolves.toBe(false);
  });
});
