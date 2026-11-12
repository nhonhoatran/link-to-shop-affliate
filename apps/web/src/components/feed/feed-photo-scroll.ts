export const PHOTO_TRACK_SELECTOR = '[data-photo-track]';

export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const photoCount = (track: HTMLElement): number => track.children.length;

export const currentPhotoIndex = (track: HTMLElement): number =>
  track.clientWidth > 0 ? Math.round(track.scrollLeft / track.clientWidth) : 0;

export function scrollToPhoto(track: HTMLElement, index: number): void {
  const target = Math.min(Math.max(index, 0), photoCount(track) - 1);
  track.scrollTo({ left: target * track.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function stepPhoto(track: HTMLElement, direction: -1 | 1): void {
  scrollToPhoto(track, currentPhotoIndex(track) + direction);
}
