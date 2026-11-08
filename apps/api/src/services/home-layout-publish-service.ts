import {
  DEFAULT_HOME_CONTENT,
  type AdminHomeLayoutDto,
  type PublishHomeRequest,
  type PublishHomeResponse,
  type RestorePreviousHomeRequest,
  type RestorePreviousHomeResponse,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { conflict } from '../lib/app-error';
import { HOME_PAGE_KEY, PageLayoutModel } from '../models/page-layout-model';
import {
  CONFLICT_MESSAGE,
  ensureHomeLayout,
  iso,
  loadHomeLayout,
  parseLockDate,
  previousInfo,
  toAdminHomeDto,
  type PageLayoutRecord,
} from './home-layout-service';

const NO_PREVIOUS_MESSAGE = 'Chưa có bản đăng trước để hoàn tác';
const CURRENT_AS_PREVIOUS = { published: '$published', publishedAt: '$publishedAt' };

// The three writes below are single pipeline updates: swapping published and previous reads the old values of
// both fields, and the filter on the lock field makes a concurrent writer lose cleanly.

export interface PublishOutcome {
  result: PublishHomeResponse;
  /** False when the draft already equals the published version, so nothing was written. */
  changed: boolean;
}

/**
 * Keeps exactly one earlier version (`previous`), which is what the undo action restores. Publishing a draft that
 * already equals the published version is a no-op, otherwise a retry or a second tab would overwrite `previous`
 * with an identical copy and lose the real earlier version.
 */
export const publishHome = async (request: PublishHomeRequest): Promise<PublishOutcome> => {
  const base = parseLockDate(request.baseUpdatedAt, 'baseUpdatedAt');
  await ensureHomeLayout();
  const now = new Date();
  const updated = await PageLayoutModel.findOneAndUpdate(
    { pageKey: HOME_PAGE_KEY, draftUpdatedAt: base, $expr: { $ne: ['$draft', '$published'] } },
    [{ $set: { previous: CURRENT_AS_PREVIOUS, published: '$draft', publishedAt: now } }],
    { returnDocument: 'after', updatePipeline: true },
  ).lean<PageLayoutRecord>();
  if (updated) return { result: { publishedAt: now.toISOString(), previous: previousInfo(updated) }, changed: true };
  const current = await loadHomeLayout();
  const unchanged = current?.published && current.draftUpdatedAt?.getTime() === base?.getTime();
  if (!current || !unchanged) throw conflict(CONFLICT_MESSAGE);
  return { result: { publishedAt: iso(current.publishedAt)!, previous: previousInfo(current) }, changed: false };
};

/** Swaps published and previous; the draft is left alone so the editor still shows unpublished edits. */
export const restorePreviousHome = async (request: RestorePreviousHomeRequest): Promise<RestorePreviousHomeResponse> => {
  const base = parseLockDate(request.basePublishedAt, 'basePublishedAt');
  await ensureHomeLayout();
  const updated = await PageLayoutModel.findOneAndUpdate(
    { pageKey: HOME_PAGE_KEY, publishedAt: base, previous: { $ne: null } },
    [
      {
        $set: {
          published: '$previous.published',
          publishedAt: '$previous.publishedAt',
          previous: CURRENT_AS_PREVIOUS,
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true },
  ).lean<PageLayoutRecord>();
  if (updated) return { publishedAt: iso(updated.publishedAt), previous: previousInfo(updated) };
  const current = await loadHomeLayout();
  if (!current?.previous) throw conflict(NO_PREVIOUS_MESSAGE, { previous: 'NO_PREVIOUS' });
  throw conflict(CONFLICT_MESSAGE);
};

/** The current published version stays restorable; only the draft is discarded. */
export const resetHome = async (env: Env): Promise<AdminHomeLayoutDto> => {
  await ensureHomeLayout();
  const updated = await PageLayoutModel.findOneAndUpdate(
    { pageKey: HOME_PAGE_KEY },
    [
      {
        $set: {
          previous: { $cond: [{ $ne: ['$published', null] }, CURRENT_AS_PREVIOUS, '$previous'] },
          published: null,
          publishedAt: null,
          draft: { $literal: { content: DEFAULT_HOME_CONTENT } },
          draftUpdatedAt: new Date(),
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true },
  ).lean<PageLayoutRecord>();
  return toAdminHomeDto(updated, env);
};
