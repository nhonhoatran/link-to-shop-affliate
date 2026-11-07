import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { EditorTabs, type EditorTabPanel } from '@/components/admin/editor-tabs';
import { firstTabWithError, mapErrorsToEditorTabs } from '@/components/admin/map-errors-to-editor-tabs';

type Id = 'a' | 'b' | 'c';
const panels: EditorTabPanel<Id>[] = [
  { id: 'a', label: 'Thông tin', content: <input aria-label="field-a" /> },
  { id: 'b', label: 'Món đồ', content: <input aria-label="field-b" /> },
  { id: 'c', label: 'Xem trước', content: <p>preview</p> },
];

function Harness({ wide = false, errorTabs = new Set<Id>() }: { wide?: boolean; errorTabs?: Set<Id> }) {
  const [active, setActive] = useState<Id>('a');
  return (
    <EditorTabs label="Các phần" panels={panels} active={active} onActiveChange={setActive} errorTabs={errorTabs} wide={wide} />
  );
}

describe('EditorTabs', () => {
  it('selects with the mouse, keeps hidden panels mounted and uses roving tabindex', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const [first, second] = screen.getAllByRole('tab');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    expect(document.getElementById('editor-tabpanel-b')).toHaveAttribute('hidden');
    expect(document.querySelector('[aria-label="field-b"]')).toBeInTheDocument();

    await user.click(second!);

    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Món đồ' })).toBeVisible();
    expect(document.getElementById('editor-tabpanel-a')).toHaveAttribute('hidden');
  });

  it('moves with arrows (wrapping), Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');
    tabs[0]!.focus();

    await user.keyboard('{ArrowLeft}');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
  });

  it('marks tabs that hold errors with hidden text for screen readers', () => {
    render(<Harness errorTabs={new Set<Id>(['b'])} />);
    expect(screen.getByRole('tab', { name: /Món đồ\s*\(có lỗi\)/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Thông tin' })).toBeInTheDocument();
  });

  it('drops tab semantics and shows every panel in the wide layout', () => {
    render(<Harness wide />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('field-b')).toBeVisible();
    expect(screen.getByText('preview')).toBeVisible();
  });
});

describe('mapErrorsToEditorTabs', () => {
  it('sends item keys to the items tab and everything else to info', () => {
    const tabs = mapErrorsToEditorTabs({ 'items.2.affiliateUrl': 'x', items: 'y', title: 'z' });
    expect([...tabs].sort()).toEqual(['info', 'items']);
    expect(firstTabWithError(new Set(['items', 'info']))).toBe('info');
    expect(firstTabWithError(new Set(['items']))).toBe('items');
    expect(firstTabWithError(new Set())).toBeNull();
  });
});
