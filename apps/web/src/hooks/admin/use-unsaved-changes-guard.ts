'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const isPlainInternalLeftClick = (event: MouseEvent, anchor: HTMLAnchorElement): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey &&
  (anchor.target === '' || anchor.target === '_self') &&
  !anchor.hasAttribute('download') &&
  anchor.origin === window.location.origin &&
  anchor.pathname + anchor.search !== window.location.pathname + window.location.search;

/**
 * Warns before losing edits: the browser prompt on reload/close, and for in-app links a
 * confirm dialog driven by `pendingHref`. Browser back/forward is not intercepted.
 */
export function useUnsavedChangesGuard(dirty: boolean, navigate: (href: string) => void) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    // Capture phase on document runs before React/Next link handlers on the root.
    const onClick = (event: MouseEvent) => {
      if (bypass.current || !(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || !isPlainInternalLeftClick(event, anchor)) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(anchor.pathname + anchor.search + anchor.hash);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const confirmLeave = useCallback(() => {
    if (pendingHref === null) return;
    bypass.current = true;
    const href = pendingHref;
    setPendingHref(null);
    navigate(href);
  }, [pendingHref, navigate]);

  const cancelLeave = useCallback(() => setPendingHref(null), []);

  return { pendingHref, confirmLeave, cancelLeave };
}
