import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { clientImportIdSchema } from '@under30ss/shared';

export const insideDirectory = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
export const sessionDirectory = (dataRoot: string, sessionId: string): string =>
  path.join(dataRoot, 'sessions', clientImportIdSchema.parse(sessionId));

export const checkedSessionDirectory = async (dataRoot: string, sessionId: string): Promise<string> => {
  const directory = sessionDirectory(dataRoot, sessionId);
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error('Thư mục phiên không hợp lệ');
  const actual = await realpath(directory);
  if (!insideDirectory(await realpath(path.join(dataRoot, 'sessions')), actual)) throw new Error('Phiên nằm ngoài vùng dữ liệu ứng dụng');
  return actual;
};

export const checkedLocalFile = async (root: string, relative: string): Promise<string> => {
  const candidate = path.resolve(root, relative);
  if (!insideDirectory(root, candidate) || (await lstat(candidate)).isSymbolicLink()) throw new Error('Đường dẫn ảnh ngoài phạm vi phiên');
  const actual = await realpath(candidate);
  const actualRoot = await realpath(root);
  if (!insideDirectory(actualRoot, actual)) throw new Error('Ảnh chuyển hướng ra ngoài phiên');
  if (!(await lstat(actual)).isFile()) throw new Error('Ảnh không phải tệp thường');
  return actual;
};
