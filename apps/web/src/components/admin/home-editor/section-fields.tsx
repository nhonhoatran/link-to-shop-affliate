'use client';

import type { MediaUploadResponse } from '@under30ss/shared';
import { AdminFormField } from '../admin-form-field';
import type { FieldErrors } from '../validation-messages';
import type { FieldSpec } from './field-spec-types';
import { applyPatch, type FieldValues } from './field-values';
import css from './home-editor.module.css';
import { SectionArrayField } from './section-array-field';
import { SectionEntityListField } from './section-entity-list-field';
import { SectionImageField } from './section-image-field';

interface SectionFieldsProps {
  specs: readonly FieldSpec[];
  values: FieldValues;
  /** Prefix of this level inside the section props, e.g. `slides.0.`; error and data-field keys are built from it. */
  path: string;
  idPrefix: string;
  errors: FieldErrors;
  onChange: (patch: FieldValues) => void;
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export function SectionFields({ specs, values, path, idPrefix, errors, onChange }: SectionFieldsProps) {
  return (
    <>
      {specs.map((spec) => {
        if (spec.showIf && !spec.showIf(values)) return null;
        const key = `${path}${spec.name}`;
        const id = `${idPrefix}-${key.replaceAll('.', '-')}`;
        const error = errors[key];
        const value = values[spec.name];

        switch (spec.kind) {
          case 'text':
          case 'textarea': {
            const set = (raw: string) => onChange({ [spec.name]: raw === '' && spec.optional ? undefined : raw });
            return (
              <AdminFormField key={key} id={id} label={spec.label} hint={spec.hint} error={error}>
                {(control) =>
                  spec.kind === 'text' ? (
                    <input {...control} type="text" data-field={key} value={typeof value === 'string' ? value : ''} onChange={(e) => set(e.target.value)} />
                  ) : (
                    <textarea {...control} rows={4} data-field={key} value={typeof value === 'string' ? value : ''} onChange={(e) => set(e.target.value)} />
                  )
                }
              </AdminFormField>
            );
          }
          case 'number':
            return (
              <AdminFormField key={key} id={id} label={spec.label} hint={spec.hint} error={error}>
                {(control) => (
                  <input
                    {...control}
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={spec.min}
                    max={spec.max}
                    data-field={key}
                    value={typeof value === 'number' ? String(value) : ''}
                    onChange={(e) => onChange({ [spec.name]: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                )}
              </AdminFormField>
            );
          case 'select':
            return (
              <AdminFormField key={key} id={id} label={spec.label} hint={spec.hint} error={error}>
                {(control) => (
                  <select
                    {...control}
                    data-field={key}
                    value={value === undefined ? '' : String(value)}
                    onChange={(e) => onChange({ [spec.name]: spec.options.find((o) => String(o.value) === e.target.value)?.value })}
                  >
                    {spec.options.map((option) => (
                      <option key={option.value} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </AdminFormField>
            );
          case 'checkbox':
            return (
              <label key={key} className={css.checkRow}>
                <input type="checkbox" data-field={key} checked={value === true} onChange={(e) => onChange({ [spec.name]: e.target.checked })} />
                {spec.label}
              </label>
            );
          case 'image':
            return (
              <SectionImageField
                key={key}
                id={id}
                dataField={key}
                label={spec.label}
                value={value as { url?: string } | undefined}
                optional={spec.optional === true}
                error={error}
                onChange={(image: MediaUploadResponse | undefined) => onChange({ [spec.name]: image })}
              />
            );
          case 'outfit':
          case 'outfits':
          case 'collections':
            return (
              <SectionEntityListField
                key={key}
                id={id}
                dataField={key}
                label={spec.label}
                hint={spec.hint}
                kind={spec.kind === 'collections' ? 'collection' : 'outfit'}
                ids={spec.kind === 'outfit' ? (typeof value === 'string' ? [value] : []) : (asArray(value) as string[])}
                max={spec.max}
                error={error}
                onChange={(ids) => onChange({ [spec.name]: spec.kind === 'outfit' ? ids[0] : ids })}
              />
            );
          case 'array':
            return (
              <SectionArrayField
                key={key}
                spec={spec}
                id={id}
                dataField={key}
                items={asArray(value) as FieldValues[]}
                error={error}
                onChange={(items) => onChange({ [spec.name]: items })}
                renderItem={(item, index, onItemChange) => (
                  <SectionFields
                    specs={spec.fields}
                    values={item}
                    path={`${key}.${index}.`}
                    idPrefix={idPrefix}
                    errors={errors}
                    onChange={(patch) => onItemChange(applyPatch(item, patch))}
                  />
                )}
              />
            );
        }
      })}
    </>
  );
}
