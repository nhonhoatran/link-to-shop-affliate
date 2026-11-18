import { z } from 'zod';
import { clientImportIdSchema } from './poster-analysis-schema';
import { desktopSettingsSchema, desktopSettingsViewSchema } from './desktop-settings-schema';
import { desktopDraftSchema, desktopFileSchema, desktopFileStatusSchema, desktopSessionSchema, desktopSessionSummarySchema, type DesktopProgress } from './desktop-session-schema';
import { importCapabilitiesSchema } from './desktop-import-contract';

const empty = z.strictObject({});
const sessionInput = z.strictObject({ sessionId: clientImportIdSchema });
const fileInput = sessionInput.extend({ fileId: clientImportIdSchema });
const revisionInput = fileInput.extend({ expectedRevision: z.number().int().nonnegative() });
const pageFields = { page: z.number().int().positive().max(100_000), size: z.number().int().positive().max(100) };
const paginated = <T extends z.ZodType>(item: T) => z.strictObject({
  items: z.array(item), total: z.number().int().nonnegative(), ...pageFields,
});

export const desktopCommandSchemas = {
  readSettings: { input: empty, output: desktopSettingsViewSchema },
  saveSettings: {
    input: z.strictObject({ settings: desktopSettingsSchema, token: z.string().trim().min(1).max(1024).optional(), clearToken: z.boolean().optional() }),
    output: desktopSettingsViewSchema,
  },
  chooseFolder: { input: empty, output: z.strictObject({ selectionId: clientImportIdSchema, folderLabel: z.string() }).nullable() },
  createSession: { input: z.strictObject({ selectionId: clientImportIdSchema, name: z.string().trim().min(1).max(120) }), output: desktopSessionSchema },
  listSessions: { input: z.strictObject(pageFields), output: paginated(desktopSessionSummarySchema) },
  getSession: { input: sessionInput, output: desktopSessionSchema },
  listFiles: { input: sessionInput.extend({ ...pageFields, status: desktopFileStatusSchema.optional() }), output: paginated(desktopFileSchema) },
  getFile: { input: fileInput, output: desktopFileSchema },
  analyze: { input: sessionInput.extend({ fileIds: z.array(clientImportIdSchema).min(1).max(5000).optional() }), output: z.strictObject({ started: z.boolean() }) },
  cancel: { input: sessionInput, output: z.strictObject({ cancelled: z.boolean() }) },
  updateDraft: { input: revisionInput.extend({ draft: desktopDraftSchema }), output: desktopFileSchema },
  approve: { input: revisionInput, output: desktopFileSchema },
  checkConnection: { input: empty, output: importCapabilitiesSchema },
  sync: { input: sessionInput, output: z.strictObject({ started: z.boolean() }) },
  openRemote: { input: fileInput.extend({ kind: z.enum(['outfit', 'collection']) }), output: z.strictObject({ opened: z.boolean() }) },
} as const;

export type DesktopCommand = keyof typeof desktopCommandSchemas;
export type DesktopInput<K extends DesktopCommand> = z.infer<(typeof desktopCommandSchemas)[K]['input']>;
export type DesktopOutput<K extends DesktopCommand> = z.infer<(typeof desktopCommandSchemas)[K]['output']>;
export interface DesktopBridge {
  invoke<K extends DesktopCommand>(command: K, input: DesktopInput<K>): Promise<DesktopOutput<K>>;
  onProgress(listener: (progress: DesktopProgress) => void): () => void;
  assetUrl(sessionId: string, assetId: string): string;
}
