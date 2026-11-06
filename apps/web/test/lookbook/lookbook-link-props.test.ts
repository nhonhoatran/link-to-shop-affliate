import { describe, expect, it } from 'vitest';
import { affiliateLinkProps, AFFILIATE_REL } from '@/components/lookbook/lookbook-link-props';

describe('affiliateLinkProps', () => {
  it('builds a safe external link for an https URL', () => {
    expect(affiliateLinkProps(' https://shop.example.com/a?x=1 ')).toEqual({
      href: 'https://shop.example.com/a?x=1',
      target: '_blank',
      rel: AFFILIATE_REL,
    });
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['http', 'http://shop.example.com/a'],
    ['javascript:', 'javascript:alert(1)'],
    ['relative', '/a/b'],
    ['not a URL', 'shop.example.com'],
  ])('renders %s as a disabled link', (_name, value) => {
    expect(affiliateLinkProps(value)).toEqual({ href: '#', 'aria-disabled': true });
  });
});
