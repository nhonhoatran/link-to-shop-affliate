import { API_PATHS, type AdminHomeLayoutDto, type PreviewHomeResponse } from '@under30ss/shared';
import { adminGet } from './admin-api';

export const getAdminHome = () => adminGet<AdminHomeLayoutDto>(API_PATHS.admin.home);

/** The saved draft with its outfits and collections resolved, exactly as the public page would show it. */
export const getAdminHomePreview = () => adminGet<PreviewHomeResponse>(API_PATHS.admin.homePreview);
