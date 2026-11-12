import type { Locator, Page } from '@playwright/test';
import { FEED_SLIDE } from './feed-helpers';

export const PHOTO_TRACK = '[data-photo-track]';
/** Above this many photos the dots give way to an "i/n" counter (see MAX_DOTS in feed-photo-nav.tsx). */
export const MAX_DOTS = 10;

export const firstSlide = (page: Page): Locator => page.locator(FEED_SLIDE).first();
export const firstTrack = (page: Page): Locator => firstSlide(page).locator(PHOTO_TRACK);

/** Photo the track has snapped to, from its scroll offset. */
export const photoIndex = (track: Locator): Promise<number> =>
  track.evaluate((el) => (el.clientWidth > 0 ? Math.round(el.scrollLeft / el.clientWidth) : -1));

/** A real touch drag from right to left across the track, sent as CDP touch input. Needs hasTouch. */
export async function swipeLeft(page: Page, track: Locator): Promise<void> {
  const box = await track.boundingBox();
  if (!box) throw new Error('photo track has no bounding box');
  const y = box.y + box.height * 0.4;
  const startX = box.x + box.width * 0.8;
  const endX = box.x + box.width * 0.2;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
    const steps = 12;
    for (let step = 1; step <= steps; step++) {
      const x = startX + ((endX - startX) * step) / steps;
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await session.detach();
  }
}
