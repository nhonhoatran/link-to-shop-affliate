import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_PATHS, type AdminHomeLayoutDto } from '@under30ss/shared';
import { AdminToastContext, type AdminToastOptions } from '@/components/admin/shell/use-admin-toast';
import { useHomeLayoutActions } from '@/components/admin/home-editor/use-home-layout-actions';
import { createSection, useHomeLayoutState } from '@/components/admin/home-editor/use-home-layout-state';
import { jsonResponse } from '../admin-outfit-fixture';
import { adminHomeDto } from './home-editor-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();
const toast = { success: vi.fn<(text: string, options?: AdminToastOptions) => void>(), error: vi.fn() };

beforeEach(() => {
  fetchMock.mockReset();
  toast.success.mockReset();
  router.replace.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const wrapper = ({ children }: { children: ReactNode }) => (
  <AdminToastContext.Provider value={toast}>{children}</AdminToastContext.Provider>
);

const setup = (dto: AdminHomeLayoutDto = adminHomeDto()) =>
  renderHook(
    () => {
      const layout = useHomeLayoutState(dto);
      const actions = useHomeLayoutActions(layout.state, layout.dispatch);
      return { ...layout, actions };
    },
    { wrapper },
  );

const conflict = (fields?: Record<string, string>) =>
  jsonResponse({ error: { code: 'CONFLICT', message: 'Stale', ...(fields ? { fields } : {}) } }, 409);

const calls = () => fetchMock.mock.calls.map(([path, init]) => [path, init?.method, init?.body ? JSON.parse(init.body) : undefined]);

const hideFirst = (hook: ReturnType<typeof setup>) =>
  act(() => hook.result.current.dispatch({ type: 'toggle', id: hook.result.current.state.content[0]!.props.id }));

describe('saveDraft', () => {
  it('sends the content with the draft lock and records the new lock', async () => {
    const hook = setup();
    hideFirst(hook);
    fetchMock.mockResolvedValue(jsonResponse(adminHomeDto({ draftUpdatedAt: 'T2', hasUnpublishedChanges: true })));
    await act(() => hook.result.current.actions.saveDraft());

    const [path, method, body] = calls()[0]!;
    expect([path, method]).toEqual([API_PATHS.admin.homeDraft, 'PUT']);
    expect(body.baseUpdatedAt).toBe('2026-11-07T01:00:00.000Z');
    expect(body.content[0].props.visible).toBe(false);
    expect(hook.result.current.state.draftUpdatedAt).toBe('T2');
    expect(hook.result.current.dirty).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Đã lưu nháp');
  });

  it('does not call the API when a section is invalid and points at the field', async () => {
    const hook = setup();
    act(() => hook.result.current.dispatch({ type: 'add', section: createSection('TextWithImage') }));
    await act(() => hook.result.current.actions.saveDraft());

    expect(fetchMock).not.toHaveBeenCalled();
    const index = hook.result.current.state.content.length - 1;
    expect(hook.result.current.actions.errors[`content.${index}.props.heading`]).toBe('Không được để trống');
    expect(hook.result.current.actions.focusRequest).toBe(1);
    expect(hook.result.current.actions.message).toMatch(/kiểm tra các mục báo lỗi/);
  });

  it('stops showing a field error once the field is fixed', async () => {
    const hook = setup();
    const section = createSection('TextWithImage');
    act(() => hook.result.current.dispatch({ type: 'add', section }));
    await act(() => hook.result.current.actions.saveDraft());
    expect(Object.keys(hook.result.current.actions.errors)).not.toHaveLength(0);

    act(() => hook.result.current.dispatch({ type: 'update', id: section.props.id, patch: { heading: 'Xin chào', body: 'Nội dung' } }));
    expect(hook.result.current.actions.errors).toEqual({});
    expect(hook.result.current.actions.message).toBeNull();
  });

  it('ignores a second save while one is in flight', async () => {
    const hook = setup();
    hideFirst(hook);
    let finish: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    let first: Promise<boolean> | undefined;
    await act(async () => {
      first = hook.result.current.actions.saveDraft();
      await hook.result.current.actions.saveDraft();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(jsonResponse(adminHomeDto({ draftUpdatedAt: 'T2' })));
      await first;
    });
  });

  it('sends a 401 to the login page', async () => {
    const hook = setup();
    hideFirst(hook);
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'No session' } }, 401));
    await act(() => hook.result.current.actions.saveDraft());
    expect(router.replace).toHaveBeenCalledWith('/admin/login');
    expect(hook.result.current.actions.message).toBeNull();
  });
});

describe('publish', () => {
  it('saves first when there are edits, then publishes against the new lock and offers an undo', async () => {
    const hook = setup();
    hideFirst(hook);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(adminHomeDto({ draftUpdatedAt: 'T2', hasUnpublishedChanges: true })))
      .mockResolvedValueOnce(jsonResponse({ publishedAt: 'P1', previous: { publishedAt: null } }));
    await act(() => hook.result.current.actions.publish());

    expect(calls().map(([path, method]) => [path, method])).toEqual([
      [API_PATHS.admin.homeDraft, 'PUT'],
      [API_PATHS.admin.homePublish, 'POST'],
    ]);
    expect(calls()[1]![2]).toEqual({ baseUpdatedAt: 'T2' });
    expect(hook.result.current.state).toMatchObject({ publishedAt: 'P1', hasUnpublishedChanges: false });
    const [text, options] = toast.success.mock.calls.at(-1)!;
    expect(text).toBe('Đã đăng trang chủ');
    expect(options?.action?.label).toBe('Hoàn tác');
  });

  it('skips the save when nothing changed', async () => {
    const hook = setup(adminHomeDto({ hasUnpublishedChanges: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ publishedAt: 'P1', previous: null }));
    await act(() => hook.result.current.actions.publish());
    expect(calls()).toEqual([[API_PATHS.admin.homePublish, 'POST', { baseUpdatedAt: '2026-11-07T01:00:00.000Z' }]]);
  });

  it('does not publish when the save fails validation', async () => {
    const hook = setup();
    act(() => hook.result.current.dispatch({ type: 'add', section: createSection('Faq') }));
    await act(() => hook.result.current.actions.publish());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the stale-lock message and a reload button state instead of overwriting', async () => {
    const hook = setup(adminHomeDto({ hasUnpublishedChanges: true }));
    fetchMock.mockResolvedValue(conflict());
    await act(() => hook.result.current.actions.publish());
    expect(hook.result.current.actions.conflict).toBe(true);
    expect(hook.result.current.actions.message).toBe('Bố cục vừa được sửa ở nơi khác. Tải lại để xem bản mới nhất.');
    expect(hook.result.current.state.publishedAt).toBeNull();
  });

  it('reports a stale lock on save too', async () => {
    const hook = setup();
    hideFirst(hook);
    fetchMock.mockResolvedValue(conflict());
    await act(() => hook.result.current.actions.saveDraft());
    expect(hook.result.current.actions.conflict).toBe(true);
    expect(hook.result.current.dirty).toBe(true);
  });
});

describe('restorePrevious', () => {
  it('undoes from the toast with the lock of the layout that was just published', async () => {
    const hook = setup(adminHomeDto({ hasUnpublishedChanges: true }));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ publishedAt: 'P1', previous: { publishedAt: null } }))
      .mockResolvedValueOnce(jsonResponse({ publishedAt: null, previous: { publishedAt: 'P1' } }));
    await act(() => hook.result.current.actions.publish());
    const undo = toast.success.mock.calls.at(-1)![1]!.action!.onClick;
    await waitFor(() => expect(hook.result.current.state.publishedAt).toBe('P1'));
    await act(async () => undo());

    await waitFor(() => expect(hook.result.current.state.publishedAt).toBeNull());
    expect(calls()[1]).toEqual([API_PATHS.admin.homeRestorePrevious, 'POST', { basePublishedAt: 'P1' }]);
    expect(hook.result.current.state).toMatchObject({ usingDefault: true, hasUnpublishedChanges: true });
    expect(hook.result.current.state.previous).toEqual({ publishedAt: 'P1' });
    expect(toast.success).toHaveBeenLastCalledWith('Đã khôi phục bản đăng trước');
  });

  it('says there is nothing to undo when the API reports NO_PREVIOUS', async () => {
    const hook = setup(adminHomeDto({ publishedAt: 'P1', previous: { publishedAt: null }, usingDefault: false }));
    fetchMock.mockResolvedValue(conflict({ previous: 'NO_PREVIOUS' }));
    await act(() => hook.result.current.actions.restorePrevious());
    expect(hook.result.current.actions.message).toBe('Không còn bản đăng trước để khôi phục.');
    expect(hook.result.current.actions.conflict).toBe(false);
    expect(hook.result.current.state.previous).toBeNull();
  });

  it('treats any other 409 as a stale lock', async () => {
    const hook = setup(adminHomeDto({ publishedAt: 'P1', previous: { publishedAt: null }, usingDefault: false }));
    fetchMock.mockResolvedValue(conflict());
    await act(() => hook.result.current.actions.restorePrevious());
    expect(hook.result.current.actions.conflict).toBe(true);
    expect(hook.result.current.state.previous).toEqual({ publishedAt: null });
  });
});

describe('revertDraft and resetToDefault', () => {
  it('replaces the editor content with what the API returns', async () => {
    const hook = setup(adminHomeDto({ hasUnpublishedChanges: true }));
    fetchMock.mockResolvedValue(jsonResponse(adminHomeDto({ draft: [], hasUnpublishedChanges: false })));
    await act(() => hook.result.current.actions.revertDraft());
    expect(calls()[0]).toEqual([API_PATHS.admin.homeRevertDraft, 'POST', undefined]);
    expect(hook.result.current.state.content).toEqual([]);
    expect(toast.success).toHaveBeenLastCalledWith('Đã bỏ thay đổi chưa đăng', {});
  });

  it('offers an undo after a reset only when something was published', async () => {
    const published = setup(adminHomeDto({ publishedAt: 'P1', usingDefault: false }));
    fetchMock.mockImplementation(async () => jsonResponse(adminHomeDto({ previous: { publishedAt: 'P1' } })));
    await act(() => published.result.current.actions.resetToDefault());
    expect(toast.success.mock.calls.at(-1)![1]?.action?.label).toBe('Hoàn tác');

    const neverPublished = setup();
    await act(() => neverPublished.result.current.actions.resetToDefault());
    expect(toast.success.mock.calls.at(-1)![1]?.action).toBeUndefined();
  });
});
