/// <reference lib="dom" />
import { test, expect } from '@playwright/test';

const SLUGS = ['dramatic', 'mesh-84'];
const WIDTHS = [1440, 390];
const TOLERANCE_PX = 2;

// Anchors are stored as % of the model image, so each hotspot centre must land on that spot of the rendered image.
for (const slug of SLUGS) {
  for (const width of WIDTHS) {
    test(`hotspots sit on their anchor of the model image: ${slug} @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/look/${slug}`);
      const offsets = await page.evaluate(() => {
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
      expect(offsets.hotspots.length).toBeGreaterThan(0);
      expect(offsets.heightGap).toBeLessThanOrEqual(TOLERANCE_PX);
      for (const offset of offsets.hotspots) expect(offset).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
}
