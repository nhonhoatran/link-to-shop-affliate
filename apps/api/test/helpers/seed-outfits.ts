import { OutfitModel } from '../../src/models/outfit-model';
import { buildOutfitPayload } from './outfit-payloads';

interface SeedOptions {
  slug: string;
  status?: 'draft' | 'published';
  featured?: boolean;
  updatedAt?: Date;
  missingAffiliate?: boolean;
}

/** Inserts straight into Mongo so tests control updatedAt and can create states the API rejects. */
export const seedOutfit = async ({ slug, status = 'published', featured = false, updatedAt, missingAffiliate }: SeedOptions) => {
  const payload = buildOutfitPayload({ slug, title: `Title ${slug}`, status, featured });
  const items = missingAffiliate
    ? payload.items.map((item, index) => (index === 0 ? { ...item, affiliateUrl: '' } : item))
    : payload.items;
  const created = await OutfitModel.create({ ...payload, items });
  if (updatedAt) await OutfitModel.collection.updateOne({ _id: created._id }, { $set: { updatedAt } });
  return created;
};
