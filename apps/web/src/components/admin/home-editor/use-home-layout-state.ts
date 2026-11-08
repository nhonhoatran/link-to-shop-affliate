'use client';

import { useMemo, useReducer, type Dispatch } from 'react';
import {
  HOME_SECTION_DEFAULTS,
  type AdminHomeLayoutDto,
  type HomePreviousInfo,
  type HomeSection,
  type HomeSectionType,
} from '@under30ss/shared';
import { newItemId } from '@/hooks/admin/editor-state';
import { applyPatch, type FieldValues } from './field-values';
import { moveById } from './move-section';

export interface HomeLayoutState {
  content: HomeSection[];
  /** JSON of the content last stored as the draft; `dirty` compares against it. */
  savedJson: string;
  selectedId: string | null;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  previous: HomePreviousInfo;
  hasUnpublishedChanges: boolean;
  usingDefault: boolean;
}

export type HomeLayoutAction =
  | { type: 'load'; dto: AdminHomeLayoutDto }
  | { type: 'saved'; dto: AdminHomeLayoutDto; content: HomeSection[] }
  | { type: 'published'; publishedAt: string; previous: HomePreviousInfo }
  | { type: 'restored'; publishedAt: string | null; previous: HomePreviousInfo }
  | { type: 'noPrevious' }
  | { type: 'select'; id: string | null }
  | { type: 'add'; section: HomeSection }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; to: number }
  | { type: 'toggle'; id: string }
  | { type: 'update'; id: string; patch: FieldValues };

const meta = (dto: AdminHomeLayoutDto) => ({
  draftUpdatedAt: dto.draftUpdatedAt,
  publishedAt: dto.publishedAt,
  previous: dto.previous,
  hasUnpublishedChanges: dto.hasUnpublishedChanges,
  usingDefault: dto.usingDefault,
});

export const initialHomeState = (dto: AdminHomeLayoutDto): HomeLayoutState => ({
  ...meta(dto),
  content: dto.draft,
  savedJson: JSON.stringify(dto.draft),
  selectedId: null,
});

/** A new block of `type`, filled from the shared defaults (content fields start empty and fail validation until filled). */
export const createSection = (type: HomeSectionType): HomeSection =>
  // The defaults table is keyed by type, so the pair is always a valid section shape; TypeScript cannot correlate them.
  ({ type, props: { id: newItemId(), ...structuredClone(HOME_SECTION_DEFAULTS[type]) } }) as HomeSection;

const mapSection = (content: HomeSection[], id: string, change: (section: HomeSection) => HomeSection) =>
  content.map((section) => (section.props.id === id ? change(section) : section));

export function homeLayoutReducer(state: HomeLayoutState, action: HomeLayoutAction): HomeLayoutState {
  switch (action.type) {
    case 'load':
      return initialHomeState(action.dto);
    case 'saved':
      return { ...state, ...meta(action.dto), savedJson: JSON.stringify(action.content) };
    case 'published':
      return {
        ...state,
        publishedAt: action.publishedAt,
        previous: action.previous,
        hasUnpublishedChanges: false,
        usingDefault: false,
      };
    case 'restored':
      // The API leaves the draft alone and does not say how it compares to the restored layout, so assume it differs.
      return {
        ...state,
        publishedAt: action.publishedAt,
        previous: action.previous,
        hasUnpublishedChanges: true,
        usingDefault: action.publishedAt === null,
      };
    case 'noPrevious':
      return { ...state, previous: null };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'add': {
      const at = state.content.findIndex((section) => section.props.id === state.selectedId);
      const index = at === -1 ? state.content.length : at + 1;
      const content = [...state.content.slice(0, index), action.section, ...state.content.slice(index)];
      return { ...state, content, selectedId: action.section.props.id };
    }
    case 'remove':
      return {
        ...state,
        content: state.content.filter((section) => section.props.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case 'move': {
      const content = moveById(state.content, action.id, action.to);
      return content === state.content ? state : { ...state, content };
    }
    case 'toggle':
      return {
        ...state,
        content: mapSection(
          state.content,
          action.id,
          (section) => ({ ...section, props: { ...section.props, visible: !section.props.visible } }) as HomeSection,
        ),
      };
    case 'update':
      return {
        ...state,
        content: mapSection(
          state.content,
          action.id,
          // A patch only touches keys the form knows for this type; the API validates the final shape again.
          (section) => ({ ...section, props: applyPatch(section.props, action.patch) }) as HomeSection,
        ),
      };
  }
}

export function useHomeLayoutState(initial: AdminHomeLayoutDto): {
  state: HomeLayoutState;
  dispatch: Dispatch<HomeLayoutAction>;
  dirty: boolean;
} {
  const [state, dispatch] = useReducer(homeLayoutReducer, initial, initialHomeState);
  const dirty = useMemo(() => JSON.stringify(state.content) !== state.savedJson, [state.content, state.savedJson]);
  return { state, dispatch, dirty };
}
