import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAdminTheme, setSidebarState } from '@/app/admin/_lib/admin-preference-actions';
import { readAdminTheme, readSidebarState } from '@/app/admin/_lib/admin-preferences';

const { set, forwardedProto, revalidatePath } = vi.hoisted(() => ({
  set: vi.fn(),
  forwardedProto: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ set }),
  headers: async () => ({ get: forwardedProto }),
}));
vi.mock('next/cache', () => ({ revalidatePath }));

const form = (name: string, value: string) => {
  const data = new FormData();
  data.set(name, value);
  return data;
};

beforeEach(() => {
  set.mockReset();
  revalidatePath.mockReset();
  forwardedProto.mockReset().mockReturnValue(null);
});

describe('admin preference actions', () => {
  it('stores a valid theme in an httpOnly cookie scoped to /admin and refreshes the layout', async () => {
    await setAdminTheme(form('theme', 'dark'));
    expect(set).toHaveBeenCalledWith(
      'admin-theme',
      'dark',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/admin', secure: false, maxAge: 31_536_000 }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('marks the cookie secure only when the request came in over https', async () => {
    forwardedProto.mockReturnValue('https');
    await setSidebarState(form('sidebar', 'rail'));
    expect(set).toHaveBeenCalledWith('admin-sidebar', 'rail', expect.objectContaining({ secure: true }));
  });

  it('ignores values outside the allowed set', async () => {
    await setAdminTheme(form('theme', 'neon'));
    await setSidebarState(form('sidebar', 'huge'));
    await setAdminTheme(new FormData());
    expect(set).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('preference readers', () => {
  const store = (value?: string) => ({ get: () => (value === undefined ? undefined : { value }) });

  it('falls back to defaults for missing or invalid cookies', () => {
    expect(readAdminTheme(store())).toBe('system');
    expect(readAdminTheme(store('bogus'))).toBe('system');
    expect(readSidebarState(store())).toBe('expanded');
    expect(readSidebarState(store('bogus'))).toBe('expanded');
  });

  it('returns stored valid values', () => {
    expect(readAdminTheme(store('light'))).toBe('light');
    expect(readSidebarState(store('rail'))).toBe('rail');
  });
});
