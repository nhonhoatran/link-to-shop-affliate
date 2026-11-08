import { once } from 'node:events';
import type { Response } from 'express';
import { NewsletterSubscriberModel } from '../models/newsletter-subscriber-model';
import type { NewsletterEventDoc, NewsletterSubscriberRecord } from '../models/newsletter-subscriber-model';

const BOM = '﻿';
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const HEADER = ['Email', 'Trạng thái', 'Ngày đăng ký', 'Cập nhật', 'Nguồn', 'Phiên bản câu đồng ý', 'Lịch sử'];
const STATUS_LABEL = { subscribed: 'Đang nhận', unsubscribed: 'Đã huỷ' } as const;

/** Quotes every cell and neutralises spreadsheet formulas (OWASP CSV injection). */
export const escapeCsvCell = (value: string): string => {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsvLine = (cells: string[]): string => `${cells.map(escapeCsvCell).join(',')}\r\n`;

const describeEvent = (event: NewsletterEventDoc): string =>
  `${event.type} ${event.at.toISOString()} (${event.actor}${event.textVersion ? `, v${event.textVersion}` : ''})`;

export const subscriberToCsvLine = (record: NewsletterSubscriberRecord): string =>
  toCsvLine([
    record.email,
    STATUS_LABEL[record.status],
    record.createdAt.toISOString(),
    record.updatedAt.toISOString(),
    record.source,
    String(record.consentTextVersion),
    record.events.map(describeEvent).join('; '),
  ]);

const write = async (res: Response, chunk: string): Promise<void> => {
  if (!res.write(chunk)) await Promise.race([once(res, 'drain'), once(res, 'close')]);
};

/** Streams from a cursor so a large list never sits in memory; stops quietly when the client goes away. */
export const streamNewsletterCsv = async (res: Response, filter: Record<string, unknown>, now = new Date()): Promise<void> => {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  res.status(200);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="newsletter-${stamp}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  const cursor = NewsletterSubscriberModel.find(filter).sort({ createdAt: -1, _id: -1 }).lean<NewsletterSubscriberRecord[]>().cursor();
  try {
    await write(res, BOM + toCsvLine(HEADER));
    for await (const record of cursor) {
      if (res.destroyed) return;
      await write(res, subscriberToCsvLine(record));
    }
    res.end();
  } finally {
    await cursor.close();
  }
};
