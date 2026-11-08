'use client';

import { useEffect, useRef, useState } from 'react';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';

export interface PickerItem {
  id: string;
  label: string;
  imageUrl?: string | null;
  hint?: string;
}

export interface PickerSearchResult {
  items: PickerItem[];
  /** Matches on the server; larger than items.length when only the first page is shown. */
  total: number;
}

export type PickerSearch = (query: string, signal: AbortSignal) => Promise<PickerSearchResult>;

// Technical constants: wait for a pause in typing, and keep the visible list short enough to scan.
export const SEARCH_DEBOUNCE_MS = 250;
export const PICKER_RESULT_SIZE = 20;

type SearchState = { status: 'idle' | 'loading' | 'ready' | 'error'; items: PickerItem[]; total: number };
const IDLE: SearchState = { status: 'idle', items: [], total: 0 };

/** Asks the server for one page of matches per query; older requests are cancelled. Does nothing until `enabled`. */
export function useEntitySearch(search: PickerSearch, query: string, enabled: boolean): SearchState {
  const redirectToLogin = useRedirectOnUnauthorized();
  const [state, setState] = useState<SearchState>(IDLE);
  const latestSearch = useRef(search);
  useEffect(() => {
    latestSearch.current = search;
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setState((current) => ({ ...current, status: 'loading' }));
        latestSearch
          .current(query.trim(), controller.signal)
          .then((result) => setState({ status: 'ready', ...result }))
          .catch((error: unknown) => {
            if (controller.signal.aborted || redirectToLogin(error)) return;
            setState((current) => ({ ...current, status: 'error' }));
          });
      },
      query === '' ? 0 : SEARCH_DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled, redirectToLogin]);

  return state;
}
