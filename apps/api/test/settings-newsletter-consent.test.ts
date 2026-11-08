import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SettingsModel } from '../src/models/settings-model';
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
  await SettingsModel.deleteMany({});
});

const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };
const save = (newsletterConsent?: object) =>
  api.put('/api/admin/settings', { ...base, ...(newsletterConsent ? { newsletterConsent } : {}) });
const version = async () => (await api.get('/api/admin/settings')).body.newsletterConsentVersion;

describe('newsletter consent in settings', () => {
  it('reports a null version until a sentence is saved', async () => {
    expect(await version()).toBeNull();
    await save();
    const body = (await api.get('/api/admin/settings')).body;
    expect(body.newsletterConsentVersion).toBeNull();
    expect(body.newsletterConsent).toBeUndefined();
  });

  it('starts at version 1 and returns the saved sentence', async () => {
    const response = await save({ text: 'Đồng ý nhận tin', privacyHref: '/privacy', privacyLabel: 'Bảo mật' });
    expect(response.status).toBe(200);
    expect(response.body.newsletterConsentVersion).toBe(1);
    expect(response.body.newsletterConsent).toEqual({ text: 'Đồng ý nhận tin', privacyHref: '/privacy', privacyLabel: 'Bảo mật' });
  });

  it('bumps the version when the text or the link changes, not when it is saved unchanged', async () => {
    await save({ text: 'A', privacyHref: '/privacy' });
    await save({ text: 'A', privacyHref: '/privacy' });
    expect(await version()).toBe(1);
    await save({ text: 'B', privacyHref: '/privacy' });
    expect(await version()).toBe(2);
    await save({ text: 'B', privacyHref: '/terms' });
    expect(await version()).toBe(3);
    await save({ text: 'B' });
    expect(await version()).toBe(4);
  });

  it('keeps the version when only the link label changes, but stores the label', async () => {
    await save({ text: 'A', privacyHref: '/privacy', privacyLabel: 'Cũ' });
    const response = await save({ text: 'A', privacyHref: '/privacy', privacyLabel: 'Mới' });
    expect(response.body.newsletterConsentVersion).toBe(1);
    expect(response.body.newsletterConsent.privacyLabel).toBe('Mới');
  });

  it('bumps once when two saves of the same new text run at the same time', async () => {
    await save({ text: 'A' });
    await Promise.all([save({ text: 'B' }), save({ text: 'B' })]);
    expect(await version()).toBe(2);
  });

  it('clears the sentence when a save omits the key, keeps the version, and bumps it on re-enable', async () => {
    await save({ text: 'A' });
    const cleared = await save();
    expect(cleared.body.newsletterConsent).toBeUndefined();
    expect(cleared.body.newsletterConsentVersion).toBe(1);
    expect((await supertest(testApp.app).get('/api/public/home')).body.sections).not.toContainEqual(
      expect.objectContaining({ type: 'NewsletterSignup' }),
    );

    const differentText = await save({ text: 'B' });
    expect(differentText.body.newsletterConsentVersion).toBe(2);
    await save();
    const sameText = await save({ text: 'B' });
    expect(sameText.body.newsletterConsentVersion).toBe(3);
  });

  it('rejects an empty sentence and an unsafe link', async () => {
    expect((await save({ text: '   ' })).status).toBe(400);
    expect((await save({ text: 'A', privacyHref: 'javascript:alert(1)' })).status).toBe(400);
    expect(await version()).toBeNull();
  });
});
