import { DEFAULT_ANNOUNCEMENT, DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { SettingsModel } from '../src/models/settings-model';
import { adminApi, createCollectionVia, type Agent } from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Agent;
let api: ReturnType<typeof adminApi>;
const publicSettings = async () => (await supertest(testApp.app).get('/api/public/settings')).body;

beforeAll(async () => {
  testApp = await startTestApp();
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([SettingsModel.deleteMany({}), CollectionModel.deleteMany({})]);
  testApp.revalidateHits.length = 0;
});

const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };
const save = (body: object) => api.put('/api/admin/settings', { ...base, ...body });

const footer = {
  columns: [{ title: 'Hỗ trợ', links: [{ label: 'Liên hệ', href: '/contact' }] }],
  social: [{ label: 'Instagram', href: 'https://instagram.com/shop' }],
};

describe('footer', () => {
  it('saves, returns it to admin and serves it publicly', async () => {
    const response = await save({ footer });
    expect(response.status).toBe(200);
    expect(response.body.footer).toEqual(footer);
    expect((await publicSettings()).footer).toEqual(footer);
  });

  it('serves an empty footer when none is stored', async () => {
    expect((await publicSettings()).footer).toEqual({ columns: [], social: [] });
    expect((await api.get('/api/admin/settings')).body).not.toHaveProperty('footer');
  });

  it('rejects unsafe links with the field path', async () => {
    const bad = await save({ footer: { columns: [{ title: 'X', links: [{ label: 'Bad', href: 'javascript:alert(1)' }] }], social: [] } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toHaveProperty(['footer.columns.0.links.0.href']);
    const social = await save({ footer: { columns: [], social: [{ label: 'Bad', href: '/internal' }] } });
    expect(social.status).toBe(400);
    expect(social.body.error.fields).toHaveProperty(['footer.social.0.href']);
  });
});

describe('collections navigation', () => {
  it('stays hidden until a collection is published, then follows the toggle', async () => {
    expect(await publicSettings()).toMatchObject({ collectionsNavVisible: false, collectionsLabel: DEFAULT_COLLECTIONS_LABEL });

    await createCollectionVia(agent, { slug: 'draft-one', status: 'draft', coverImage: undefined });
    expect((await publicSettings()).collectionsNavVisible).toBe(false);

    await createCollectionVia(agent, { slug: 'live-one' });
    expect((await publicSettings()).collectionsNavVisible).toBe(true);

    await save({ collectionsNavEnabled: false });
    expect((await publicSettings()).collectionsNavVisible).toBe(false);
    await save({ collectionsNavEnabled: true, collectionsLabel: 'Bộ sưu tập mùa hè' });
    expect(await publicSettings()).toMatchObject({ collectionsNavVisible: true, collectionsLabel: 'Bộ sưu tập mùa hè' });
  });

  it('returns the stored values to admin and clears them when omitted', async () => {
    const saved = await save({ collectionsNavEnabled: false, collectionsLabel: 'Mùa hè' });
    expect(saved.body).toMatchObject({ collectionsNavEnabled: false, collectionsLabel: 'Mùa hè' });
    const cleared = await save({});
    expect(cleared.body).not.toHaveProperty('collectionsNavEnabled');
    expect(cleared.body).not.toHaveProperty('collectionsLabel');
  });
});

describe('announcement', () => {
  const announcement = { enabled: true, text: 'Miễn phí vận chuyển', linkLabel: 'Xem ngay', href: '/looks' };

  it('is null publicly by default and the default object for admin', async () => {
    expect((await publicSettings()).announcement).toBeNull();
    expect((await api.get('/api/admin/settings')).body.announcement).toEqual(DEFAULT_ANNOUNCEMENT);
  });

  it('turns on and off, serving an object or null', async () => {
    const on = await save({ announcement });
    expect(on.status).toBe(200);
    expect(on.body.announcement).toEqual(announcement);
    expect((await publicSettings()).announcement).toEqual({ text: 'Miễn phí vận chuyển', linkLabel: 'Xem ngay', href: '/looks' });

    await save({ announcement: { ...announcement, enabled: false } });
    expect((await publicSettings()).announcement).toBeNull();
    expect((await api.get('/api/admin/settings')).body.announcement).toMatchObject({ enabled: false, text: 'Miễn phí vận chuyển' });
  });

  it('rejects a javascript: link and an enabled announcement without text', async () => {
    const unsafe = await save({ announcement: { ...announcement, href: 'javascript:alert(1)' } });
    expect(unsafe.status).toBe(400);
    expect(unsafe.body.error.fields).toHaveProperty(['announcement.href']);
    const empty = await save({ announcement: { enabled: true, text: '   ' } });
    expect(empty.status).toBe(400);
    expect(empty.body.error.fields).toHaveProperty(['announcement.text']);
  });

  it('goes back to the default when a later save omits it (full replace)', async () => {
    await save({ announcement });
    const replaced = await save({});
    expect(replaced.body.announcement).toEqual(DEFAULT_ANNOUNCEMENT);
    expect((await publicSettings()).announcement).toBeNull();
  });

  it('refreshes every page when settings are saved', async () => {
    await save({ announcement });
    expect(testApp.revalidateHits.at(-1)).toMatchObject({ scope: 'all' });
  });
});
