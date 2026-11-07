import { z } from 'zod';

export const ADMIN_THEME_COOKIE = 'admin-theme';
export const ADMIN_SIDEBAR_COOKIE = 'admin-sidebar';

export const adminThemeSchema = z.enum(['light', 'dark', 'system']);
export const sidebarStateSchema = z.enum(['expanded', 'rail']);
export type AdminTheme = z.infer<typeof adminThemeSchema>;
export type SidebarState = z.infer<typeof sidebarStateSchema>;

export const DEFAULT_ADMIN_THEME: AdminTheme = 'system';
export const DEFAULT_SIDEBAR_STATE: SidebarState = 'expanded';

/** Technical constant: display preferences are kept for one year. */
export const PREFERENCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export const readAdminTheme = (store: CookieReader): AdminTheme => {
  const parsed = adminThemeSchema.safeParse(store.get(ADMIN_THEME_COOKIE)?.value);
  return parsed.success ? parsed.data : DEFAULT_ADMIN_THEME;
};

export const readSidebarState = (store: CookieReader): SidebarState => {
  const parsed = sidebarStateSchema.safeParse(store.get(ADMIN_SIDEBAR_COOKIE)?.value);
  return parsed.success ? parsed.data : DEFAULT_SIDEBAR_STATE;
};
