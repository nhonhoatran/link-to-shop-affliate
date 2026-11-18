import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renameAtomicFile } from '../../src/main/atomic-json';
import { cleanupDirectories, temporaryDirectory } from './test-fixtures';

afterEach(cleanupDirectories);
const paths = async () => {
  const directory = await temporaryDirectory();
  const source = path.join(directory, 'manifest.next.json');
  const target = path.join(directory, 'manifest.json');
  await writeFile(source, 'new checkpoint'); await writeFile(target, 'previous checkpoint');
  return { source, target };
};

describe('atomic rename under Windows file locks', () => {
  it.each(['EPERM', 'EBUSY', 'EACCES'])('retries a transient %s and then performs the real atomic rename', async (code) => {
    const { source, target } = await paths();
    const locked = Object.assign(new Error('Temporary Windows sharing violation'), { code });
    const replace = vi.fn<typeof rename>().mockImplementation(rename).mockRejectedValueOnce(locked);
    await renameAtomicFile(source, target, replace);
    expect(replace).toHaveBeenCalledTimes(2);
    expect(await readFile(target, 'utf8')).toBe('new checkpoint');
    await expect(readFile(source)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('bounds repeated sharing violations and preserves the previous target without a delete fallback', async () => {
    const { source, target } = await paths();
    const locked = Object.assign(new Error('Still locked'), { code: 'EPERM' });
    const replace = vi.fn<typeof rename>().mockRejectedValue(locked);
    await expect(renameAtomicFile(source, target, replace)).rejects.toBe(locked);
    expect(replace.mock.calls.length).toBeGreaterThan(1);
    expect(replace.mock.calls.length).toBeLessThan(20);
    expect(await readFile(target, 'utf8')).toBe('previous checkpoint');
    expect(await readFile(source, 'utf8')).toBe('new checkpoint');
  });
  it('propagates nontransient errors immediately instead of repeatedly attempting an invalid operation', async () => {
    const { source, target } = await paths();
    const missing = Object.assign(new Error('Source was removed'), { code: 'ENOENT' });
    const replace = vi.fn<typeof rename>().mockRejectedValue(missing);
    await expect(renameAtomicFile(source, target, replace)).rejects.toBe(missing);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(await readFile(target, 'utf8')).toBe('previous checkpoint');
  });
});
