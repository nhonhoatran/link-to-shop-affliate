/** Anonymous read is only granted to this bucket prefix (see infra/rustfs-init), so public content must live under it. */
export const PUBLIC_KEY_PREFIX = 'public/';

export const isPublicKey = (key: string): boolean => key.startsWith(PUBLIC_KEY_PREFIX);

export const PUBLIC_KEY_ERROR = `Image key must start with ${PUBLIC_KEY_PREFIX}`;
