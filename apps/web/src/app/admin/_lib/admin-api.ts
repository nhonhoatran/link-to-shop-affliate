import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { API_PATHS, type AdminSettingsResponse, type AdminStatsResponse, type MeResponse } from '@under30ss/shared';
import { LOGIN_PATH } from '@/lib/admin-paths';
import { ApiError, apiGet, forwardCookieHeader } from '@/lib/api-client-server';

/** GET against the API with the visitor's session cookie; 401 -> login, 404 -> not-found page. */
export const adminGet = async <T>(path: string): Promise<T> => {
  try {
    const cookie = await forwardCookieHeader();
    return await apiGet<T>(path, cookie ? { cookie } : {});
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) redirect(LOGIN_PATH);
      if (error.isNotFound) notFound();
    }
    throw error;
  }
};

/** Shared by the protected layout and pages within one request. */
export const getCurrentAdmin = cache((): Promise<MeResponse> => adminGet<MeResponse>(API_PATHS.auth.me));

export const getAdminSettings = cache(
  (): Promise<AdminSettingsResponse> => adminGet<AdminSettingsResponse>(API_PATHS.admin.settings),
);

export const getAdminStats = cache((): Promise<AdminStatsResponse> => adminGet<AdminStatsResponse>(API_PATHS.admin.stats));
