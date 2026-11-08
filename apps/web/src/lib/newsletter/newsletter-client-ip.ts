/**
 * The proxy appends the address it saw to X-Forwarded-For, so the last entry is the one a visitor cannot forge.
 * Returns undefined when the header is missing or empty.
 */
export function pickClientIp(forwardedFor: string | null | undefined): string | undefined {
  if (!forwardedFor) return undefined;
  const parts = forwardedFor
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.at(-1);
}
