import { useEffect, type RefObject } from 'react';

/** Mirrors the height of `root`'s first match of `selector` into a CSS custom property on `root`. */
export function useElementHeightVar(root: RefObject<HTMLElement | null>, selector: string, property: string) {
  useEffect(() => {
    const host = root.current;
    const target = host?.querySelector<HTMLElement>(selector);
    if (!host || !target) return;
    const sync = () => host.style.setProperty(property, `${target.offsetHeight}px`);
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    observer.observe(target);
    return () => observer.disconnect();
  }, [root, selector, property]);
}
