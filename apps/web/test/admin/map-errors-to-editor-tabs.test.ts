import { describe, expect, it } from 'vitest';
import { mapErrorsToEditorTabs, tabOfErrorKey } from '@/components/admin/map-errors-to-editor-tabs';

describe('collection errors', () => {
  it.each(['collectionIds', 'collectionIds.1'])('maps %s to the info tab', (key) => {
    expect(tabOfErrorKey(key)).toBe('info');
    expect([...mapErrorsToEditorTabs({ [key]: 'x' })]).toEqual(['info']);
  });
});
