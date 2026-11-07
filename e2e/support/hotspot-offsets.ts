/// <reference lib="dom" />
import type { Page } from '@playwright/test';

export interface HotspotOffsets {
  heightGap: number;
  hotspots: number[];
}

/** Distance in px between each hotspot centre and its anchor on the rendered model image. */
export async function measureHotspotOffsets(page: Page): Promise<HotspotOffsets> {
  return page.evaluate(() => {
    const figure = document.querySelector('[data-lookbook] figure');
    const img = figure?.querySelector('img');
    if (!figure || !img) throw new Error('model figure not found');
    const box = img.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    const hotspots = [...figure.querySelectorAll<HTMLElement>('[data-hotspot]')].map((el) => {
      const r = el.getBoundingClientRect();
      const x = box.left + (Number.parseFloat(el.style.left) / 100) * box.width;
      const y = box.top + (Number.parseFloat(el.style.top) / 100) * box.height;
      return Math.max(Math.abs(r.left + r.width / 2 - x), Math.abs(r.top + r.height / 2 - y));
    });
    return { heightGap: Math.abs(figureBox.height - box.height), hotspots };
  });
}
