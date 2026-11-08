import { describe, expect, it } from 'vitest';
import { moveById, moveItem } from '@/components/admin/home-editor/move-section';

const items = ['a', 'b', 'c', 'd'];

describe('moveItem', () => {
  it('moves forward and backward', () => {
    expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(items, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps the target and never mutates the input', () => {
    expect(moveItem(items, 1, 99)).toEqual(['a', 'c', 'd', 'b']);
    expect(moveItem(items, 2, -5)).toEqual(['c', 'a', 'b', 'd']);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the same array when nothing moves or the index is unknown', () => {
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, -1, 2)).toBe(items);
    expect(moveItem(items, 9, 2)).toBe(items);
  });
});

describe('moveById', () => {
  const sections = ['x', 'y', 'z'].map((id) => ({ props: { id } }));

  it('moves the section with that id', () => {
    expect(moveById(sections, 'z', 0).map((s) => s.props.id)).toEqual(['z', 'x', 'y']);
  });

  it('ignores an unknown id', () => {
    expect(moveById(sections, 'nope', 0)).toBe(sections);
  });
});
