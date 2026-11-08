import {
  API_PATHS,
  apiUrl,
  type AdminCollectionListResponse,
  type AdminOutfitListResponse,
  type CollectionResponse,
} from '@under30ss/shared';
import { adminGet } from './admin-api';

export interface AdminCollectionListParams {
  q?: string | undefined;
  status?: string | undefined;
  page: number;
}

export const getAdminCollectionList = ({ q, status, page }: AdminCollectionListParams) => {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  return adminGet<AdminCollectionListResponse>(`${API_PATHS.admin.collections}?${params}`);
};

export const getAdminCollection = (id: string) => adminGet<CollectionResponse>(apiUrl.adminCollection(id));

/** One page of the outfits assigned to a collection, in the API's default order. */
export const getCollectionOutfits = (collectionId: string, page: number) => {
  const params = new URLSearchParams({ collectionId, page: String(page) });
  return adminGet<AdminOutfitListResponse>(`${API_PATHS.admin.outfits}?${params}`);
};
