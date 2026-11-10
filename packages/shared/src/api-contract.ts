import { z } from 'zod';
import type { AdminUserDto, CreateAdminInput, LoginInput } from './auth-schemas';
import { objectIdSchema } from './object-id-schema';
import { outfitStatusSchema } from './outfit-schemas';
import type { ImageWithUrl, Outfit, OutfitInput, OutfitItem, OutfitStatus, OutfitUpdateInput } from './outfit-schemas';
import type { PublicOutfitDto } from './public-outfit-dto';
import type { AdminSettingsDto, PublicSettingsDto, SettingsInput } from './settings-schemas';

export const API_PATHS = {
  health: '/api/health',
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  public: {
    outfits: '/api/public/outfits',
    featuredOutfit: '/api/public/outfits/featured',
    outfitSlugs: '/api/public/outfits/slugs',
    outfitFeed: '/api/public/outfits/feed',
    outfitBySlug: '/api/public/outfits/:slug',
    settings: '/api/public/settings',
    collections: '/api/public/collections',
    collectionSlugs: '/api/public/collections/slugs',
    collectionBySlug: '/api/public/collections/:slug',
    home: '/api/public/home',
    newsletter: '/api/public/newsletter',
  },
  admin: {
    outfits: '/api/admin/outfits',
    outfitById: '/api/admin/outfits/:id',
    outfitFeatured: '/api/admin/outfits/:id/featured',
    stats: '/api/admin/stats',
    settings: '/api/admin/settings',
    admins: '/api/admin/admins',
    adminById: '/api/admin/admins/:id',
    media: '/api/admin/media',
    collections: '/api/admin/collections',
    collectionById: '/api/admin/collections/:id',
    collectionMove: '/api/admin/collections/:id/move',
    collectionOutfits: '/api/admin/collections/:id/outfits',
    collectionOutfit: '/api/admin/collections/:id/outfits/:outfitId',
    home: '/api/admin/home',
    homeDraft: '/api/admin/home/draft',
    homePublish: '/api/admin/home/publish',
    homeRestorePrevious: '/api/admin/home/restore-previous',
    homePreview: '/api/admin/home/preview',
    homeRevertDraft: '/api/admin/home/revert-draft',
    homeReset: '/api/admin/home/reset',
    newsletter: '/api/admin/newsletter',
    newsletterExport: '/api/admin/newsletter/export',
  },
} as const;

export const apiUrl = {
  publicOutfit: (slug: string) => `/api/public/outfits/${encodeURIComponent(slug)}`,
  adminOutfit: (id: string) => `/api/admin/outfits/${encodeURIComponent(id)}`,
  adminOutfitFeatured: (id: string) => `/api/admin/outfits/${encodeURIComponent(id)}/featured`,
  adminAdmin: (id: string) => `/api/admin/admins/${encodeURIComponent(id)}`,
  publicCollection: (slug: string) => `/api/public/collections/${encodeURIComponent(slug)}`,
  adminCollection: (id: string) => `/api/admin/collections/${encodeURIComponent(id)}`,
  adminCollectionMove: (id: string) => `/api/admin/collections/${encodeURIComponent(id)}/move`,
  adminCollectionOutfits: (id: string) => `/api/admin/collections/${encodeURIComponent(id)}/outfits`,
  adminNewsletterSubscriber: (id: string) => `/api/admin/newsletter/${encodeURIComponent(id)}`,
  adminNewsletterUnsubscribe: (id: string) => `/api/admin/newsletter/${encodeURIComponent(id)}/unsubscribe`,
  adminCollectionOutfit: (id: string, outfitId: string) =>
    `/api/admin/collections/${encodeURIComponent(id)}/outfits/${encodeURIComponent(outfitId)}`,
};

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface HealthResponse {
  status: 'ok';
}

export type LoginRequest = LoginInput;
export type LoginResponse = AdminUserDto;
export type MeResponse = AdminUserDto;

export type FeaturedOutfitResponse = PublicOutfitDto;
export type PublicOutfitResponse = PublicOutfitDto;
export interface OutfitSlugsResponse {
  items: { slug: string; updatedAt: string }[];
}
export type PublicSettingsResponse = PublicSettingsDto;

// Technical bound only: keeps `skip` finite so a huge `?page=` cannot overflow the database query.
export const MAX_LIST_PAGE = 100_000;

export const adminOutfitListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: outfitStatusSchema.optional(),
  collectionId: objectIdSchema.optional(),
  page: z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1),
  // Default and maximum are enforced by the API from ADMIN_PAGE_SIZE_* env.
  size: z.coerce.number().int().min(1).optional(),
});
export type AdminOutfitListQuery = z.input<typeof adminOutfitListQuerySchema>;

export interface AdminOutfitListItemDto {
  id: string;
  slug: string;
  title: string;
  status: OutfitStatus;
  featured: boolean;
  updatedAt: string;
  modelImageUrl: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export type AdminOutfitListResponse = Paginated<AdminOutfitListItemDto>;

export type AdminOutfitDto = Omit<Outfit, 'modelImage' | 'items'> & {
  modelImage: ImageWithUrl;
  items: (Omit<OutfitItem, 'image'> & { image: ImageWithUrl })[];
};

export type CreateOutfitRequest = OutfitInput;
export type UpdateOutfitRequest = OutfitUpdateInput;
export type OutfitResponse = AdminOutfitDto;

// Setting featured=true clears the flag on every other outfit (at most one featured).
export const setFeaturedRequestSchema = z.object({ featured: z.boolean() });
export type SetFeaturedRequest = z.infer<typeof setFeaturedRequestSchema>;

export type AdminSettingsResponse = AdminSettingsDto;
export type UpdateSettingsRequest = SettingsInput;

export interface AdminListResponse {
  items: AdminUserDto[];
}
export type CreateAdminRequest = CreateAdminInput;
export type CreateAdminResponse = AdminUserDto;

export const mediaKindSchema = z.enum(['model', 'item']);
export type MediaKind = z.infer<typeof mediaKindSchema>;
export const MEDIA_UPLOAD_FIELD = 'file';
export type MediaUploadResponse = ImageWithUrl;
