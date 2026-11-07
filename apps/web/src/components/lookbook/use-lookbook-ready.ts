import { useEffect, useState } from 'react';

const isPending = (img: HTMLImageElement): boolean => !img.complete && img.getAttribute('loading') !== 'lazy';

/**
 * True once fonts, eager images and all page-load animations inside the root have settled.
 * Never goes back to false. Lazy images are skipped: their box is reserved by width/height, and
 * the `load` listener in the interactions component re-measures when they arrive.
 */
export function useLookbookReady(getRoot: () => HTMLElement | null): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = getRoot();
    if (!root || ready) return;
    let cancelled = false;

    const check = async () => {
      try {
        await document.fonts?.ready;
        if (cancelled || Array.from(root.querySelectorAll('img')).some(isPending)) return;
        const animations = typeof root.getAnimations === 'function' ? root.getAnimations({ subtree: true }) : [];
        await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
      } catch {
        // Treat a failed readiness probe as ready so decorative threads never stay hidden.
      }
      if (!cancelled && !Array.from(root.querySelectorAll('img')).some(isPending)) setReady(true);
    };

    // A failed image never fires `load`; without `error` the threads would stay hidden forever.
    root.addEventListener('load', check, true);
    root.addEventListener('error', check, true);
    void check();
    return () => {
      cancelled = true;
      root.removeEventListener('load', check, true);
      root.removeEventListener('error', check, true);
    };
  }, [getRoot, ready]);

  return ready;
}
