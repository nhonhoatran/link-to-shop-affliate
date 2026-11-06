'use client';

import { useReducer } from 'react';
import type { AdminOutfitDto } from '@under30ss/shared';
import { editorReducer, fromAdminOutfit, isDirty } from './editor-state';

export function useOutfitEditorState(initial: AdminOutfitDto) {
  const [state, dispatch] = useReducer(editorReducer, initial, fromAdminOutfit);
  return { state, dispatch, dirty: isDirty(state) };
}
