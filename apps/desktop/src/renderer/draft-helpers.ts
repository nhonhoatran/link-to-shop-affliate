import { slugifyVietnamese, type DesktopDraft, type DesktopDraftItem, type DesktopFile } from '@under30ss/shared';

export const manualDraft = (file: DesktopFile): DesktopDraft => {
  const title = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
  return { title, slug: slugifyVietnamese(title), seoDescription: '', modelCrop: null,
    collection: { name: title.slice(0, 80), slug: slugifyVietnamese(title), description: '' }, items: [], reviewReasons: [] };
};

export const newDraftItem = (items: DesktopDraftItem[]): DesktopDraftItem => ({
  id: crypto.randomUUID(), name: '', subtitle: '', description: '', affiliateUrl: '', side: 'left',
  order: items.filter((item) => item.side === 'left').length, crop: null, sourceAnchor: null, reviewReasons: [],
});

export const normalizeOrders = (items: DesktopDraftItem[]): DesktopDraftItem[] => {
  const orderById = new Map<string, number>();
  for (const side of ['left', 'right'] as const) items.filter((item) => item.side === side).sort((a, b) => a.order - b.order)
    .forEach((item, index) => orderById.set(item.id, index));
  return items.map((item) => ({ ...item, order: orderById.get(item.id) ?? item.order }));
};

export const patchDraftItem = (items: DesktopDraftItem[], id: string, patch: Partial<DesktopDraftItem>): DesktopDraftItem[] => {
  const source = items.find((item) => item.id === id);
  if (!source) return items;
  const changed = { ...source, ...patch };
  if (patch.order === undefined && patch.side === undefined) return items.map((item) => item.id === id ? changed : item);
  const target = items.filter((item) => item.id !== id && item.side === changed.side).sort((a, b) => a.order - b.order);
  target.splice(Math.max(0, Math.min(changed.order, target.length)), 0, changed);
  const targetIds = new Set(target.map((item) => item.id));
  return normalizeOrders([...items.filter((item) => !targetIds.has(item.id)), ...target.map((item, order) => ({ ...item, order }))]);
};

export const draftIssueLabel = (path: PropertyKey[], message: string): string => {
  const labels: Record<string, string> = { title: 'Tiêu đề outfit', slug: 'Slug', seoDescription: 'Mô tả SEO', collection: 'Bộ sưu tập',
    name: 'Tên', description: 'Mô tả', items: 'Món', modelCrop: 'Vùng người mẫu', crop: 'Vùng ảnh', sourceAnchor: 'Điểm nối',
    affiliateUrl: 'Link mua hàng', width: 'Chiều rộng', height: 'Chiều cao', x: 'Tọa độ X', y: 'Tọa độ Y', order: 'Thứ tự', side: 'Cột' };
  return `${path.map((part) => typeof part === 'number' ? part + 1 : labels[String(part)] ?? String(part)).join(' → ')}: ${message}`;
};

