'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import {
  API_PATHS,
  saveHomeDraftRequestSchema,
  type AdminHomeLayoutDto,
  type HomeSection,
  type PublishHomeResponse,
  type RestorePreviousHomeResponse,
} from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';
import { ApiError, apiFetch } from '@/lib/api-client-browser';
import { describeApiFailure } from '../describe-api-failure';
import { useAdminToast } from '../shell/use-admin-toast';
import type { FieldErrors } from '../validation-messages';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import { validateLayout } from './map-layout-errors';
import type { HomeLayoutAction, HomeLayoutState } from './use-home-layout-state';

/** Thrown after the form errors were published to the UI, so the shared failure path only has to set the status. */
class LayoutValidationError extends Error {}

interface Notice {
  text: string;
  /** The content the notice is about; it disappears once the content changes. null keeps it until the next action. */
  at: HomeSection[] | null;
}

export function useHomeLayoutActions(state: HomeLayoutState, dispatch: Dispatch<HomeLayoutAction>) {
  const redirectToLogin = useRedirectOnUnauthorized();
  const toast = useAdminToast();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [conflict, setConflict] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<{ at: HomeSection[]; errors: FieldErrors } | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  // Toast actions and async steps outlive the render that created them, so they read the newest state from here.
  const latest = useRef(state);
  // A second click or Ctrl+S can land before "saving" has rendered.
  const inFlight = useRef(false);
  useEffect(() => {
    latest.current = state;
  });

  const handleFailure = (error: unknown) => {
    setSaveStatus('error');
    if (error instanceof LayoutValidationError) {
      setNotice({ text: COPY.fixErrors, at: latest.current.content });
      return;
    }
    if (redirectToLogin(error)) {
      setSaveStatus('idle');
      return;
    }
    if (error instanceof ApiError && error.status === 409) {
      if (error.fields?.previous) {
        dispatch({ type: 'noPrevious' });
        setNotice({ text: COPY.noPrevious, at: null });
      } else {
        setConflict(true);
        setNotice({ text: COPY.conflict, at: null });
      }
      return;
    }
    const failure = describeApiFailure(error);
    setNotice({ text: failure.message, at: latest.current.content });
    if (Object.keys(failure.fields).length > 0) {
      setServer({ at: latest.current.content, errors: failure.fields });
      setFocusRequest((count) => count + 1);
    }
  };

  const guarded = async (task: () => Promise<void>): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setNotice(null);
    setConflict(false);
    setSaveStatus('saving');
    try {
      await task();
      setSaveStatus('saved');
      return true;
    } catch (error) {
      handleFailure(error);
      return false;
    } finally {
      inFlight.current = false;
    }
  };

  const saveStep = async (): Promise<AdminHomeLayoutDto> => {
    const { content, draftUpdatedAt } = latest.current;
    const parsed = saveHomeDraftRequestSchema.safeParse({ content, baseUpdatedAt: draftUpdatedAt });
    if (!parsed.success) {
      setSubmitted(true);
      setFocusRequest((count) => count + 1);
      throw new LayoutValidationError();
    }
    const dto = await apiFetch<AdminHomeLayoutDto>(API_PATHS.admin.homeDraft, { method: 'PUT', json: parsed.data });
    dispatch({ type: 'saved', dto, content });
    setSubmitted(false);
    setServer(null);
    return dto;
  };

  const restorePrevious = () =>
    guarded(async () => {
      const result = await apiFetch<RestorePreviousHomeResponse>(API_PATHS.admin.homeRestorePrevious, {
        method: 'POST',
        json: { basePublishedAt: latest.current.publishedAt },
      });
      dispatch({ type: 'restored', ...result });
      toast.success(COPY.toastRestored);
    });

  const saveDraft = () =>
    guarded(async () => {
      await saveStep();
      toast.success(COPY.toastSaved);
    });

  const publish = () =>
    guarded(async () => {
      const current = latest.current;
      const dirty = JSON.stringify(current.content) !== current.savedJson;
      const baseUpdatedAt = dirty ? (await saveStep()).draftUpdatedAt : current.draftUpdatedAt;
      const result = await apiFetch<PublishHomeResponse>(API_PATHS.admin.homePublish, {
        method: 'POST',
        json: { baseUpdatedAt },
      });
      dispatch({ type: 'published', ...result });
      toast.success(COPY.toastPublished, { action: { label: COPY.undo, onClick: () => void restorePrevious() } });
    });

  const replaceDraft = (path: string, success: string, undoable: boolean) =>
    guarded(async () => {
      const dto = await apiFetch<AdminHomeLayoutDto>(path, { method: 'POST' });
      dispatch({ type: 'load', dto });
      setSubmitted(false);
      setServer(null);
      toast.success(success, undoable ? { action: { label: COPY.undo, onClick: () => void restorePrevious() } } : {});
    });

  const revertDraft = () => replaceDraft(API_PATHS.admin.homeRevertDraft, COPY.toastReverted, false);
  // Resetting unpublishes the layout; the old one stays restorable only if something was published.
  const resetToDefault = () =>
    replaceDraft(API_PATHS.admin.homeReset, COPY.toastReset, latest.current.publishedAt !== null);

  const errors = useMemo<FieldErrors>(
    () => ({
      ...(server && server.at === state.content ? server.errors : {}),
      ...(submitted ? validateLayout(state.content) : {}),
    }),
    [server, submitted, state.content],
  );
  const message = notice && (notice.at === null || notice.at === state.content) ? notice.text : null;

  return {
    saveStatus,
    busy: saveStatus === 'saving',
    errors,
    message,
    conflict,
    focusRequest,
    saveDraft,
    publish,
    restorePrevious,
    revertDraft,
    resetToDefault,
  };
}
