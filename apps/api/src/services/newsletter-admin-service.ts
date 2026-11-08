import type { z } from 'zod';
import type {
  adminNewsletterListQuerySchema,
  AdminNewsletterListResponse,
  AdminNewsletterSubscriberDto,
  NewsletterConsentEventDto,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { escapeRegex } from '../lib/mongo-query-helpers';
import { isObjectId } from '../lib/object-id';
import {
  NewsletterSubscriberModel,
  type NewsletterEventDoc,
  type NewsletterSubscriberRecord,
} from '../models/newsletter-subscriber-model';

type ListQuery = z.output<typeof adminNewsletterListQuerySchema>;

const toEventDto = (event: NewsletterEventDoc): NewsletterConsentEventDto => ({
  type: event.type,
  at: event.at.toISOString(),
  actor: event.actor,
  ...(event.source ? { source: event.source } : {}),
  ...(event.textVersion ? { textVersion: event.textVersion } : {}),
});

const toDto = (record: NewsletterSubscriberRecord): AdminNewsletterSubscriberDto => ({
  id: String(record._id),
  email: record.email,
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  events: record.events.map(toEventDto),
});

export const buildNewsletterFilter = (query: Pick<ListQuery, 'q' | 'status'>): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.q) filter.email = new RegExp(escapeRegex(query.q.toLowerCase()));
  return filter;
};

export const listNewsletterSubscribers = async (query: ListQuery, env: Env): Promise<AdminNewsletterListResponse> => {
  const size = Math.min(query.size ?? env.ADMIN_PAGE_SIZE_DEFAULT, env.ADMIN_PAGE_SIZE_MAX);
  const filter = buildNewsletterFilter(query);
  const [records, total] = await Promise.all([
    NewsletterSubscriberModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<NewsletterSubscriberRecord[]>(),
    NewsletterSubscriberModel.countDocuments(filter),
  ]);
  return { items: records.map(toDto), total, page: query.page, size };
};

/** Idempotent: an already unsubscribed address keeps its history untouched. */
export const unsubscribeByAdmin = async (id: string): Promise<AdminNewsletterSubscriberDto | null> => {
  if (!isObjectId(id)) return null;
  const at = new Date();
  await NewsletterSubscriberModel.updateOne(
    { _id: id, status: 'subscribed' },
    {
      $set: { status: 'unsubscribed', unsubscribedAt: at },
      $push: { events: { type: 'unsubscribe', at, actor: 'admin' } },
    },
  );
  const record = await NewsletterSubscriberModel.findById(id).lean<NewsletterSubscriberRecord>();
  return record ? toDto(record) : null;
};

const maskEmail = (email: string): string => {
  const at = email.indexOf('@');
  return at > 0 ? `${email[0]}***${email.slice(at)}` : '***';
};

export const deleteNewsletterSubscriber = async (id: string): Promise<boolean> => {
  if (!isObjectId(id)) return false;
  const removed = await NewsletterSubscriberModel.findByIdAndDelete(id).lean<NewsletterSubscriberRecord>();
  if (!removed) return false;
  console.info(`[api] newsletter subscriber deleted: ${maskEmail(removed.email)}`);
  return true;
};
