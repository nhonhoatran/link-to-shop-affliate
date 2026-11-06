'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { ApiError } from '@/lib/api-client-browser';
import { LOGIN_PATH } from '@/lib/admin-paths';

/** Returns a function that sends the person to the login page on a 401 and reports whether it did. */
export function useRedirectOnUnauthorized() {
  const router = useRouter();
  return useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError) || !error.isUnauthorized) return false;
      router.replace(LOGIN_PATH);
      return true;
    },
    [router],
  );
}
