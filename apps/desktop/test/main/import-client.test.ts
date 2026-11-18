import { describe, expect, it, vi } from 'vitest';
import { DESKTOP_IMPORT_VERSION, IMPORT_SCOPE } from '@under30ss/shared';
import { ImportClient } from '../../src/main/import-client';

const token = 'imp_test_transport_credential_012345';
const capabilities = { contractVersion: DESKTOP_IMPORT_VERSION, scope: IMPORT_SCOPE,
  uploadMaxBytes: 1_000_000, sessionMaxMedia: 100, sessionMaxOperations: 10 };
const client = (transport: typeof fetch, signal = new AbortController().signal, timeoutMs = 3000) =>
  new ImportClient('https://website.test', token, timeoutMs, signal, transport);

describe('website importer HTTP boundary', () => {
  it('pins bearer credentials to the configured origin and refuses redirects', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(capabilities));
    expect(await client(transport).capabilities()).toEqual(capabilities);
    const [url, init] = transport.mock.calls[0]!;
    expect(String(url)).toBe('https://website.test/api/import/capabilities');
    expect(init).toMatchObject({ method: 'GET', redirect: 'error', credentials: 'omit', headers: { Authorization: `Bearer ${token}` } });
    expect(init?.body).toBeUndefined();
    for (const origin of ['http://external.test', 'https://user:pass@website.test', 'https://website.test/path', 'https://website.test/']) {
      expect(() => new ImportClient(origin, token, 1000, new AbortController().signal, transport)).toThrow();
    }
  });
  it('rejects an incompatible server contract instead of accepting a connection label', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ...capabilities, contractVersion: 'v0' }));
    await expect(client(transport).capabilities()).rejects.toThrow();
  });
  it('redacts credentials echoed by an error response and handles an HTML proxy error', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ error: { message: `Denied ${token}` } }, { status: 401 }))
      .mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(client(transport).capabilities()).rejects.toThrow('HTTP 401: Denied [REDACTED]');
    await expect(client(transport).capabilities()).rejects.toThrow('HTTP 502');
  });
  it('cancels an oversized streaming response before parsing it', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); },
      cancel() { cancelled = true; },
    });
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    await expect(client(transport).capabilities()).rejects.toThrow('Phản hồi website vượt giới hạn');
    expect(cancelled).toBe(true);
  });
  it('combines cancellation with its request timeout', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      const signal = init!.signal!;
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    await expect(client(transport, new AbortController().signal, 25).capabilities()).rejects.toThrow();
    const controller = new AbortController(); const pending = client(transport, controller.signal).capabilities();
    controller.abort(new Error('Test cancelled request'));
    await expect(pending).rejects.toThrow('Test cancelled request');
  });
  it('uploads actual bytes in a multipart file with a stable caller ID and checksum header', async () => {
    const media = { clientMediaId: 'image-a', sha256: 'a'.repeat(64), kind: 'item',
      image: { key: 'public/imports/image-a.webp', width: 10, height: 20, url: 'https://media.test/image-a.webp' } };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(media));
    const bytes = Buffer.from('image-test-bytes');
    expect(await client(transport).upload('session-a', 'image-a', 'item', media.sha256, bytes)).toEqual(media);
    const [url, init] = transport.mock.calls[0]!;
    expect(String(url)).toBe('https://website.test/api/import/sessions/session-a/media/image-a?kind=item');
    expect(init?.headers).toMatchObject({ 'X-Content-SHA256': media.sha256 });
    const form = init?.body as FormData;
    expect([...form.keys()]).toEqual(['file']);
    const file = form.get('file') as Blob;
    expect(Buffer.from(await file.arrayBuffer())).toEqual(bytes);
  });
});
