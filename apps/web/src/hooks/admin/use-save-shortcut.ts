'use client';

import { useEffect, useRef } from 'react';

/** Ctrl/Cmd+S runs `onSave` instead of the browser's "save page" dialog. */
export function useSaveShortcut(onSave: () => void): void {
  const latest = useRef(onSave);
  useEffect(() => {
    latest.current = onSave;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        latest.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
