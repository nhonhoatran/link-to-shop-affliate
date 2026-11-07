import { render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useElementHeightVar } from '@/hooks/admin/use-element-height-var';

function Harness({ withTarget }: { withTarget: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useElementHeightVar(ref, '[data-bar]', '--bar-height');
  return <div ref={ref} data-testid="root">{withTarget ? <div data-bar /> : null}</div>;
}

describe('useElementHeightVar', () => {
  it('writes the target height onto the root as a CSS variable', () => {
    const { getByTestId } = render(<Harness withTarget />);
    expect(getByTestId('root').style.getPropertyValue('--bar-height')).toBe('0px');
  });

  it('leaves the root untouched when the target is missing', () => {
    const { getByTestId } = render(<Harness withTarget={false} />);
    expect(getByTestId('root').style.getPropertyValue('--bar-height')).toBe('');
  });
});
