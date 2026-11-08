'use client';

import { useEffect, useRef, useState } from 'react';
import { API_PATHS, apiUrl, type AdminCollectionListResponse, type CollectionResponse } from '@under30ss/shared';
import { apiFetch } from '@/lib/api-client-browser';
import { AdminEntityPicker } from './admin-entity-picker';
import { PICKER_RESULT_SIZE, type PickerItem, type PickerSearch } from './use-entity-search';

const UNKNOWN_NAME = 'Không rõ tên';
const LOADING_NAME = 'Đang tải…';

const searchCollections: PickerSearch = async (query, signal) => {
  const params = new URLSearchParams({ page: '1', size: String(PICKER_RESULT_SIZE) });
  if (query) params.set('q', query);
  const list = await apiFetch<AdminCollectionListResponse>(`${API_PATHS.admin.collections}?${params}`, { signal });
  return {
    total: list.total,
    items: list.items.map((collection) => ({
      id: collection.id,
      label: collection.name,
      imageUrl: collection.coverImageUrl,
      ...(collection.status === 'draft' ? { hint: 'Bản nháp' } : {}),
    })),
  };
};

interface CollectionPickerProps {
  /** Selected collection ids; names are looked up here because outfits only carry ids. */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  error?: string | undefined;
  id?: string;
  hint?: string;
  autoLoad?: boolean;
}

export function CollectionPicker({
  value,
  onChange,
  error,
  id = 'outfit-collections',
  hint = 'Chọn bộ sưu tập chứa outfit này. Lưu bằng nút Lưu của trang.',
  autoLoad = false,
}: CollectionPickerProps) {
  const [known, setKnown] = useState<Record<string, PickerItem>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = value.filter((id) => !known[id] && !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    void Promise.all(
      missing.map((id) =>
        apiFetch<CollectionResponse>(apiUrl.adminCollection(id))
          .then((collection): PickerItem => ({ id, label: collection.name }))
          .catch((): PickerItem => ({ id, label: UNKNOWN_NAME })),
      ),
    ).then((items) => setKnown((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item])) })));
  }, [value, known]);

  const selected = value.map((id) => known[id] ?? { id, label: LOADING_NAME });

  return (
    <AdminEntityPicker
      id={id}
      label="Bộ sưu tập"
      hint={hint}
      autoLoad={autoLoad}
      error={error}
      searchPlaceholder="Gõ tên bộ sưu tập"
      emptyText="Không có bộ sưu tập nào khớp."
      selected={selected}
      onChange={(items) => {
        setKnown((current) => ({ ...Object.fromEntries(items.filter((item) => item.label !== LOADING_NAME).map((item) => [item.id, item])), ...current }));
        onChange(items.map((item) => item.id));
      }}
      search={searchCollections}
    />
  );
}
