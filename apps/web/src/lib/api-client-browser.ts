import { MEDIA_UPLOAD_FIELD, type MediaKind, type MediaUploadResponse, API_PATHS } from '@under30ss/shared';
import { ApiError, networkError, readApiResponse } from './api-client-error';

export type ApiFetchInit = Omit<RequestInit, 'body'> & {
  /** Serialised as JSON with a content-type header. */
  json?: unknown;
  body?: BodyInit | null;
};

export const apiFetch = async <T>(path: string, init: ApiFetchInit = {}): Promise<T> => {
  const { json, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  finalHeaders.set('accept', 'application/json');
  let body = rest.body;
  if (json !== undefined) {
    finalHeaders.set('content-type', 'application/json');
    body = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetch(path, { credentials: 'same-origin', ...rest, headers: finalHeaders, body });
  } catch (error) {
    throw networkError(error);
  }
  return readApiResponse<T>(response);
};

export const uploadMedia = (file: File, kind: MediaKind, signal?: AbortSignal): Promise<MediaUploadResponse> => {
  const form = new FormData();
  form.append(MEDIA_UPLOAD_FIELD, file);
  return apiFetch<MediaUploadResponse>(`${API_PATHS.admin.media}?kind=${kind}`, {
    method: 'POST',
    body: form,
    ...(signal ? { signal } : {}),
  });
};

export { ApiError };
