'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import {
  ADMIN_SIDEBAR_COOKIE,
  ADMIN_THEME_COOKIE,
  PREFERENCE_MAX_AGE_SECONDS,
  adminThemeSchema,
  sidebarStateSchema,
} from './admin-preferences';

// Not derived from NODE_ENV: the compose stack runs production builds over plain HTTP.
const cookieOptions = async () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  path: ADMIN_PATHS.overview,
  maxAge: PREFERENCE_MAX_AGE_SECONDS,
  secure: (await headers()).get('x-forwarded-proto') === 'https',
});

export async function setAdminTheme(formData: FormData): Promise<void> {
  const parsed = adminThemeSchema.safeParse(formData.get('theme'));
  if (!parsed.success) return;
  (await cookies()).set(ADMIN_THEME_COOKIE, parsed.data, await cookieOptions());
  revalidatePath(ADMIN_PATHS.overview, 'layout');
}

export async function setSidebarState(formData: FormData): Promise<void> {
  const parsed = sidebarStateSchema.safeParse(formData.get('sidebar'));
  if (!parsed.success) return;
  (await cookies()).set(ADMIN_SIDEBAR_COOKIE, parsed.data, await cookieOptions());
  revalidatePath(ADMIN_PATHS.overview, 'layout');
}
