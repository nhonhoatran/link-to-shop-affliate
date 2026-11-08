'use client';

import { API_PATHS, type AdminOutfitListResponse } from '@under30ss/shared';
import { apiFetch } from '@/lib/api-client-browser';
import { AdminEntityPicker } from './admin-entity-picker';
import { PICKER_RESULT_SIZE, type PickerItem, type PickerSearch } from './use-entity-search';

const searchOutfits: PickerSearch = async (query, signal) => {
  const params = new URLSearchParams({ page: '1', size: String(PICKER_RESULT_SIZE) });
  if (query) params.set('q', query);
  const list = await apiFetch<AdminOutfitListResponse>(`${API_PATHS.admin.outfits}?${params}`, { signal });
  return {
    total: list.total,
    items: list.items.map((outfit) => ({
      id: outfit.id,
      label: outfit.title,
      imageUrl: outfit.modelImageUrl,
      ...(outfit.status === 'draft' ? { hint: 'Bản nháp' } : {}),
    })),
  };
};

interface OutfitPickerProps {
  selected: readonly PickerItem[];
  onChange: (next: PickerItem[]) => void;
}

export function OutfitPicker({ selected, onChange }: OutfitPickerProps) {
  return (
    <AdminEntityPicker
      id="collection-outfit-picker"
      label="Tìm outfit"
      searchPlaceholder="Gõ tên outfit"
      emptyText="Không có outfit nào khớp."
      selected={selected}
      onChange={onChange}
      search={searchOutfits}
      autoLoad
    />
  );
}
