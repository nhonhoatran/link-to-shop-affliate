export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isDuplicateKey = (error: unknown): boolean => (error as { code?: number }).code === 11000;
