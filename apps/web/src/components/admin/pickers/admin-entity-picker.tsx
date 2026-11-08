'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { AdminFormField } from '../admin-form-field';
import { StatusMessage } from '../save-status-text';
import styles from './admin-entity-picker.module.css';
import { useEntitySearch, type PickerItem, type PickerSearch } from './use-entity-search';

export interface AdminEntityPickerProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  searchPlaceholder: string;
  emptyText: string;
  selected: readonly PickerItem[];
  onChange: (next: PickerItem[]) => void;
  search: PickerSearch;
  /** Load the first page right away (picker inside a dialog); otherwise on first focus or typing. */
  autoLoad?: boolean;
}

/** Searchable multi-select: the server answers every query, ticks and chips are only local selection state. */
export function AdminEntityPicker({
  id,
  label,
  hint,
  error,
  searchPlaceholder,
  emptyText,
  selected,
  onChange,
  search,
  autoLoad = false,
}: AdminEntityPickerProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(autoLoad);
  const result = useEntitySearch(search, query, active);
  const isSelected = (itemId: string) => selected.some((item) => item.id === itemId);

  const toggle = (item: PickerItem) =>
    onChange(isSelected(item.id) ? selected.filter((entry) => entry.id !== item.id) : [...selected, item]);

  const statusText =
    result.status === 'loading'
      ? 'Đang tìm…'
      : result.status === 'error'
        ? 'Không tải được danh sách. Gõ lại để thử lại.'
        : result.status === 'ready' && result.items.length === 0
          ? emptyText
          : result.status === 'ready' && result.total > result.items.length
            ? `Hiện ${result.items.length} / ${result.total} kết quả. Gõ để thu hẹp.`
            : '';

  return (
    <AdminFormField id={id} label={label} hint={hint} error={error}>
      {(control) => (
        <div className={styles.picker}>
          {selected.length > 0 ? (
            <ul className={styles.chips} aria-label={`${label} đã chọn`}>
              {selected.map((item) => (
                <li key={item.id} className={styles.chip}>
                  <span className={styles.chipLabel}>{item.label}</span>
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label={`Bỏ ${item.label}`}
                    onClick={() => toggle(item)}
                  >
                    <DecorativeIcon icon={X} size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            {...control}
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            autoComplete="off"
            maxLength={100}
            onFocus={() => setActive(true)}
            onChange={(event) => {
              setActive(true);
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          {result.items.length > 0 ? (
            <ul className={styles.results} aria-busy={result.status === 'loading'}>
              {result.items.map((item) => (
                <li key={item.id}>
                  <label className={styles.option}>
                    <input type="checkbox" checked={isSelected(item.id)} onChange={() => toggle(item)} />
                    {item.imageUrl ? (
                      <span className={styles.thumb}>
                        <Image src={item.imageUrl} alt="" fill sizes="40px" />
                      </span>
                    ) : null}
                    <span className={styles.optionLabel}>{item.label}</span>
                    {item.hint ? <span className={styles.optionHint}>{item.hint}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <StatusMessage>{statusText}</StatusMessage>
        </div>
      )}
    </AdminFormField>
  );
}
