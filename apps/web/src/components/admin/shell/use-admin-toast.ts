'use client';

import { createContext, useContext } from 'react';

export interface AdminToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
}

const NOOP_TOAST: AdminToastApi = { success: () => undefined, error: () => undefined };

export const AdminToastContext = createContext<AdminToastApi>(NOOP_TOAST);

/** No-op outside the provider, so components using it can be rendered alone in tests. */
export const useAdminToast = (): AdminToastApi => useContext(AdminToastContext);
