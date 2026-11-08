'use client';

import { arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';
import { MAX_FOOTER_COLUMNS } from '@under30ss/shared';
import { ConfirmDialog } from '../confirm-dialog';
import adminStyles from '../admin.module.css';
import type { FieldErrors } from '../validation-messages';
import { emptyColumn, type FooterColumnRow } from './settings-form-state';
import { SettingsFooterColumnCard } from './settings-footer-column-card';

interface SettingsFooterColumnsEditorProps {
  columns: FooterColumnRow[];
  errors: FieldErrors;
  onChange: (columns: FooterColumnRow[]) => void;
}

const filledLinks = (column: FooterColumnRow): number =>
  column.links.filter((link) => link.label.trim() !== '' || link.href.trim() !== '').length;

export function SettingsFooterColumnsEditor({ columns, errors, onChange }: SettingsFooterColumnsEditorProps) {
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const full = columns.length >= MAX_FOOTER_COLUMNS;
  const target = pendingRemove === null ? undefined : columns[pendingRemove];
  const remove = (index: number) => onChange(columns.filter((_, i) => i !== index));

  return (
    <div>
      <h3 className={adminStyles.panelTitle}>Cột link</h3>
      {columns.map((column, index) => (
        <SettingsFooterColumnCard
          key={column.key}
          index={index}
          total={columns.length}
          column={column}
          errors={errors}
          onChange={(next) => onChange(columns.map((item, i) => (i === index ? next : item)))}
          onMove={(direction) => onChange(arrayMove(columns, index, index + direction))}
          onRemove={() => (filledLinks(column) > 0 ? setPendingRemove(index) : remove(index))}
        />
      ))}
      <div className={adminStyles.btnGroup}>
        <button
          type="button"
          className={`${adminStyles.btn} ${adminStyles.btnSecondary}`}
          disabled={full}
          onClick={() => onChange([...columns, emptyColumn()])}
        >
          Thêm cột
        </button>
        <p className={adminStyles.hint}>Tối đa {MAX_FOOTER_COLUMNS} cột</p>
      </div>
      <ConfirmDialog
        open={target !== undefined}
        title={`Xoá cột ${target?.title.trim() || ''}`.trim()}
        message={`Xoá cột và ${target ? filledLinks(target) : 0} link trong cột?`}
        confirmLabel="Xoá cột"
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove !== null) remove(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </div>
  );
}
