import { API_PATHS, type AdminNewsletterListResponse } from '@under30ss/shared';
import { adminGet } from './admin-api';

export interface AdminNewsletterListParams {
  q?: string | undefined;
  status?: string | undefined;
  page: number;
}

export const getAdminNewsletterList = ({ q, status, page }: AdminNewsletterListParams) => {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  return adminGet<AdminNewsletterListResponse>(`${API_PATHS.admin.newsletter}?${params}`);
};
