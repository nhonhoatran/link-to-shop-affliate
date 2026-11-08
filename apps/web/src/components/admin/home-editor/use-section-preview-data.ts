'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  API_PATHS,
  HOME_SECTION_META,
  HOME_SECTION_TYPES,
  homeSectionSchema,
  type HomeSection,
  type HomeSectionType,
  type PreviewHomeResponse,
  type ResolvedHomeSection,
} from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { apiFetch } from '@/lib/api-client-browser';

// Only these types need data the API resolves (outfits, collections); the rest render straight from what was typed.
const DATA_TYPES: ReadonlySet<HomeSectionType> = new Set(
  HOME_SECTION_TYPES.filter((type) => HOME_SECTION_META[type].resolvesData),
);

// Technical constant: wait for a pause in editing before asking the API again.
export const PREVIEW_DEBOUNCE_MS = 400;

export type PreviewStatus = 'idle' | 'loading' | 'error';

/**
 * Sections ready to render in the preview. Typed text shows at once; resolved data comes from the API and the last
 * answer stays on screen until a newer one arrives.
 */
export function useSectionPreviewData(content: readonly HomeSection[]): {
  sections: ResolvedHomeSection[];
  status: PreviewStatus;
} {
  const redirectToLogin = useRedirectOnUnauthorized();
  const [data, setData] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<PreviewStatus>('idle');

  // A section that is still being filled in (empty slides, blank heading) cannot render, so it is left out.
  const valid = useMemo(() => content.filter((section) => homeSectionSchema.safeParse(section).success), [content]);
  const requestKey = useMemo(
    () => JSON.stringify(valid.filter((section) => section.props.visible && DATA_TYPES.has(section.type))),
    [valid],
  );

  useEffect(() => {
    const needing = JSON.parse(requestKey) as HomeSection[];
    if (needing.length === 0) {
      setStatus('idle');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    const timer = setTimeout(() => {
      apiFetch<PreviewHomeResponse>(API_PATHS.admin.homePreview, {
        method: 'POST',
        json: { content: needing },
        signal: controller.signal,
      })
        .then((response) => {
          const next: Record<string, unknown> = {};
          for (const section of response.sections) if ('data' in section) next[section.props.id] = section.data;
          setData(next);
          setStatus('idle');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || redirectToLogin(error)) return;
          setStatus('error');
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, redirectToLogin]);

  const sections = useMemo(
    () =>
      valid.flatMap((section): ResolvedHomeSection[] => {
        if (!section.props.visible) return [];
        if (!DATA_TYPES.has(section.type)) return [section as ResolvedHomeSection];
        const resolved = data[section.props.id];
        // The API answered for exactly this section id and type, so the pair is a valid resolved section.
        return resolved ? [{ ...section, data: resolved } as ResolvedHomeSection] : [];
      }),
    [valid, data],
  );

  return { sections, status };
}
