'use client';

import { useSyncExternalStore } from 'react';

// 1024px = --bp-lg: the editor switches from tabs to two columns here.
const WIDE_QUERY = '(min-width: 1024px)';

const canMatch = () => typeof window.matchMedia === 'function';

const subscribe = (notify: () => void) => {
  if (!canMatch()) return () => undefined;
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

const getSnapshot = () => canMatch() && window.matchMedia(WIDE_QUERY).matches;

/** False on the server and during hydration: CSS already lays the first paint out correctly, this only cleans up ARIA roles. */
export const useWideEditorLayout = (): boolean => useSyncExternalStore(subscribe, getSnapshot, () => false);
