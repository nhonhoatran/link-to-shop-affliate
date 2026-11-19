import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CODEX_MODEL, DEFAULT_POSTER_PROMPT, DEFAULT_POSTER_PROMPT_VERSION } from '@under30ss/shared';
import { SettingsStore } from '../../src/main/settings-store';
import { cleanupDirectories, settingsFixture, temporaryDirectory, testEncryption } from './test-fixtures';

afterEach(cleanupDirectories);
const token = 'imp_test_website_credential_0123456789abcdef';

describe('OS credential boundary', () => {
  it('persists only encrypted bytes and exposes a mask in renderer settings', async () => {
    const directory = await temporaryDirectory();
    const encryption = testEncryption();
    const store = new SettingsStore(directory, encryption);
    const settings = settingsFixture(); settings.siteUrl = 'https://website.test/';
    const view = await store.save(settings, token);
    expect(view.settings.siteUrl).toBe('https://website.test');
    expect(view.credential).toMatchObject({ configured: true, mask: '••••cdef', origin: 'https://website.test' });
    expect(JSON.stringify(view)).not.toContain(token);
    expect(await readFile(path.join(directory, 'settings.json'), 'utf8')).not.toContain(token);
    expect(await readFile(path.join(directory, 'credential.json'), 'utf8')).not.toContain(token);
    const restarted = new SettingsStore(directory, encryption);
    expect(await restarted.connection()).toMatchObject({ origin: 'https://website.test', token });
  });
  it('clears the saved credential when changing website origin', async () => {
    const store = new SettingsStore(await temporaryDirectory(), testEncryption());
    const settings = settingsFixture(); settings.siteUrl = 'https://first.test';
    await store.save(settings, token);
    settings.siteUrl = 'https://second.test';
    expect((await store.save(settings)).credential.configured).toBe(false);
    await expect(store.connection()).rejects.toThrow('đúng website');
    settings.siteUrl = 'https://first.test'; await store.save(settings);
    await expect(store.connection()).rejects.toThrow('đúng website');
  });
  it('fails closed when OS encryption is unavailable or the credential belongs to another OS account', async () => {
    const directory = await temporaryDirectory();
    const settings = settingsFixture(); settings.siteUrl = 'https://website.test';
    const unavailable = { available: () => false, encrypt: () => Buffer.alloc(0), decrypt: () => token };
    await expect(new SettingsStore(directory, unavailable).save(settings, token)).rejects.toThrow('mã hóa token an toàn');
    await new SettingsStore(directory, testEncryption()).save(settings, token);
    await expect(new SettingsStore(directory, testEncryption()).connection()).rejects.toThrow('Không giải mã');
  });
  it('requires an origin, rejects contradictory token actions and supports explicit removal', async () => {
    const directory = await temporaryDirectory();
    const store = new SettingsStore(directory, testEncryption());
    const settings = settingsFixture();
    await expect(store.save(settings, token)).rejects.toThrow('URL website');
    settings.siteUrl = 'http://localhost:4000';
    await expect(store.save(settings, token, true)).rejects.toThrow('vừa xóa vừa lưu');
    await store.save(settings, token);
    await writeFile(path.join(directory, 'credential.json.bak'), await readFile(path.join(directory, 'credential.json')));
    await store.save(settings, undefined, true);
    await expect(readFile(path.join(directory, 'credential.json.bak'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await store.view()).credential.mask).toBeNull();
  });
  it('never resurrects a cleared token from an encrypted backup after primary corruption', async () => {
    const directory = await temporaryDirectory(); const encryption = testEncryption();
    const store = new SettingsStore(directory, encryption);
    const settings = settingsFixture(); settings.siteUrl = 'https://website.test';
    await store.save(settings, token); await store.save(settings, undefined, true);
    await writeFile(path.join(directory, 'credential.json'), '{interrupted');
    const reopened = new SettingsStore(directory, encryption);
    const configured = await reopened.view().then((view) => view.credential.configured, () => false);
    expect(configured).toBe(false);
    await expect(reopened.connection()).rejects.toThrow();
  });
  it('lets a corrupt credential be replaced or explicitly cleared without recovering an old secret', async () => {
    const directory = await temporaryDirectory(); const store = new SettingsStore(directory, testEncryption());
    const settings = settingsFixture(); settings.siteUrl = 'https://website.test';
    await store.save(settings, token);
    await writeFile(path.join(directory, 'credential.json'), '{corrupt');
    const broken = await store.view();
    expect(broken.credential.configured).toBe(false);
    expect(broken.credential.warning).toContain('không đọc được');
    const replacement = `${token}-replacement`;
    expect((await store.save(settings, replacement)).credential.configured).toBe(true);
    expect((await store.connection()).token).toBe(replacement);
    expect(await readFile(path.join(directory, 'credential.json'), 'utf8')).not.toContain(replacement);
    await writeFile(path.join(directory, 'credential.json'), '{corrupt-again');
    expect((await store.save(settings, undefined, true)).credential.configured).toBe(false);
    await expect(store.connection()).rejects.toThrow();
  });
  it('versions prompt overrides deterministically and restores the default version', async () => {
    const store = new SettingsStore(await temporaryDirectory(), testEncryption());
    const settings = settingsFixture(); settings.prompt.text = 'Prompt chỉnh theo cấu trúc khác';
    const edited = await store.save(settings);
    expect(edited.settings.prompt.version).toMatch(/^vi-poster\.v1\+[a-f0-9]{12}$/);
    expect((await store.save(settings)).settings.prompt.version).toBe(edited.settings.prompt.version);
    settings.prompt.text = DEFAULT_POSTER_PROMPT;
    expect((await store.save(settings)).settings.prompt.version).toBe(DEFAULT_POSTER_PROMPT_VERSION);
  });
  it.each(['', 'gpt-6-astra'])('migrates the old default Codex model %s to the supported model', async (legacyModel) => {
    const directory = await temporaryDirectory();
    const settings = settingsFixture(); settings.cli.model = legacyModel;
    await writeFile(path.join(directory, 'settings.json'), JSON.stringify(settings));
    const store = new SettingsStore(directory, testEncryption());
    expect((await store.settings()).cli.model).toBe(DEFAULT_CODEX_MODEL);
    expect(JSON.parse(await readFile(path.join(directory, 'settings.json'), 'utf8')).cli.model).toBe(DEFAULT_CODEX_MODEL);
    settings.cli.model = '';
    expect((await store.save(settings)).settings.cli.model).toBe(DEFAULT_CODEX_MODEL);
  });
  it('returns defensive default copies and recovers a corrupted settings file from its backup', async () => {
    const directory = await temporaryDirectory();
    const store = new SettingsStore(directory, testEncryption());
    const defaults = await store.settings(); defaults.cli.model = 'mutated';
    expect((await store.settings()).cli.model).toBe(DEFAULT_CODEX_MODEL);
    const first = settingsFixture(); first.siteName = 'Cấu hình đầu'; await store.save(first);
    const second = settingsFixture(); second.siteName = 'Cấu hình sau'; await store.save(second);
    await writeFile(path.join(directory, 'settings.json'), '{interrupted');
    expect((await new SettingsStore(directory, testEncryption()).settings()).siteName).toBe('Cấu hình đầu');
  });
});
