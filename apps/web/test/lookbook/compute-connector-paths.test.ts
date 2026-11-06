import { describe, expect, it } from 'vitest';
import { computeConnectorPath, computeConnectorPaths, type ConnectorInput } from '@/components/lookbook/compute-connector-paths';

const image = { left: 0, top: 100, right: 100, bottom: 200 };

const left: ConnectorInput = { id: 'a', side: 'left', image, end: { x: 300, y: 50 } };
const right: ConnectorInput = {
  id: 'b',
  side: 'right',
  image: { left: 500, top: 100, right: 600, bottom: 200 },
  end: { x: 300, y: 400 },
};

describe('computeConnectorPath', () => {
  it('leaves the inner (right) edge of a left item horizontally and ends at the anchor', () => {
    expect(computeConnectorPath(left, 0.5).d).toBe('M 100 150 C 200 150 200 100 300 50');
  });

  it('leaves the inner (left) edge of a right item horizontally', () => {
    expect(computeConnectorPath(right, 0.5).d).toBe('M 500 150 C 400 150 400 275 300 400');
  });

  it('curves down when the anchor is lower than the item', () => {
    const { d } = computeConnectorPath({ ...left, end: { x: 300, y: 500 } }, 0.5);
    expect(d).toBe('M 100 150 C 200 150 200 325 300 500');
  });

  it('curves up when the anchor is higher than the item', () => {
    const { d } = computeConnectorPath(left, 0.25);
    expect(d).toBe('M 100 150 C 150 150 250 75 300 50');
  });

  it('is a straight line when the ratio is 0', () => {
    expect(computeConnectorPath(left, 0).d).toBe('M 100 150 C 100 150 300 50 300 50');
  });

  it('keeps the first handle on the start y so the thread leaves horizontally', () => {
    const nums = computeConnectorPath(right, 0.4).d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[3]).toBe(nums[1]);
  });

  it('keeps the id of its input', () => {
    expect(computeConnectorPath(left, 0.35).id).toBe('a');
  });
});

describe('computeConnectorPaths', () => {
  it('maps every input and falls back to ratio 0 for a non-finite ratio', () => {
    const paths = computeConnectorPaths([left, right], Number.NaN);
    expect(paths.map((p) => p.id)).toEqual(['a', 'b']);
    expect(paths[0]?.d).toBe('M 100 150 C 100 150 300 50 300 50');
  });

  it('returns an empty list for no input', () => {
    expect(computeConnectorPaths([], 0.35)).toEqual([]);
  });
});
