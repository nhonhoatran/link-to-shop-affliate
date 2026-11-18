import { affiliateUrlSchema, type DesktopDraftItem, type PercentRect } from '@under30ss/shared';
import { AnchorFields } from './anchor-fields';
import { CropFields } from './crop-fields';
import { CropPreview, type PreviewSource } from './crop-preview';
import { TextAreaField, TextField } from './form-fields';

export function DraftItemEditor({ item, source, modelCrop, onChange, onRemove }: {
  item: DesktopDraftItem; source: PreviewSource; modelCrop: PercentRect | null;
  onChange: (patch: Partial<DesktopDraftItem>) => void; onRemove: () => void;
}) {
  const validLink = affiliateUrlSchema.safeParse(item.affiliateUrl);
  return <section className="draft-item-editor" aria-label="Chỉnh món đang chọn">
    <div className="item-editor-heading"><h3>{item.name || 'Món chưa có tên'}</h3><button type="button" className="danger-text" onClick={onRemove}>Xóa món</button></div>
    <div className="item-edit-grid"><CropPreview source={source} crop={item.crop} label="Ảnh món đã crop" />
      <div><TextField label="Tên món" value={item.name} onChange={(name) => onChange({ name })} maxLength={80} />
        <TextField label="Phụ đề món" value={item.subtitle} onChange={(subtitle) => onChange({ subtitle })} maxLength={80} />
        <TextAreaField label="Mô tả món" value={item.description} onChange={(description) => onChange({ description })} maxLength={240} /></div>
    </div>
    <TextField label="Link mua hàng" value={item.affiliateUrl} onChange={(affiliateUrl) => onChange({ affiliateUrl })} maxLength={2048}
      hint="Có thể để trống khi nhập nháp; liên kết phải dùng HTTPS." error={!validLink.success ? 'Liên kết phải là URL HTTPS hợp lệ hoặc để trống.' : undefined} />
    <div className="field-grid"><label className="field"><span>Cột sản phẩm</span><select value={item.side}
      onChange={(event) => onChange({ side: event.target.value as 'left' | 'right' })}><option value="left">Bên trái</option><option value="right">Bên phải</option></select></label>
      <TextField label="Thứ tự trong cột (từ 1)" value={item.order + 1} type="number" min={1} step={1}
        onChange={(value) => onChange({ order: Math.max(0, Math.trunc(Number(value)) - 1) })} />
    </div>
    <CropFields label="Vùng ảnh món trên poster" value={item.crop} onChange={(crop) => onChange({ crop })} />
    <AnchorFields value={item.sourceAnchor} modelCrop={modelCrop} onChange={(sourceAnchor) => onChange({ sourceAnchor })} />
    {item.reviewReasons.length ? <div className="notice warning"><strong>AI yêu cầu kiểm tra món này</strong><ul>{item.reviewReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div> : null}
  </section>;
}
