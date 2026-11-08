'use client';

import { useMemo, useState } from 'react';
import { HOME_SECTION_META, type HomeSection } from '@under30ss/shared';
import type { FieldErrors } from '../validation-messages';
import type { FieldValues } from './field-values';
import { HOME_SECTION_FIELD_SPECS } from './home-section-field-specs';
import css from './home-editor.module.css';
import { validateSection } from './map-layout-errors';
import { SectionFields } from './section-fields';

interface SectionFormProps {
  section: HomeSection;
  /** Errors from saving, relative to the section's props. */
  errors: FieldErrors;
  onChange: (patch: FieldValues) => void;
}

/** Fields appear from the spec table; a field shows its own error once it has been left, saving shows all of them. */
export function SectionForm({ section, errors, onChange }: SectionFormProps) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const blurErrors = useMemo(() => {
    const live = validateSection(section);
    return Object.fromEntries(Object.entries(live).filter(([key]) => touched.has(key)));
  }, [section, touched]);

  return (
    <div
      className={css.sectionForm}
      role="group"
      aria-label={`Nội dung ${HOME_SECTION_META[section.type].label}`}
      onBlur={(event) => {
        const key = (event.target as HTMLElement).closest('[data-field]')?.getAttribute('data-field');
        if (key) setTouched((current) => new Set(current).add(key));
      }}
    >
      <SectionFields
        specs={HOME_SECTION_FIELD_SPECS[section.type]}
        values={section.props}
        path=""
        idPrefix={`section-${section.props.id}`}
        errors={{ ...blurErrors, ...errors }}
        onChange={onChange}
      />
    </div>
  );
}
