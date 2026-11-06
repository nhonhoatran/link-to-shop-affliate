import type { AdminOutfitDto, Anchor, ImageWithUrl, OutfitInput, OutfitItem, OutfitStatus } from '@under30ss/shared';

export type Side = OutfitItem['side'];

export interface EditorItem {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  image: ImageWithUrl;
  side: Side;
  order: number;
  anchor: Anchor | undefined;
  affiliateUrl: string;
}

export interface EditorState {
  id: string;
  slug: string;
  title: string;
  seoDescription: string;
  modelImage: ImageWithUrl;
  status: OutfitStatus;
  featured: boolean;
  items: EditorItem[];
  selectedId: string | null;
  /** Snapshot of the last saved content (see snapshotOf), compared to detect unsaved changes. */
  saved: string;
}

export type ItemPatch = Partial<Pick<EditorItem, 'name' | 'subtitle' | 'description' | 'affiliateUrl' | 'image'>>;

export type EditorAction =
  | { type: 'field'; field: 'title' | 'slug' | 'seoDescription'; value: string }
  | { type: 'modelImage'; image: ImageWithUrl }
  | { type: 'addItem'; id: string; image: ImageWithUrl }
  | { type: 'updateItem'; id: string; patch: ItemPatch }
  | { type: 'setAnchor'; id: string; anchor: Anchor }
  | { type: 'removeItem'; id: string }
  | { type: 'moveItem'; id: string; side: Side; index: number }
  | { type: 'select'; id: string | null }
  | { type: 'featured'; value: boolean }
  | { type: 'saved'; status: OutfitStatus; snapshot: string };

export const newItemId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const imageRef = ({ key, width, height }: ImageWithUrl) => ({ key, width, height });

export const itemsOnSide = (items: readonly EditorItem[], side: Side): EditorItem[] =>
  items.filter((item) => item.side === side).sort((a, b) => a.order - b.order);

/**
 * `featured` is always false here: the API ignores it on update (only the /featured endpoint changes it),
 * and the shared input schema still requires the field.
 */
export const toOutfitInput = (state: EditorState, status: OutfitStatus = state.status): OutfitInput => ({
  slug: state.slug,
  title: state.title,
  ...(state.seoDescription ? { seoDescription: state.seoDescription } : {}),
  modelImage: imageRef(state.modelImage),
  status,
  featured: false,
  items: state.items.map((item) => ({
    id: item.id,
    name: item.name,
    ...(item.subtitle ? { subtitle: item.subtitle } : {}),
    ...(item.description ? { description: item.description } : {}),
    image: imageRef(item.image),
    side: item.side,
    order: item.order,
    ...(item.anchor ? { anchor: item.anchor } : {}),
    affiliateUrl: item.affiliateUrl,
  })),
});

/** Featured is saved through its own endpoint, so it is not part of the snapshot and never makes the editor dirty. */
export const snapshotOf = (state: EditorState, status: OutfitStatus = state.status): string =>
  JSON.stringify(toOutfitInput(state, status));

export const isDirty = (state: EditorState): boolean => snapshotOf(state) !== state.saved;

export const fromAdminOutfit = (dto: AdminOutfitDto): EditorState => {
  const state: EditorState = {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    seoDescription: dto.seoDescription ?? '',
    modelImage: dto.modelImage,
    status: dto.status,
    featured: dto.featured,
    items: dto.items.map((item) => ({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle ?? '',
      description: item.description ?? '',
      image: item.image,
      side: item.side,
      order: item.order,
      anchor: item.anchor,
      affiliateUrl: item.affiliateUrl,
    })),
    selectedId: null,
    saved: '',
  };
  return { ...state, saved: snapshotOf(state) };
};

const renumber = (items: EditorItem[]): EditorItem[] => {
  const orderOf = new Map<string, number>();
  for (const side of ['left', 'right'] as const) {
    itemsOnSide(items, side).forEach((item, index) => orderOf.set(item.id, index));
  }
  return items.map((item) => ({ ...item, order: orderOf.get(item.id) ?? item.order }));
};

const mapItem = (items: EditorItem[], id: string, change: (item: EditorItem) => EditorItem): EditorItem[] =>
  items.map((item) => (item.id === id ? change(item) : item));

const moveItem = (items: EditorItem[], id: string, side: Side, index: number): EditorItem[] => {
  const moving = items.find((item) => item.id === id);
  if (!moving) return items;
  const target = itemsOnSide(items, side).filter((item) => item.id !== id);
  target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...moving, side });
  const placed = target.map((item, position) => ({ ...item, order: position }));
  const placedIds = new Set(placed.map((item) => item.id));
  return renumber([...items.filter((item) => !placedIds.has(item.id)), ...placed]);
};

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'modelImage':
      return { ...state, modelImage: action.image };
    case 'addItem': {
      const side: Side = itemsOnSide(state.items, 'left').length <= itemsOnSide(state.items, 'right').length ? 'left' : 'right';
      const item: EditorItem = {
        id: action.id,
        name: `Món ${state.items.length + 1}`,
        subtitle: '',
        description: '',
        image: action.image,
        side,
        order: itemsOnSide(state.items, side).length,
        anchor: undefined,
        affiliateUrl: '',
      };
      return { ...state, items: [...state.items, item], selectedId: item.id };
    }
    case 'updateItem':
      return { ...state, items: mapItem(state.items, action.id, (item) => ({ ...item, ...action.patch })) };
    case 'setAnchor':
      return { ...state, items: mapItem(state.items, action.id, (item) => ({ ...item, anchor: action.anchor })) };
    case 'removeItem':
      return {
        ...state,
        items: renumber(state.items.filter((item) => item.id !== action.id)),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case 'moveItem':
      return { ...state, items: moveItem(state.items, action.id, action.side, action.index) };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'featured':
      return { ...state, featured: action.value };
    case 'saved':
      return { ...state, status: action.status, saved: action.snapshot };
  }
};
