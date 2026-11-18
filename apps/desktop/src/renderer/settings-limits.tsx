import type { DesktopSettings } from '@under30ss/shared';
import { TextField } from './form-fields';

type Limits = DesktopSettings['limits'];
const extensions: Limits['allowedExtensions'] = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];

export function SettingsLimits({ value, onChange }: { value: Limits; onChange: (value: Limits) => void }) {
  const number = (key: Exclude<keyof Limits, 'allowedExtensions'>, label: string, scale = 1) =>
    <TextField key={key} label={label} value={value[key] / scale} type="number" min={0} step="any"
      onChange={(input) => onChange({ ...value, [key]: Number(input) * scale })} />;
  return <details className="advanced">
    <summary>Giới hạn xử lý và phân trang</summary>
    <div className="field-grid">
      {number('maxFiles', 'Số ảnh tối đa mỗi phiên')}
      {number('maxFileBytes', 'Dung lượng mỗi ảnh (MB)', 1024 * 1024)}
      {number('maxSourcePixels', 'Số pixel tối đa mỗi ảnh')}
      {number('maxScanEntries', 'Số mục tối đa khi quét folder')}
      {number('pageSize', 'Số mục mỗi trang')}
      {number('analysisTimeoutMs', 'Thời gian chờ Codex (giây)', 1000)}
      {number('syncTimeoutMs', 'Thời gian chờ website (giây)', 1000)}
      {number('maxOutputBytes', 'Dung lượng JSON Codex tối đa (byte)')}
    </div>
    <fieldset className="extension-options">
      <legend>Định dạng cho phép</legend>
      {extensions.map((extension) => <label key={extension} className="check-label">
        <input type="checkbox" checked={value.allowedExtensions.includes(extension)} onChange={(event) => onChange({
          ...value, allowedExtensions: event.target.checked ? [...value.allowedExtensions, extension]
            : value.allowedExtensions.filter((entry) => entry !== extension),
        })} />{extension}
      </label>)}
    </fieldset>
    <p className="hint">Giới hạn được lưu trong cấu hình local. Ảnh gốc không bị chỉnh sửa.</p>
  </details>;
}

