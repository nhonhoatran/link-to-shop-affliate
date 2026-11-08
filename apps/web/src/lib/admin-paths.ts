export const LOGIN_PATH = '/admin/login';

export const ADMIN_PATHS = {
  overview: '/admin',
  outfits: '/admin/outfits',
  outfitNew: '/admin/outfits/new',
  outfitEdit: (id: string) => `/admin/outfits/${id}`,
  collections: '/admin/collections',
  collectionNew: '/admin/collections/new',
  collectionEdit: (id: string) => `/admin/collections/${id}`,
  home: '/admin/home',
  homePreview: '/admin/home-preview',
  settings: '/admin/settings',
  users: '/admin/users',
  login: LOGIN_PATH,
} as const;
