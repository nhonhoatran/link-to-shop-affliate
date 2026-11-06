import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildListHref, parseOutfitListQuery } from '@/components/admin/outfit-list-query';
import { useSaveShortcut } from '@/hooks/admin/use-save-shortcut';
import { useUnsavedChangesGuard } from '@/hooks/admin/use-unsaved-changes-guard';

const fire = (type: string): Event => {
  const event = new Event(type, { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('useUnsavedChangesGuard', () => {
  it('asks the browser to confirm leaving only while dirty', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty, vi.fn()), {
      initialProps: { dirty: false },
    });
    expect(fire('beforeunload').defaultPrevented).toBe(false);
    rerender({ dirty: true });
    expect(fire('beforeunload').defaultPrevented).toBe(true);
    rerender({ dirty: false });
    expect(fire('beforeunload').defaultPrevented).toBe(false);
  });

  it('ignores new-tab links and modified clicks', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true, vi.fn()));
    const blank = document.createElement('a');
    blank.href = '/look/x';
    blank.target = '_blank';
    const plain = document.createElement('a');
    plain.href = '/admin';
    document.body.append(blank, plain);
    const noNavigation = (event: Event) => event.preventDefault();
    document.addEventListener('click', noNavigation);
    fireEvent.click(blank);
    fireEvent.click(plain, { ctrlKey: true });
    document.removeEventListener('click', noNavigation);
    expect(result.current.pendingHref).toBeNull();
    blank.remove();
    plain.remove();
  });
});

describe('useSaveShortcut', () => {
  it('runs the latest callback on Ctrl+S and Cmd+S and blocks the browser dialog', () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave));
    const ctrl = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    window.dispatchEvent(ctrl);
    const meta = new KeyboardEvent('keydown', { key: 'S', metaKey: true, cancelable: true });
    window.dispatchEvent(meta);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', cancelable: true }));
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(ctrl.defaultPrevented).toBe(true);
    expect(meta.defaultPrevented).toBe(true);
  });
});

describe('outfit list query', () => {
  it('falls back to defaults for empty or invalid params', () => {
    expect(parseOutfitListQuery({ q: '', status: '', page: '0' })).toEqual({ q: '', status: undefined, page: 1 });
    expect(parseOutfitListQuery({ status: 'weird', page: 'abc' })).toEqual({ q: '', status: undefined, page: 1 });
  });

  it('reads q, status and page', () => {
    expect(parseOutfitListQuery({ q: ' áo ', status: 'published', page: '3' })).toEqual({
      q: 'áo',
      status: 'published',
      page: 3,
    });
  });

  it('builds links that keep q and status and drop page 1', () => {
    const query = { q: 'áo thun', status: 'draft' as const, page: 2 };
    expect(buildListHref(query, 3)).toBe('/admin?q=%C3%A1o+thun&status=draft&page=3');
    expect(buildListHref(query, 1)).toBe('/admin?q=%C3%A1o+thun&status=draft');
    expect(buildListHref({ q: '', status: undefined, page: 1 }, 1)).toBe('/admin');
  });
});
