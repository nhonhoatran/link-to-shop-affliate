import type { Transition } from 'motion/react';

/** Reads duration/easing from the CSS tokens so no timing number lives in a component. */
export function readMotionTransition(): Transition | undefined {
  const style = getComputedStyle(document.documentElement);
  const duration = Number.parseFloat(style.getPropertyValue('--duration-base'));
  const bezier = /cubic-bezier\(([^)]+)\)/.exec(style.getPropertyValue('--easing-standard'));
  const points = bezier?.[1]?.split(',').map((value) => Number.parseFloat(value));
  if (!Number.isFinite(duration) || points?.length !== 4 || points.some(Number.isNaN)) return undefined;
  return { duration: duration / 1000, ease: points as [number, number, number, number] };
}
