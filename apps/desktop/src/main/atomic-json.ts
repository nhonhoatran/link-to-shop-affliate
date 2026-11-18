import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { z } from 'zod';

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';
const retryableRenameCodes = new Set(['EPERM', 'EBUSY', 'EACCES']);
export const renameAtomicFile = async (
  source: string, target: string, move = rename, delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> => {
  // Technical file-sharing backoff; import timeouts and quotas remain user-configurable.
  const waits = [25, 75, 150, 300];
  for (let attempt = 0; ; attempt++) {
    try { await move(source, target); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!retryableRenameCodes.has(code ?? '') || attempt >= waits.length) throw error;
      await delay(waits[attempt]!);
    }
  }
};
export const writeAtomicJson = async (file: string, value: unknown, backup = true): Promise<void> => {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n', 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    if (backup) {
      try { await copyFile(file, `${file}.bak`); } catch (error) { if (!missing(error)) throw error; }
    }
    await renameAtomicFile(temporary, file);
  } finally { await rm(temporary, { force: true }); }
};

export const readBoundedText = async (file: string, maxBytes: number): Promise<string> => {
  if ((await stat(file)).size > maxBytes) throw new Error('Tệp vượt giới hạn đọc');
  const bytes = await readFile(file);
  if (bytes.length > maxBytes) throw new Error('Tệp thay đổi và vượt giới hạn đọc');
  return bytes.toString('utf8');
};

export const readRecoverableJson = async <T>(file: string, schema: z.ZodType<T>, maxBytes: number): Promise<T> => {
  try { return schema.parse(JSON.parse(await readBoundedText(file, maxBytes))); }
  catch (original) {
    let value: T;
    try { value = schema.parse(JSON.parse(await readBoundedText(`${file}.bak`, maxBytes))); }
    catch { throw original; }
    await writeAtomicJson(file, value, false);
    return value;
  }
};
