import { percentPointSchema, percentRectSchema, sourcePointToModel, type PercentPoint, type PercentRect } from '@under30ss/shared';

export interface PreviewSource { url: string; width: number; height: number }

export function CropPreview({ source, crop, label, anchors = [] }: {
  source: PreviewSource; crop: PercentRect | null; label: string;
  anchors?: { id: string; label: string; point: PercentPoint | null }[];
}) {
  const valid = percentRectSchema.safeParse(crop);
  if (!valid.success) return <div className="preview-empty" role="img" aria-label={`${label}: chưa có vùng hợp lệ`}>Chưa có vùng ảnh hợp lệ</div>;
  const box = valid.data;
  return <figure className="crop-preview">
    <div className="crop-canvas" style={{ aspectRatio: (source.width * box.width) / (source.height * box.height) }}>
      <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} role="img" aria-label={label} preserveAspectRatio="none">
        <image href={source.url} x={0} y={0} width={100} height={100} preserveAspectRatio="none" />
      </svg>
      {anchors.map((anchor) => {
        if (!percentPointSchema.safeParse(anchor.point).success || !anchor.point) return null;
        const point = sourcePointToModel(anchor.point, box);
        return point ? <span key={anchor.id} className="anchor-pin" role="img" aria-label={`Điểm nối ${anchor.label}`}
          title={anchor.label} style={{ left: `${point.x}%`, top: `${point.y}%` }} /> : null;
      })}
    </div>
    <figcaption>{label}</figcaption>
  </figure>;
}

export function SourcePreview({ source, label, crop }: { source: PreviewSource; label: string; crop?: PercentRect | null }) {
  const box = percentRectSchema.safeParse(crop);
  return <figure className="source-preview"><div className="source-canvas" style={{ aspectRatio: source.width / source.height }}>
    <img src={source.url} alt={label} width={source.width} height={source.height} />
    {box.success ? <span className="crop-outline" aria-hidden="true" style={{ left: `${box.data.x}%`, top: `${box.data.y}%`,
      width: `${box.data.width}%`, height: `${box.data.height}%` }} /> : null}
  </div><figcaption>{label}</figcaption></figure>;
}

