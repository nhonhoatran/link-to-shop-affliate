import { describe, expect, it } from 'vitest';
import { editorReducer, fromAdminOutfit, isDirty, itemsOnSide, snapshotOf, toOutfitInput } from '@/hooks/admin/editor-state';
import { makeAdminOutfit } from './admin-outfit-fixture';

describe('editor state', () => {
  it('starts clean and becomes dirty after an edit', () => {
    const state = fromAdminOutfit(makeAdminOutfit());
    expect(isDirty(state)).toBe(false);
    expect(isDirty(editorReducer(state, { type: 'field', field: 'title', value: 'Other' }))).toBe(true);
  });

  it('does not count featured as an unsaved change', () => {
    const state = editorReducer(fromAdminOutfit(makeAdminOutfit()), { type: 'featured', value: true });
    expect(isDirty(state)).toBe(false);
  });

  it('is clean again after saved with the snapshot of what was sent', () => {
    let state = editorReducer(fromAdminOutfit(makeAdminOutfit()), { type: 'field', field: 'title', value: 'New' });
    state = editorReducer(state, { type: 'saved', status: 'published', snapshot: snapshotOf(state, 'published') });
    expect(isDirty(state)).toBe(false);
    expect(state.status).toBe('published');
  });

  it('reorders within a side and renumbers 0..n-1', () => {
    const state = editorReducer(fromAdminOutfit(makeAdminOutfit()), { type: 'moveItem', id: 'sneakers', side: 'left', index: 0 });
    expect(itemsOnSide(state.items, 'left').map((i) => [i.id, i.order])).toEqual([
      ['sneakers', 0],
      ['tee', 1],
      ['shorts', 2],
    ]);
  });

  it('moves across sides and closes the gap on the source side', () => {
    const state = editorReducer(fromAdminOutfit(makeAdminOutfit()), { type: 'moveItem', id: 'tee', side: 'right', index: 99 });
    expect(itemsOnSide(state.items, 'left').map((i) => [i.id, i.order])).toEqual([
      ['shorts', 0],
      ['sneakers', 1],
    ]);
    expect(itemsOnSide(state.items, 'right').map((i) => i.id)).toEqual(['bag', 'necklace', 'belt', 'tee']);
  });

  it('adds an item to the shorter side, selected, without an anchor', () => {
    let state = editorReducer(fromAdminOutfit(makeAdminOutfit()), { type: 'removeItem', id: 'belt' });
    state = editorReducer(state, {
      type: 'addItem',
      id: 'new',
      image: { key: 'public/items/x.webp', url: '/media/public/items/x.webp', width: 10, height: 10 },
    });
    const added = state.items.find((i) => i.id === 'new')!;
    expect(added.side).toBe('right');
    expect(added.order).toBe(2);
    expect(added.anchor).toBeUndefined();
    expect(state.selectedId).toBe('new');
  });

  it('serialises to an OutfitInput without urls and empty optional text', () => {
    const input = toOutfitInput(fromAdminOutfit(makeAdminOutfit()));
    expect(input.modelImage).not.toHaveProperty('url');
    expect(input.items[0]!.image).not.toHaveProperty('url');
    const cleared = editorReducer(fromAdminOutfit(makeAdminOutfit()), {
      type: 'updateItem',
      id: 'tee',
      patch: { subtitle: '' },
    });
    expect(toOutfitInput(cleared).items[0]).not.toHaveProperty('subtitle');
  });

  describe('collection memberships', () => {
    const withCollections = (ids: string[]) =>
      fromAdminOutfit(makeAdminOutfit((outfit) => (outfit.collectionIds = ids)));

    it('loads the memberships and starts clean', () => {
      const state = withCollections(['c1', 'c2']);
      expect(state.collectionIds).toEqual(['c1', 'c2']);
      expect(isDirty(state)).toBe(false);
      expect(fromAdminOutfit(makeAdminOutfit()).collectionIds).toEqual([]);
    });

    it('leaves collectionIds out of the input until they change, so a stale editor cannot overwrite them', () => {
      const state = withCollections(['c1']);
      expect(toOutfitInput(state)).not.toHaveProperty('collectionIds');
      const changed = editorReducer(state, { type: 'collections', ids: ['c1', 'c2'] });
      expect(toOutfitInput(changed).collectionIds).toEqual(['c1', 'c2']);
    });

    it('sends an empty list when every membership was removed', () => {
      const cleared = editorReducer(withCollections(['c1']), { type: 'collections', ids: [] });
      expect(toOutfitInput(cleared).collectionIds).toEqual([]);
    });

    it('treats a reorder of the same ids as no change', () => {
      const state = editorReducer(withCollections(['c1', 'c2']), { type: 'collections', ids: ['c2', 'c1'] });
      expect(isDirty(state)).toBe(false);
      expect(toOutfitInput(state)).not.toHaveProperty('collectionIds');
    });

    it('becomes dirty on a change and clean again after saved', () => {
      let state = editorReducer(withCollections([]), { type: 'collections', ids: ['c1'] });
      expect(isDirty(state)).toBe(true);
      state = editorReducer(state, { type: 'saved', status: state.status, snapshot: snapshotOf(state) });
      expect(isDirty(state)).toBe(false);
      expect(toOutfitInput(state)).not.toHaveProperty('collectionIds');
    });

    it('keeps a change made while the save was in flight unsaved and still sendable', () => {
      const sent = editorReducer(withCollections([]), { type: 'collections', ids: ['c1'] });
      const snapshot = snapshotOf(sent);
      const later = editorReducer(sent, { type: 'collections', ids: ['c1', 'c2'] });
      const state = editorReducer(later, { type: 'saved', status: later.status, snapshot });
      expect(isDirty(state)).toBe(true);
      expect(toOutfitInput(state).collectionIds).toEqual(['c1', 'c2']);
    });
  });
});
