import { createHash, randomUUID } from 'node:crypto';
import { lstat, opendir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { DesktopSettings } from '@under30ss/shared';
import { insideDirectory } from './local-paths';

export interface ScannedImage { id: string; name: string; path: string; sha256: string; bytes: Buffer }
export const scanImageFolder = async (
  folder: string, settings: DesktopSettings, onImage: (image: ScannedImage) => Promise<void>,
): Promise<string[]> => {
  const root = await realpath(folder);
  const warnings: string[] = [];
  const pending = [root];
  let visited = 0;
  let count = 0;
  while (pending.length) {
    const current = pending.pop()!;
    if (!insideDirectory(root, await realpath(current))) throw new Error('Thư mục chuyển hướng ra ngoài folder đã chọn');
    const directory = await opendir(current);
    for await (const entry of directory) {
      visited++;
      if (visited > settings.limits.maxScanEntries || count >= settings.limits.maxFiles) {
        warnings.push('Đã dừng quét theo giới hạn số tệp/thư mục. Có thể đổi giới hạn trong cấu hình và tạo phiên mới.');
        return warnings;
      }
      const candidate = path.join(current, entry.name);
      const metadata = await lstat(candidate);
      const label = path.relative(root, candidate);
      if (metadata.isSymbolicLink()) { warnings.push(`Bỏ qua liên kết: ${label}`); continue; }
      if (metadata.isDirectory()) { pending.push(candidate); continue; }
      if (!metadata.isFile() || !settings.limits.allowedExtensions.includes(path.extname(candidate).toLowerCase() as '.png')) continue;
      if (metadata.size > settings.limits.maxFileBytes) { warnings.push(`Ảnh quá dung lượng: ${label}`); continue; }
      const actual = await realpath(candidate);
      if (!insideDirectory(root, actual)) throw new Error('Ảnh chuyển hướng ra ngoài folder đã chọn');
      const bytes = await readFile(actual);
      if (bytes.length > settings.limits.maxFileBytes) { warnings.push(`Ảnh đổi dung lượng khi đọc: ${label}`); continue; }
      try {
        await onImage({ id: randomUUID(), name: label, path: actual, bytes, sha256: createHash('sha256').update(bytes).digest('hex') });
        count++;
      } catch { warnings.push(`Không đọc được ảnh: ${label}`); }
    }
  }
  return warnings;
};
