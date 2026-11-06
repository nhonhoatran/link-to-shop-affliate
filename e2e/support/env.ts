import path from 'node:path';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@under30ss.local';
export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const VISUALS_DIR = path.join(REPO_ROOT, 'plans', '261106-1201-under30ss-shop-the-look', 'visuals');

/** Password comes only from the environment, never from a repo file. */
export function adminPassword(): string {
  const value = process.env.E2E_ADMIN_PASSWORD;
  if (!value) throw new Error('E2E_ADMIN_PASSWORD is not set');
  return value;
}

export const assetPath = (file: string): string => path.join(REPO_ROOT, 'assets-source', 'cut', 'mesh-84', file);

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
