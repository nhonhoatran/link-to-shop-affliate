import { useId, type InputHTMLAttributes } from 'react';

interface TextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  min?: number;
  max?: number;
  step?: number | 'any';
  maxLength?: number;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}

export function TextField({ label, value, onChange, hint, error, ...props }: TextFieldProps) {
  const id = useId();
  return <div className="field">
    <label htmlFor={id}>{label}{props.required ? ' *' : ''}</label>
    <input {...props} id={id} value={value} onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${id}-hint` : undefined} />
    {hint || error ? <span id={`${id}-hint`} className={error ? 'field-error' : 'hint'}>{error || hint}</span> : null}
  </div>;
}

export function TextAreaField({ label, value, onChange, hint, maxLength, rows = 3 }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string; maxLength?: number; rows?: number;
}) {
  const id = useId();
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <textarea id={id} value={value} rows={rows} maxLength={maxLength} onChange={(event) => onChange(event.target.value)}
      aria-describedby={hint ? `${id}-hint` : undefined} />
    {hint ? <span id={`${id}-hint`} className="hint">{hint}</span> : null}
  </div>;
}

