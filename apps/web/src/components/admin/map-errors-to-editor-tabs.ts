import type { FieldErrors } from './validation-messages';

export type EditorTabId = 'info' | 'items' | 'preview';

export const EDITOR_TAB_ORDER: readonly EditorTabId[] = ['info', 'items', 'preview'];

/** Item errors carry the key `items.<i>.<field>`; everything else lives on the details form. */
export const tabOfErrorKey = (key: string): EditorTabId => (key === 'items' || key.startsWith('items.') ? 'items' : 'info');

export const mapErrorsToEditorTabs = (errors: FieldErrors): Set<EditorTabId> =>
  new Set(Object.keys(errors).map(tabOfErrorKey));

export const firstTabWithError = (errorTabs: ReadonlySet<EditorTabId>): EditorTabId | null =>
  EDITOR_TAB_ORDER.find((id) => errorTabs.has(id)) ?? null;
