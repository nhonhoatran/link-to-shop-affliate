import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NewsletterSubscriberModel } from '../src/models/newsletter-subscriber-model';
import { escapeCsvCell } from '../src/services/newsletter-csv-export';
import { adminApi } from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let api: ReturnType<typeof adminApi>;

beforeAll(async () => {
  testApp = await startTestApp();
  api = adminApi(await loggedInAgent(testApp));
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await NewsletterSubscriberModel.deleteMany({});
});

const seed = (email: string, status: 'subscribed' | 'unsubscribed', createdAt: string) => {
  const at = new Date(createdAt);
  const events: object[] = [{ type: 'subscribe', at, actor: 'self', source: 'home', textVersion: 2, consentText: 'x' }];
  if (status === 'unsubscribed') events.push({ type: 'unsubscribe', at, actor: 'admin' });
  return NewsletterSubscriberModel.collection.insertOne({
    email,
    status,
    source: 'home',
    consentedAt: at,
    consentText: 'x',
    consentTextVersion: 2,
    events,
    createdAt: at,
    updatedAt: at,
  });
};

const download = (query = '') =>
  api
    .get(`/api/admin/newsletter/export${query}`)
    .buffer(true)
    .parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => done(null, Buffer.concat(chunks)));
    });

describe('escapeCsvCell', () => {
  it('prefixes formula starters with a quote, doubles inner quotes and wraps every cell', () => {
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvCell('+84')).toBe(`"'+84"`);
    expect(escapeCsvCell('-2')).toBe(`"'-2"`);
    expect(escapeCsvCell('@cmd')).toBe(`"'@cmd"`);
    expect(escapeCsvCell('\tcell')).toBe(`"'\tcell"`);
    expect(escapeCsvCell('\rcell')).toBe(`"'\rcell"`);
    expect(escapeCsvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(escapeCsvCell('plain')).toBe('"plain"');
  });
});

describe('GET /api/admin/newsletter/export', () => {
  it('streams a BOM-prefixed CSV with Vietnamese headers and safe headers', async () => {
    await seed('anna@example.com', 'subscribed', '2026-11-01T00:00:00Z');
    await seed('+tag@example.com', 'unsubscribed', '2026-11-02T00:00:00Z');
    const response = await download();

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(/^attachment; filename="newsletter-\d{8}\.csv"$/);
    expect(response.headers['cache-control']).toBe('no-store');

    const text = (response.body as Buffer).toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('"Email","Trạng thái","Ngày đăng ký","Cập nhật","Nguồn","Phiên bản câu đồng ý","Lịch sử"');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(`"'+tag@example.com","Đã huỷ"`);
    expect(lines[1]).toContain('unsubscribe 2026-11-02T00:00:00.000Z (admin)');
    expect(lines[2]).toContain('"anna@example.com","Đang nhận"');
    expect(lines[2]).toContain('subscribe 2026-11-01T00:00:00.000Z (self, v2)');
  });

  it('applies the status and q filters', async () => {
    await seed('anna@example.com', 'subscribed', '2026-11-01T00:00:00Z');
    await seed('bob@example.com', 'unsubscribed', '2026-11-02T00:00:00Z');
    const onlyActive = (await download('?status=subscribed')).body as Buffer;
    expect(onlyActive.toString('utf8')).toContain('anna@example.com');
    expect(onlyActive.toString('utf8')).not.toContain('bob@example.com');
    const byFragment = (await download('?q=BOB')).body as Buffer;
    expect(byFragment.toString('utf8')).toContain('bob@example.com');
    expect(byFragment.toString('utf8')).not.toContain('anna@example.com');
  });

  it('returns only the header row for an empty list', async () => {
    const text = ((await download()).body as Buffer).toString('utf8');
    expect(text.slice(1).trimEnd().split('\r\n')).toHaveLength(1);
  });
});
