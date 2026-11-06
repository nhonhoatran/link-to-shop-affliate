import { toPublicOutfitDto, type Outfit, type PublicOutfitDto } from '@under30ss/shared';
import { toOutfitInput, type EditorState } from '@/hooks/admin/editor-state';

/**
 * Editor state -> the DTO the public page renders. Goes through the shared
 * toPublicOutfitDto, so items without an anchor are dropped exactly like on the live page.
 */
export const mapEditorStateToPublicDto = (state: EditorState): PublicOutfitDto => {
  const urlByKey = new Map<string, string>([[state.modelImage.key, state.modelImage.url]]);
  for (const item of state.items) urlByKey.set(item.image.key, item.image.url);
  const now = new Date().toISOString();
  const outfit: Outfit = { ...toOutfitInput(state), id: state.id, createdAt: now, updatedAt: now };
  return toPublicOutfitDto(outfit, (key) => urlByKey.get(key) ?? '');
};
