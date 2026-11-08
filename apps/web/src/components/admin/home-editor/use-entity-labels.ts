'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl, type CollectionResponse, type OutfitResponse } from '@under30ss/shared';
import { apiFetch } from '@/lib/api-client-browser';

export type EntityKind = 'outfit' | 'collection';

export const LABEL_LOADING = 'Đang tải…';
export const LABEL_UNKNOWN = 'Không rõ tên (có thể đã bị xoá)';

const fetchLabel = async (kind: EntityKind, id: string): Promise<string> =>
  kind === 'outfit'
    ? (await apiFetch<OutfitResponse>(apiUrl.adminOutfit(id))).title
    : (await apiFetch<CollectionResponse>(apiUrl.adminCollection(id))).name;

/** Sections store ids only; this looks up the names to show, once per id. */
export function useEntityLabels(kind: EntityKind, ids: readonly string[]) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = ids.filter((id) => !(id in labels) && !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    void Promise.all(
      missing.map((id) =>
        fetchLabel(kind, id)
          .then((label): [string, string] => [id, label])
          .catch((): [string, string] => [id, LABEL_UNKNOWN]),
      ),
    ).then((entries) => setLabels((current) => ({ ...current, ...Object.fromEntries(entries) })));
  }, [ids, kind, labels]);

  /** Names already known from a picker, so they need no extra request. */
  const remember = useCallback(
    (items: readonly { id: string; label: string }[]) =>
      setLabels((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item.label])) })),
    [],
  );

  return { labelOf: (id: string) => labels[id] ?? LABEL_LOADING, remember };
}
