import { percentRectSchema, type PercentRect } from '@under30ss/shared';
import { TextField } from './form-fields';

const labels: Record<keyof PercentRect, string> = { x: 'Trái (%)', y: 'Trên (%)', width: 'Rộng (%)', height: 'Cao (%)' };

export function CropFields({ label, value, onChange }: { label: string; value: PercentRect | null; onChange: (value: PercentRect | null) => void }) {
  const result = percentRectSchema.safeParse(value);
  return <fieldset className="crop-fields"><legend>{label}</legend>
    {value ? <div className="coordinate-grid">{(Object.keys(labels) as (keyof PercentRect)[]).map((key) => <TextField key={key}
      label={labels[key]} value={value[key]} onChange={(input) => onChange({ ...value, [key]: Number(input) })}
      type="number" min={key === 'width' || key === 'height' ? 0.01 : 0} max={100} step="any" />)}</div>
      : <p className="hint">Chưa xác định vùng. Dùng toàn bộ ảnh rồi chỉnh lại tọa độ nếu cần.</p>}
    {value && !result.success ? <p className="field-error" role="alert">Vùng ảnh phải nằm trong 0–100%, rộng/cao dương và không vượt mép ảnh.</p> : null}
    <div className="actions compact"><button type="button" onClick={() => onChange({ x: 0, y: 0, width: 100, height: 100 })}>Giữ toàn bộ ảnh</button>
      {value ? <button type="button" onClick={() => onChange(null)}>Bỏ vùng crop</button> : null}</div>
  </fieldset>;
}

