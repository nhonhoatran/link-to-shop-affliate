export const LOGIN_PATH = '/admin/login';

export const ADMIN_PATHS = {
  overview: '/admin',
  outfits: '/admin/outfits',
  outfitNew: '/admin/outfits/new',
  outfitEdit: (id: string) => `/admin/outfits/${id}`,
  settings: '/admin/settings',
  users: '/admin/users',
  login: LOGIN_PATH,
} as const;
