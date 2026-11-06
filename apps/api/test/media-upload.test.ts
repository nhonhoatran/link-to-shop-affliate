import sharp from 'sharp';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SettingsModel } from '../src/models/settings-model';
import { getUploadMaxMb } from '../src/services/settings-service';
import { TEST_ORIGIN, loggedInAgent, makePng, startTestApp, type TestApp } from './helpers/test-app';

const BYTES_PER_MB = 1024 * 1024;

// Gaussian noise does not compress, so the PNG stays large without a huge canvas.
const noisePng = (edge: number): Promise<Buffer> =>
  sharp({ create: { width: edge, height: edge, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 60 } } })
    .png()
    .toBuffer();

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;

beforeAll(async () => {
  testApp = await startTestApp({ IMAGE_MAX_EDGE_ITEM: '300', IMAGE_MAX_EDGE_MODEL: '500', WEBP_QUALITY: '80', UPLOAD_MAX_MB: '1' });
  agent = await loggedInAgent(testApp);
});

afterAll(async () => {
  await testApp.stop();
});

const upload = (kind: string, file: Buffer, filename = 'photo.png') =>
  agent.post(`/api/admin/media?kind=${kind}`).set('Origin', TEST_ORIGIN).attach('file', file, filename);

describe('media upload', () => {
  it('converts a PNG with alpha to WebP with alpha and stores it with the right S3 input', async () => {
    const response = await upload('item', await makePng(600, 400, 0.5));
    expect(response.status).toBe(201);
    expect(response.body.key).toMatch(/^public\/item\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
    expect(response.body).toMatchObject({ width: 300, height: 200 });
    expect(response.body.url).toBe(`http://cdn.test/media/${response.body.key}`);

    const put = testApp.s3Puts.at(-1)!;
    expect(put).toMatchObject({
      Bucket: 'under30ss-test',
      Key: response.body.key,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    });
    const stored = sharp(put.Body as Buffer);
    const meta = await stored.metadata();
    expect(meta).toMatchObject({ format: 'webp', hasAlpha: true, width: 300, height: 200 });
    expect(meta.exif).toBeUndefined();
  });

  it('applies the model edge limit and never enlarges small images', async () => {
    const large = await upload('model', await makePng(2000, 1000));
    expect(large.body).toMatchObject({ width: 500, height: 250 });
    const small = await upload('model', await makePng(100, 80));
    expect(small.body).toMatchObject({ width: 100, height: 80 });
  });

  it('accepts JPEG and ignores the uploaded file name', async () => {
    const jpeg = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#336699' } }).jpeg().toBuffer();
    const response = await upload('item', jpeg, '../../etc/passwd.jpg');
    expect(response.status).toBe(201);
    expect(response.body.key).not.toContain('passwd');
  });

  it('rejects a fake image, a bad kind, a missing file and anonymous callers', async () => {
    const fake = await upload('item', Buffer.from('definitely not an image'), 'fake.png');
    expect(fake.status).toBe(400);
    expect(fake.body.error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { file: expect.any(String) } });

    const badKind = await upload('banner', await makePng(10, 10));
    expect(badKind.status).toBe(400);
    expect(badKind.body.error.fields).toHaveProperty('kind');

    const missing = await agent.post('/api/admin/media?kind=item').set('Origin', TEST_ORIGIN);
    expect(missing.status).toBe(400);

    const anonymous = await supertest(testApp.app)
      .post('/api/admin/media?kind=item')
      .set('Origin', TEST_ORIGIN)
      .attach('file', await makePng(10, 10), 'a.png');
    expect(anonymous.status).toBe(401);
  });

  it('rejects SVG, GIF and truncated images with a 400 on the file field, never a 500', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#336699' } }).gif().toBuffer();
    const truncated = (await makePng(400, 400)).subarray(0, 60);
    for (const [file, name] of [[svg, 'a.svg'], [gif, 'a.gif'], [truncated, 'cut.png']] as const) {
      const response = await upload('item', file, name);
      expect(response.status, name).toBe(400);
      expect(response.body.error, name).toMatchObject({ code: 'VALIDATION_ERROR', fields: { file: expect.any(String) } });
    }
  });

  it('enforces the env size limit, and a larger limit saved in settings lifts it', async () => {
    const noisyPng = await noisePng(1000);
    expect(noisyPng.length).toBeGreaterThan(BYTES_PER_MB);
    expect(noisyPng.length).toBeLessThan(5 * BYTES_PER_MB);

    const blocked = await upload('item', noisyPng);
    expect(blocked.status).toBe(413);
    expect(blocked.body.error.code).toBe('PAYLOAD_TOO_LARGE');

    await SettingsModel.updateOne({ singleton: 'site' }, { $set: { uploadMaxMb: 5 } }, { upsert: true });
    expect((await upload('item', noisyPng)).status).toBe(201);
    await SettingsModel.deleteMany({});
  });

  it('never trusts a stored limit above the env ceiling', async () => {
    await SettingsModel.updateOne({ singleton: 'site' }, { $set: { uploadMaxMb: 9999 } }, { upsert: true });
    expect(await getUploadMaxMb(testApp.env)).toBe(testApp.env.UPLOAD_MAX_MB_CEILING);
    await SettingsModel.deleteMany({});
  });
});
