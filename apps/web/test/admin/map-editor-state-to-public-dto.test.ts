import { publicOutfitSchema } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { mapEditorStateToPublicDto } from '@/components/admin/map-editor-state-to-public-dto';
import { editorReducer, fromAdminOutfit } from '@/hooks/admin/editor-state';
import { makeAdminOutfit } from './admin-outfit-fixture';

describe('mapEditorStateToPublicDto', () => {
  it('produces a DTO the public schema accepts, with urls and sorted items', () => {
    const state = fromAdminOutfit(makeAdminOutfit());
    const dto = mapEditorStateToPublicDto(state);
    expect(publicOutfitSchema.safeParse(dto).success).toBe(true);
    expect(dto.modelImage.url).toBe(state.modelImage.url);
    expect(dto.items.map((item) => item.id)).toEqual(['tee', 'shorts', 'sneakers', 'bag', 'necklace', 'belt']);
    expect(dto.items.find((item) => item.id === 'bag')?.image.url).toBe(state.items[3]!.image.url);
  });

  it('drops items without an anchor, like the live page does', () => {
    const state = fromAdminOutfit(
      makeAdminOutfit((outfit) => {
        delete outfit.items[0]!.anchor;
      }),
    );
    expect(mapEditorStateToPublicDto(state).items.map((item) => item.id)).not.toContain('tee');
  });

  it('follows edits: new anchor shows up, moved item changes side and order', () => {
    let state = fromAdminOutfit(makeAdminOutfit());
    state = editorReducer(state, { type: 'setAnchor', id: 'tee', anchor: { x: 10.5, y: 20 } });
    state = editorReducer(state, { type: 'moveItem', id: 'tee', side: 'right', index: 0 });
    const dto = mapEditorStateToPublicDto(state);
    const tee = dto.items.find((item) => item.id === 'tee')!;
    expect(tee.anchor).toEqual({ x: 10.5, y: 20 });
    expect(tee.side).toBe('right');
    expect(tee.order).toBe(0);
    expect(dto.items.filter((item) => item.side === 'right').map((item) => item.id)).toEqual([
      'tee',
      'bag',
      'necklace',
      'belt',
    ]);
  });
});
