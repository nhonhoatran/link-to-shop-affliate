import type { Anchor } from '@under30ss/shared';

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

/** Pointer position as percentages of the image box, one decimal, clamped to 0..100. Null for an empty box. */
export const anchorFromPointer = (
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): Anchor | null => {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: clampPercent(round1(((clientX - rect.left) / rect.width) * 100)),
    y: clampPercent(round1(((clientY - rect.top) / rect.height) * 100)),
  };
};
