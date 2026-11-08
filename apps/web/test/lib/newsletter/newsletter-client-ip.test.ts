import { describe, expect, it } from 'vitest';
import { pickClientIp } from '@/lib/newsletter/newsletter-client-ip';

describe('pickClientIp', () => {
  it('takes the last entry of a chain', () => {
    expect(pickClientIp('9.9.9.9, 10.0.0.1 ,203.0.113.7')).toBe('203.0.113.7');
  });
  it('returns a single address as is', () => {
    expect(pickClientIp('203.0.113.7')).toBe('203.0.113.7');
  });
  it.each([null, undefined, '', ' , '])('returns undefined for %j', (value) => {
    expect(pickClientIp(value)).toBeUndefined();
  });
});
