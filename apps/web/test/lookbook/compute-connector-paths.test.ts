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
  it('starts at the inner (right) edge of a left item image and ends at the hotspot', () => {
    expect(computeConnectorPath(left, 0.5).d).toBe('M 100 150 Q 200 -50 300 50');
  });

  it('starts at the inner (left) edge of a right item image', () => {
    expect(computeConnectorPath(right, 0.5).d).toBe('M 500 150 Q 400 50 300 400');
  });

  it('bows above the higher of the two endpoints when the hotspot is lower than the image', () => {
    const { d } = computeConnectorPath({ ...left, end: { x: 300, y: 500 } }, 0.5);
    expect(d).toBe('M 100 150 Q 200 50 300 500');
  });

  it('is a straight-ish line when the ratio is 0', () => {
    expect(computeConnectorPath(left, 0).d).toBe('M 100 150 Q 200 50 300 50');
  });

  it('keeps the id of its input', () => {
    expect(computeConnectorPath(left, 0.35).id).toBe('a');
  });
});

describe('computeConnectorPaths', () => {
  it('maps every input and falls back to ratio 0 for a non-finite ratio', () => {
    const paths = computeConnectorPaths([left, right], Number.NaN);
    expect(paths.map((p) => p.id)).toEqual(['a', 'b']);
    expect(paths[0]?.d).toBe('M 100 150 Q 200 50 300 50');
  });

  it('returns an empty list for no input', () => {
    expect(computeConnectorPaths([], 0.35)).toEqual([]);
  });
});
