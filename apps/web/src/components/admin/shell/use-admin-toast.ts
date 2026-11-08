'use client';

import { createContext, useContext } from 'react';

export interface AdminToastAction {
  label: string;
  onClick: () => void;
}

export interface AdminToastOptions {
  /** A toast with an action stays longer and pauses while hovered or focused. */
  action?: AdminToastAction;
}

export interface AdminToastApi {
  success: (text: string, options?: AdminToastOptions) => void;
  error: (text: string) => void;
}

const NOOP_TOAST: AdminToastApi = { success: () => undefined, error: () => undefined };

export const AdminToastContext = createContext<AdminToastApi>(NOOP_TOAST);

/** No-op outside the provider, so components using it can be rendered alone in tests. */
export const useAdminToast = (): AdminToastApi => useContext(AdminToastContext);
