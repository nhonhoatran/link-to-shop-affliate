'use client';

import { useRef, useState, type Dispatch } from 'react';
import { apiUrl, outfitInputSchema } from '@under30ss/shared';
import { describeApiFailure } from '@/components/admin/describe-api-failure';
import { issuesToFieldErrors, type FieldErrors } from '@/components/admin/validation-messages';
import { apiFetch } from '@/lib/api-client-browser';
import { snapshotOf, toOutfitInput, type EditorAction, type EditorItem, type EditorState } from './editor-state';
import { useRedirectOnUnauthorized } from './use-redirect-on-unauthorized';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Id of the first item (by position) that has an error key like `items.<i>.field`. */
export const firstInvalidItemId = (errors: FieldErrors, items: readonly EditorItem[]): string | null => {
  const indexes = Object.keys(errors)
    .map((key) => /^items\.(\d+)\./.exec(key)?.[1])
    .filter((value): value is string => value !== undefined)
    .map(Number);
  return indexes.length > 0 ? (items[Math.min(...indexes)]?.id ?? null) : null;
};

export function useOutfitActions(state: EditorState, dispatch: Dispatch<EditorAction>) {
  const redirectToLogin = useRedirectOnUnauthorized();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [removing, setRemoving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  // State updates are async: the ref stops a second Ctrl+S or click that lands before "saving" has rendered.
  const inFlight = useRef(false);

  const fail = (found: FieldErrors, text: string) => {
    setErrors(found);
    setMessage(text);
    setSaveStatus('error');
    const invalidId = firstInvalidItemId(found, state.items);
    if (invalidId) dispatch({ type: 'select', id: invalidId });
  };

  const handleApiError = (error: unknown) => {
    if (redirectToLogin(error)) {
      setSaveStatus('idle');
      return;
    }
    const failure = describeApiFailure(error);
    fail(failure.fields, failure.message);
  };

  /** Validates with the shared schema, then PUTs. Returns true when saved; false when skipped or failed. */
  const save = async (status = state.status): Promise<boolean> => {
    if (inFlight.current) return false;
    setMessage(null);
    const parsed = outfitInputSchema.safeParse(toOutfitInput(state, status));
    if (!parsed.success) {
      const verb = status === 'published' ? 'đăng' : 'lưu';
      fail(issuesToFieldErrors(parsed.error.issues), `Chưa ${verb} được: kiểm tra các mục báo lỗi`);
      return false;
    }
    setErrors({});
    inFlight.current = true;
    setSaveStatus('saving');
    try {
      await apiFetch(apiUrl.adminOutfit(state.id), { method: 'PUT', json: parsed.data });
      dispatch({ type: 'saved', status, snapshot: snapshotOf(state, status) });
      // The API drops the featured flag when an outfit goes back to draft.
      if (status === 'draft' && state.featured) dispatch({ type: 'featured', value: false });
      setSaveStatus('saved');
      return true;
    } catch (error) {
      handleApiError(error);
      return false;
    } finally {
      inFlight.current = false;
    }
  };

  const setFeatured = async (featured: boolean) => {
    if (inFlight.current) return;
    setMessage(null);
    inFlight.current = true;
    setSaveStatus('saving');
    try {
      await apiFetch(apiUrl.adminOutfitFeatured(state.id), { method: 'POST', json: { featured } });
      dispatch({ type: 'featured', value: featured });
      setSaveStatus('saved');
    } catch (error) {
      handleApiError(error);
    } finally {
      inFlight.current = false;
    }
  };

  const remove = async (): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setRemoving(true);
    try {
      await apiFetch(apiUrl.adminOutfit(state.id), { method: 'DELETE' });
      return true;
    } catch (error) {
      handleApiError(error);
      return false;
    } finally {
      inFlight.current = false;
      setRemoving(false);
    }
  };

  return { saveStatus, removing, errors, message, save, setFeatured, remove };
}
