import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { approvedDesktopDraftSchema, desktopDraftSchema } from './desktop-session-schema';
import { DEFAULT_CODEX_MODEL, DEFAULT_DESKTOP_SETTINGS, desktopSettingsSchema, resolveCodexModel, websiteOriginSchema } from './desktop-settings-schema';
import { desktopCommandSchemas } from './desktop-ipc-contract';
import { DESKTOP_IMPORT_VERSION, importCommitSchema, serializeImportPayload } from './desktop-import-contract';

const draft = () => ({ title: 'Trang phục', slug: 'trang-phuc', seoDescription: '',
  collection: { name: 'Bộ sưu tập', slug: 'bo-suu-tap', description: '' },
  modelCrop: { x: 25, y: 10, width: 50, height: 80 }, reviewReasons: [],
  items: [{ id: 'one', name: 'Áo', subtitle: '', description: '', side: 'left', order: 0,
    crop: { x: 0, y: 0, width: 10, height: 10 }, sourceAnchor: null, affiliateUrl: '', reviewReasons: [] }],
});
const content = () => ({ contractVersion: DESKTOP_IMPORT_VERSION,
  collection: { name: 'Bộ sưu tập', slug: 'bo-suu-tap', coverMediaId: 'model-a' },
  outfit: { title: 'Trang phục', slug: 'trang-phuc', modelMediaId: 'model-a',
    items: [{ id: 'shirt-a', name: 'Áo', mediaId: 'item-a', side: 'left', order: 0, affiliateUrl: '' }] },
});

describe('desktop settings and IPC contracts', () => {
  it.each(['https://example.test', 'https://example.test:8443/', 'http://localhost:4000', 'http://127.0.0.1:4000', 'http://[::1]:4000', ''])('accepts permitted origin %s', (origin) => {
    expect(websiteOriginSchema.safeParse(origin).success).toBe(true);
  });
  it.each(['http://example.test', 'http://localhost.evil.test', 'file:///tmp/site', 'javascript:alert(1)',
    'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?token=secret', 'https://example.test/#section'])('blocks unsafe origin %s', (origin) => {
    expect(websiteOriginSchema.safeParse(origin).success).toBe(false);
  });
  it('has an editable complete prompt and configurable operational defaults', () => {
    expect(DEFAULT_DESKTOP_SETTINGS.prompt.text.length).toBeGreaterThan(100);
    expect(DEFAULT_DESKTOP_SETTINGS.cli.model).toBe(DEFAULT_CODEX_MODEL);
    expect(resolveCodexModel('')).toBe(DEFAULT_CODEX_MODEL);
    expect(resolveCodexModel('gpt-6-astra')).toBe(DEFAULT_CODEX_MODEL);
    expect(resolveCodexModel('chosen-model')).toBe('chosen-model');
    const settings = desktopSettingsSchema.parse({ cli: { model: 'chosen-model' },
      prompt: { text: 'Phân tích theo bố cục khác' }, limits: { maxFiles: 3, pageSize: 2 } });
    expect(settings.cli.model).toBe('chosen-model');
    expect(settings.limits).toMatchObject({ maxFiles: 3, pageSize: 2 });
    expect(settings.prompt.text).toBe('Phân tích theo bố cục khác');
  });
  it('rejects token persistence inside settings and invalid limits', () => {
    expect(desktopSettingsSchema.safeParse({ token: 'secret' }).success).toBe(false);
    expect(desktopSettingsSchema.safeParse({ limits: { maxFiles: 0 } }).success).toBe(false);
    expect(desktopSettingsSchema.safeParse({ limits: { maxSourcePixels: Infinity } }).success).toBe(false);
  });
  it('requires a folder selection capability instead of accepting a filesystem path', () => {
    expect(desktopCommandSchemas.createSession.input.safeParse({ folder: 'C:\\private', name: 'Import' }).success).toBe(false);
    expect(desktopCommandSchemas.listFiles.input.safeParse({ sessionId: '../escape', page: 1, size: 2 }).success).toBe(false);
    expect(desktopCommandSchemas.listSessions.input.safeParse({ page: 0, size: 1000 }).success).toBe(false);
  });
  it('keeps malformed geometry out of an update request', () => {
    const value = draft(); value.items[0]!.crop.width = 101;
    expect(desktopCommandSchemas.updateDraft.input.safeParse({ sessionId: 'session', fileId: 'file', expectedRevision: 1, draft: value }).success).toBe(false);
  });
});

describe('review and import contract', () => {
  it('allows incomplete local drafts but requires reviewed names, slugs and crops', () => {
    const incomplete = { ...draft(), title: '', modelCrop: null, items: [{ ...draft().items[0], name: '', crop: null }] };
    expect(desktopDraftSchema.safeParse(incomplete).success).toBe(true);
    expect(approvedDesktopDraftSchema.safeParse(incomplete).success).toBe(false);
    expect(approvedDesktopDraftSchema.safeParse(draft()).success).toBe(true);
  });
  it('permits an unknown anchor in a web draft but rejects an anchor outside its crop', () => {
    expect(approvedDesktopDraftSchema.safeParse(draft()).success).toBe(true);
    const value = { ...draft(), items: [{ ...draft().items[0], sourceAnchor: { x: 5, y: 5 } }] };
    expect(approvedDesktopDraftSchema.safeParse(value).success).toBe(false);
  });
  it('does not accept publish flags or arbitrary storage references from the importer', () => {
    expect(importCommitSchema.safeParse({ ...content(), payloadHash: 'a'.repeat(64), status: 'published' }).success).toBe(false);
    expect(importCommitSchema.safeParse({ ...content(), payloadHash: 'a'.repeat(64), outfit: { ...content().outfit, modelImage: { key: 'public/other.png', width: 1, height: 1 } } }).success).toBe(false);
  });
  it('uses a stable canonical payload hash independent of JSON property insertion order', () => {
    const first = content();
    const second = { outfit: { ...first.outfit, items: [...first.outfit.items] }, collection: first.collection, contractVersion: first.contractVersion };
    expect(serializeImportPayload(first)).toBe(serializeImportPayload(second));
    const hash = (value: unknown) => createHash('sha256').update(serializeImportPayload(value)).digest('hex');
    expect(hash(first)).toBe(hash(second));
    expect(hash({ ...first, outfit: { ...first.outfit, title: 'Tiêu đề khác' } })).not.toBe(hash(first));
  });
  it('rejects duplicate imported item IDs and duplicate ordering per column', () => {
    const value = content(); value.outfit.items.push({ ...value.outfit.items[0]! });
    expect(importCommitSchema.safeParse({ ...value, payloadHash: 'a'.repeat(64) }).success).toBe(false);
    value.outfit.items[1]!.id = 'different';
    expect(importCommitSchema.safeParse({ ...value, payloadHash: 'a'.repeat(64) }).success).toBe(false);
  });
});
