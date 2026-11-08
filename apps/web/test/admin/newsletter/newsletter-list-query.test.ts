import { describe, expect, it } from 'vitest';
import {
  buildNewsletterExportHref,
  buildNewsletterListHref,
  parseNewsletterListQuery,
} from '@/components/admin/newsletter/newsletter-list-query';

describe('parseNewsletterListQuery', () => {
  it('trims q, accepts a known status and a positive page', () => {
    expect(parseNewsletterListQuery({ q: '  abc ', status: 'unsubscribed', page: '2' })).toEqual({
      q: 'abc',
      status: 'unsubscribed',
      page: 2,
    });
  });

  it('falls back to defaults for bad values and takes the first of repeated params', () => {
    expect(parseNewsletterListQuery({ status: 'weird', page: '-3' })).toEqual({ q: '', status: undefined, page: 1 });
    expect(parseNewsletterListQuery({ q: ['x', 'y'], status: ['subscribed', 'unsubscribed'] })).toMatchObject({
      q: 'x',
      status: 'subscribed',
    });
  });
});

describe('newsletter hrefs', () => {
  const query = { q: 'a b', status: 'subscribed' as const, page: 3 };

  it('keeps filters in page links and omits page 1', () => {
    expect(buildNewsletterListHref(query, 2)).toBe('/admin/newsletter?q=a+b&status=subscribed&page=2');
    expect(buildNewsletterListHref(query, 1)).toBe('/admin/newsletter?q=a+b&status=subscribed');
    expect(buildNewsletterListHref({ q: '', status: undefined, page: 1 }, 1)).toBe('/admin/newsletter');
  });

  it('builds the export link from the filters without a page', () => {
    expect(buildNewsletterExportHref(query)).toBe('/api/admin/newsletter/export?q=a+b&status=subscribed');
    expect(buildNewsletterExportHref({ q: '', status: undefined, page: 1 })).toBe('/api/admin/newsletter/export');
  });
});
