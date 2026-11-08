import {
  DEFAULT_HOME_CONTENT,
  HOME_LAYOUT_SCHEMA_VERSION,
  homeSectionSchema,
  type AdminHomeLayoutDto,
  type HomeLayoutContent,
  type HomePreviousInfo,
  type PreviewHomeResponse,
  type SaveHomeDraftRequest,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest, conflict } from '../lib/app-error';
import { HOME_PAGE_KEY, PageLayoutModel, type PageLayoutDoc } from '../models/page-layout-model';
import { assertHomeLayoutLimits } from './home-layout-guards';
import { attachSectionImageUrls } from './home-section-image-mapper';
import { resolveHomeSections } from './home-section-resolver-service';
import { createMediaUrlResolver } from './outfit-mapper';

export type PageLayoutRecord = PageLayoutDoc;

export const loadHomeLayout = (): Promise<PageLayoutRecord | null> =>
  PageLayoutModel.findOne({ pageKey: HOME_PAGE_KEY }).lean<PageLayoutRecord>();

/** Sections that no longer match the schema are dropped, so a schema change never takes the home page down. */
export const parseStoredContent = (raw: unknown): HomeLayoutContent => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry, index) => {
    const parsed = homeSectionSchema.safeParse(entry);
    if (parsed.success) return [parsed.data];
    console.warn(`[home-layout] dropped invalid stored section at index ${index}`);
    return [];
  });
};

export const defaultHomeContent = (): HomeLayoutContent => parseStoredContent(DEFAULT_HOME_CONTENT);

/** null when the site is still on the built-in default layout. */
export const publishedHomeContent = (layout: PageLayoutRecord | null): HomeLayoutContent | null =>
  layout?.published ? parseStoredContent(layout.published.content) : null;

export const parseLockDate = (value: string | null, field: string): Date | null => {
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest('Dữ liệu không hợp lệ', { [field]: 'Thời điểm không hợp lệ' });
  return date;
};

export const CONFLICT_MESSAGE = 'Bố cục trang chủ đã được thay đổi ở nơi khác, vui lòng tải lại trang';

const isDuplicateKey = (error: unknown): boolean => (error as { code?: number }).code === 11000;

/** Every write targets the single `home` document, so make sure it exists before the conditional update. */
export const ensureHomeLayout = async (): Promise<void> => {
  try {
    await PageLayoutModel.updateOne(
      { pageKey: HOME_PAGE_KEY },
      {
        $setOnInsert: {
          draft: { content: DEFAULT_HOME_CONTENT },
          draftUpdatedAt: null,
          published: null,
          publishedAt: null,
          previous: null,
          schemaVersion: HOME_LAYOUT_SCHEMA_VERSION,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // A concurrent request created it first.
    if (!isDuplicateKey(error)) throw error;
  }
};

export const iso = (date: Date | null | undefined): string | null => (date ? date.toISOString() : null);

export const previousInfo = (layout: PageLayoutRecord | null): HomePreviousInfo =>
  layout?.previous ? { publishedAt: iso(layout.previous.publishedAt) } : null;

export const toAdminHomeDto = (layout: PageLayoutRecord | null, env: Env): AdminHomeLayoutDto => {
  const resolveUrl = createMediaUrlResolver(env);
  const draft = layout ? parseStoredContent(layout.draft.content) : defaultHomeContent();
  const published = publishedHomeContent(layout) ?? defaultHomeContent();
  return {
    draft: draft.map((section) => attachSectionImageUrls(section, resolveUrl)),
    draftUpdatedAt: iso(layout?.draftUpdatedAt),
    publishedAt: iso(layout?.publishedAt),
    previous: previousInfo(layout),
    hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published),
    usingDefault: !layout?.published,
  };
};

export const getAdminHome = async (env: Env): Promise<AdminHomeLayoutDto> => toAdminHomeDto(await loadHomeLayout(), env);

export const saveHomeDraft = async (request: SaveHomeDraftRequest, env: Env): Promise<AdminHomeLayoutDto> => {
  const content = assertHomeLayoutLimits(request.content, env);
  const base = parseLockDate(request.baseUpdatedAt, 'baseUpdatedAt');
  await ensureHomeLayout();
  const updated = await PageLayoutModel.findOneAndUpdate(
    { pageKey: HOME_PAGE_KEY, draftUpdatedAt: base },
    { $set: { draft: { content }, draftUpdatedAt: new Date() } },
    { returnDocument: 'after' },
  ).lean<PageLayoutRecord>();
  if (!updated) throw conflict(CONFLICT_MESSAGE);
  return toAdminHomeDto(updated, env);
};

export const revertHomeDraft = async (env: Env): Promise<AdminHomeLayoutDto> => {
  await ensureHomeLayout();
  const updated = await PageLayoutModel.findOneAndUpdate(
    { pageKey: HOME_PAGE_KEY },
    [{ $set: { draft: { $ifNull: ['$published', { $literal: { content: DEFAULT_HOME_CONTENT } }] }, draftUpdatedAt: new Date() } }],
    { returnDocument: 'after', updatePipeline: true },
  ).lean<PageLayoutRecord>();
  return toAdminHomeDto(updated, env);
};

export const previewSavedHomeDraft = async (env: Env): Promise<PreviewHomeResponse> => {
  const layout = await loadHomeLayout();
  return { sections: await resolveHomeSections(layout ? parseStoredContent(layout.draft.content) : defaultHomeContent(), env) };
};

export const previewHomeContent = async (content: HomeLayoutContent, env: Env): Promise<PreviewHomeResponse> => ({
  sections: await resolveHomeSections(assertHomeLayoutLimits(content, env), env),
});
