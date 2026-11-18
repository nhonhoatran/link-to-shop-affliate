import { z } from 'zod';
import { createHash } from 'node:crypto';
import { IMPORT_API_PATHS, importCapabilitiesSchema, importMediaReceiptSchema, importOperationReceiptSchema,
  importSessionDtoSchema, websiteOriginSchema, type ImportCommit, type ImportSessionDto } from '@under30ss/shared';

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
export class ImportClient {
  readonly credentialFingerprint: string;
  constructor(readonly origin: string, private readonly token: string, private readonly timeoutMs: number,
    private readonly signal: AbortSignal, private readonly transport: typeof fetch = fetch) {
    websiteOriginSchema.parse(origin);
    if (!origin || new URL(origin).origin !== origin) throw new Error('URL kết nối phải là origin chuẩn');
    this.credentialFingerprint = createHash('sha256').update(token).digest('hex');
  }
  private async request<T>(pathname: string, method: string, schema: z.ZodType<T>, body?: RequestInit['body'], headers?: Record<string, string>): Promise<T> {
    const url = new URL(pathname, this.origin);
    if (url.origin !== this.origin || !url.pathname.startsWith('/api/import/')) throw new Error('Đường dẫn nhập nháp ngoài phạm vi');
    const response = await this.transport(url, { method, body, headers: { Authorization: `Bearer ${this.token}`, ...headers },
      redirect: 'error', credentials: 'omit', signal: AbortSignal.any([this.signal, AbortSignal.timeout(this.timeoutMs)]) });
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('Phản hồi website vượt giới hạn'); }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
    }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error(`Website trả nội dung không hợp lệ (HTTP ${response.status}); kiểm tra URL và reverse proxy`); }
    if (!response.ok) {
      const error = z.object({ error: z.object({ message: z.string() }) }).safeParse(value);
      const message = error.success ? error.data.error.message.split(this.token).join('[REDACTED]') : 'Yêu cầu bị từ chối';
      throw new Error(`HTTP ${response.status}: ${message.slice(0, 1000)}`);
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new Error('Phản hồi website không khớp hợp đồng nhập nháp; kiểm tra phiên bản API và ứng dụng desktop');
    return parsed.data;
  }
  capabilities() { return this.request(IMPORT_API_PATHS.capabilities, 'GET', importCapabilitiesSchema); }
  session(id: string) { return this.request(IMPORT_API_PATHS.session(id), 'GET', importSessionDtoSchema); }
  start(id: string, body: Pick<ImportSessionDto, 'contractVersion' | 'sourceLabel' | 'sourceFingerprint'>) {
    return this.request(IMPORT_API_PATHS.session(id), 'PUT', importSessionDtoSchema, JSON.stringify(body), { 'Content-Type': 'application/json' });
  }
  upload(id: string, mediaId: string, kind: 'model' | 'item', sha256: string, bytes: Buffer) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'crop.png');
    return this.request(`${IMPORT_API_PATHS.media(id, mediaId)}?kind=${kind}`, 'PUT', importMediaReceiptSchema,
      form, { 'X-Content-SHA256': sha256 });
  }
  commit(id: string, operationId: string, payload: ImportCommit) {
    return this.request(IMPORT_API_PATHS.operation(id, operationId), 'PUT', importOperationReceiptSchema,
      JSON.stringify(payload), { 'Content-Type': 'application/json' });
  }
}
