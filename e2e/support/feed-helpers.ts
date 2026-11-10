import { expect, type Page } from '@playwright/test';

export const FEED_SLIDE = '[data-feed-slide]';
export const FEED_NEXT_LINK = 'a[rel="next"]';

/** Slides in the server HTML: the first batch. Counts `<article>` tags, since the RSC payload repeats the attribute. */
export function serverSlideCount(html: string): number {
  return (html.match(/<article[^>]*\sdata-feed-slide/g) ?? []).length;
}

/** Scrolls the feed to its end until the footer shows, which also loads every remaining batch. */
export async function scrollFeedToEnd(page: Page): Promise<void> {
  const feed = page.locator('[data-feed]');
  await expect
    .poll(
      async () => {
        await feed.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        return page.locator('[data-feed] footer').count();
      },
      { timeout: 30_000, intervals: [300, 500] },
    )
    .toBeGreaterThan(0);
}

/** Top offset of each slide inside the scroller, measured from the scroller's scroll origin. */
export function slideTops(page: Page): Promise<number[]> {
  return page.locator('[data-feed]').evaluate((scroller) => {
    const origin = scroller.getBoundingClientRect().top - scroller.scrollTop;
    return Array.from(scroller.querySelectorAll('[data-feed-slide]')).map((slide) => slide.getBoundingClientRect().top - origin);
  });
}
