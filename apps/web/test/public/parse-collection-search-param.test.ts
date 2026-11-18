import { describe, expect, it } from 'vitest';
import { MAX_COLLECTION_SEARCH_LENGTH } from '@under30ss/shared';
import { parseCollectionSearchParam } from '@/components/public/parse-collection-search-param';

describe('parseCollectionSearchParam', () => {
  it('trims one keyword and ignores repeated or missing values', () => {
    expect(parseCollectionSearchParam('  mùa hè  ')).toBe('mùa hè');
    expect(parseCollectionSearchParam(['summer', 'winter'])).toBe('');
    expect(parseCollectionSearchParam(undefined)).toBe('');
  });

  it('bounds manually entered URLs to the API limit', () => {
    expect(parseCollectionSearchParam('x'.repeat(MAX_COLLECTION_SEARCH_LENGTH + 1))).toHaveLength(MAX_COLLECTION_SEARCH_LENGTH);
  });
});
