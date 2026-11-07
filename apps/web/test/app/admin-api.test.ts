import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client-error';

const { apiGet, forwardCookieHeader, redirect, notFound } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  forwardCookieHeader: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ redirect, notFound }));
vi.mock('@/lib/api-client-server', async () => {
  const { ApiError: RealApiError } = await import('@/lib/api-client-error');
  return { ApiError: RealApiError, apiGet, forwardCookieHeader };
});

import { adminGet, getAdminStats } from '@/app/admin/_lib/admin-api';

const apiError = (status: number) => new ApiError(status, { code: 'X', message: 'x' });

beforeEach(() => {
  apiGet.mockReset();
  redirect.mockClear();
  notFound.mockClear();
  forwardCookieHeader.mockReset().mockResolvedValue('sid=abc');
});

describe('adminGet', () => {
  it('returns the data and forwards the session cookie', async () => {
    apiGet.mockResolvedValue({ ok: true });
    await expect(adminGet('/api/admin/outfits')).resolves.toEqual({ ok: true });
    expect(apiGet).toHaveBeenCalledWith('/api/admin/outfits', { cookie: 'sid=abc' });
  });

  it('redirects to the login page on 401', async () => {
    apiGet.mockRejectedValue(apiError(401));
    await expect(adminGet('/api/admin/outfits')).rejects.toThrow('NEXT_REDIRECT:/admin/login');
    expect(redirect).toHaveBeenCalledWith('/admin/login');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('shows the not-found page on 404', async () => {
    apiGet.mockRejectedValue(apiError(404));
    await expect(adminGet('/api/admin/outfits/nope')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('lets any other failure reach the error boundary', async () => {
    const failure = apiError(500);
    apiGet.mockRejectedValue(failure);
    await expect(adminGet('/api/admin/outfits')).rejects.toBe(failure);
    expect(redirect).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe('getAdminStats', () => {
  it('reads the stats endpoint with the session cookie', async () => {
    const stats = { counts: { total: 1 }, featured: null, recent: [] };
    apiGet.mockResolvedValue(stats);
    await expect(getAdminStats()).resolves.toEqual(stats);
    expect(apiGet).toHaveBeenCalledWith('/api/admin/stats', { cookie: 'sid=abc' });
  });
});
