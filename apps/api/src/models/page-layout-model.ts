import { Schema, model } from 'mongoose';
import type { HomeLayoutContent } from '@under30ss/shared';

export const HOME_PAGE_KEY = 'home';

export interface LayoutVersion {
  content: HomeLayoutContent;
}

export interface PreviousLayout {
  published: LayoutVersion | null;
  publishedAt: Date | null;
}

export interface PageLayoutDoc {
  pageKey: string;
  draft: LayoutVersion;
  draftUpdatedAt: Date | null;
  published: LayoutVersion | null;
  publishedAt: Date | null;
  previous: PreviousLayout | null;
  schemaVersion: number;
}

// Mixed on purpose: content is validated by zod before every write and re-parsed section by section on read,
// and the publish / restore pipeline updates bypass Mongoose casting anyway.
const pageLayoutSchema = new Schema<PageLayoutDoc>(
  {
    pageKey: { type: String, required: true, unique: true },
    draft: { type: Schema.Types.Mixed, required: true },
    draftUpdatedAt: { type: Date, default: null },
    published: { type: Schema.Types.Mixed, default: null },
    publishedAt: { type: Date, default: null },
    previous: { type: Schema.Types.Mixed, default: null },
    schemaVersion: { type: Number, required: true },
  },
  { minimize: false },
);

export const PageLayoutModel = model<PageLayoutDoc>('PageLayout', pageLayoutSchema);
