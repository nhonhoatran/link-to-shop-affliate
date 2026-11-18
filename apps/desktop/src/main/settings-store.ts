import { createHash } from 'node:crypto';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import { z } from 'zod';
import { DEFAULT_DESKTOP_SETTINGS, DEFAULT_POSTER_PROMPT, DEFAULT_POSTER_PROMPT_VERSION, desktopSettingsSchema, type DesktopSettings, type DesktopSettingsView } from '@under30ss/shared';
import { readBoundedText, readRecoverableJson, writeAtomicJson } from './atomic-json';

export interface CredentialEncryption {
  available(): boolean;
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
}
const credentialSchema = z.strictObject({ version: z.literal(1), origin: z.string(), encrypted: z.string(), mask: z.string() }).nullable();
const absent = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';

export class SettingsStore {
  constructor(private readonly root: string, private readonly encryption: CredentialEncryption) {}
  private file(name: string) { return path.join(this.root, name); }
  async settings(): Promise<DesktopSettings> {
    try { return await readRecoverableJson(this.file('settings.json'), desktopSettingsSchema, 128 * 1024); }
    catch (error) {
      if (absent(error)) return structuredClone(DEFAULT_DESKTOP_SETTINGS);
      // eslint-disable-next-line preserve-caught-error -- Parser causes can echo private local configuration.
      throw new Error('Cấu hình local bị hỏng; kiểm tra settings.json và bản sao .bak');
    }
  }
  private async credential() {
    try { return credentialSchema.parse(JSON.parse(await readBoundedText(this.file('credential.json'), 32 * 1024))); }
    catch (error) {
      if (absent(error)) return null;
      // eslint-disable-next-line preserve-caught-error -- Never retain raw credential-file diagnostics.
      throw new Error('Không đọc được token mã hóa local; hãy lưu lại token');
    }
  }
  private async writeCredential(value: z.infer<typeof credentialSchema>) {
    // A credential must never be restored after explicit removal or rotation.
    await writeAtomicJson(this.file('credential.json'), credentialSchema.parse(value), false);
    await rm(this.file('credential.json.bak'), { force: true });
  }
  async view(): Promise<DesktopSettingsView> {
    const settings = await this.settings();
    let secret: z.infer<typeof credentialSchema> = null;
    let warning: string | undefined;
    try { secret = await this.credential(); }
    catch { warning = 'Tệp token local không đọc được. Lưu token mới hoặc chọn xóa token; không phục hồi token cũ từ bản sao.'; }
    const matched = secret && settings.siteUrl && secret.origin === new URL(settings.siteUrl).origin ? secret : null;
    return { settings, credential: { configured: matched !== null, mask: matched?.mask ?? null,
      origin: matched?.origin ?? null, encryptionAvailable: this.encryption.available(), ...(warning ? { warning } : {}) } };
  }
  async save(settings: DesktopSettings, token?: string, clearToken = false): Promise<DesktopSettingsView> {
    const next = desktopSettingsSchema.parse(settings);
    if (token && clearToken) throw new Error('Không thể vừa xóa vừa lưu token');
    if (next.siteUrl) next.siteUrl = new URL(next.siteUrl).origin;
    next.prompt.version = next.prompt.text === DEFAULT_POSTER_PROMPT ? DEFAULT_POSTER_PROMPT_VERSION
      : `${DEFAULT_POSTER_PROMPT_VERSION}+${createHash('sha256').update(next.prompt.text).digest('hex').slice(0, 12)}`;
    const existing = token || clearToken ? null : await this.credential();
    if (token) {
      if (!next.siteUrl) throw new Error('Cần URL website trước khi lưu token');
      if (!this.encryption.available()) throw new Error('Hệ điều hành chưa cung cấp mã hóa token an toàn');
      const encrypted = this.encryption.encrypt(token).toString('base64');
      await this.writeCredential({ version: 1, origin: next.siteUrl, encrypted, mask: `••••${token.slice(-4)}` });
    } else if (clearToken || (existing && existing.origin !== next.siteUrl)) {
      await this.writeCredential(null);
    }
    await writeAtomicJson(this.file('settings.json'), next);
    return this.view();
  }
  async connection(): Promise<{ origin: string; token: string; timeoutMs: number }> {
    const settings = await this.settings();
    if (!settings.siteUrl) throw new Error('Chưa cấu hình URL website');
    const credential = await this.credential();
    if (!credential || credential.origin !== new URL(settings.siteUrl).origin) throw new Error('Cần lưu token cho đúng website đang chọn');
    if (!this.encryption.available()) throw new Error('Không có mã hóa hệ điều hành; không thể đọc token');
    try {
      return { origin: credential.origin, token: this.encryption.decrypt(Buffer.from(credential.encrypted, 'base64')), timeoutMs: settings.limits.syncTimeoutMs };
    } catch { throw new Error('Không giải mã được token trên tài khoản Windows này; hãy lưu token mới'); }
  }
}
