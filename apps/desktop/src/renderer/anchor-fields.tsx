import { percentPointSchema, percentRectSchema, sourcePointToModel, type PercentPoint, type PercentRect } from '@under30ss/shared';
import { TextField } from './form-fields';

export function AnchorFields({ value, modelCrop, onChange }: { value: PercentPoint | null; modelCrop: PercentRect | null; onChange: (value: PercentPoint | null) => void }) {
  const validCrop = percentRectSchema.safeParse(modelCrop);
  const validPoint = percentPointSchema.safeParse(value);
  const mapped = validCrop.success && validPoint.success ? sourcePointToModel(validPoint.data, validCrop.data) : null;
  return <fieldset className="anchor-fields"><legend>Điểm nối trên người mẫu</legend>
    <p className="hint">Tọa độ theo poster gốc đã xoay đúng chiều. Có thể để trống nếu chưa xác định được.</p>
    {value ? <><div className="field-grid">
      <TextField label="Điểm nối X (%)" value={value.x} type="number" min={0} max={100} step="any" onChange={(input) => onChange({ ...value, x: Number(input) })} />
      <TextField label="Điểm nối Y (%)" value={value.y} type="number" min={0} max={100} step="any" onChange={(input) => onChange({ ...value, y: Number(input) })} />
    </div>{mapped ? <p className="hint">Trên ảnh người mẫu: X {mapped.x.toFixed(1)}% · Y {mapped.y.toFixed(1)}%.</p>
      : <p className="field-error">Điểm nằm ngoài ảnh người mẫu hoặc chưa hợp lệ. Bỏ điểm hoặc sửa vùng ảnh.</p>}
      <button type="button" onClick={() => onChange(null)}>Bỏ điểm nối</button></> : <button type="button" onClick={() => onChange(validCrop.success
        ? { x: validCrop.data.x + validCrop.data.width / 2, y: validCrop.data.y + validCrop.data.height / 2 } : { x: 50, y: 50 })}>Đặt điểm tại tâm ảnh người mẫu</button>}
  </fieldset>;
}

