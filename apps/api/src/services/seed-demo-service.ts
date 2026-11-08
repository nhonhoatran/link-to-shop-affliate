import {
  HOME_LAYOUT_SCHEMA_VERSION,
  outfitInputSchema,
  settingsInputSchema,
  type DemoImage,
  type DemoSeedFile,
  type DemoSubscriber,
  type ImageRef,
  type MediaKind,
  type OutfitInput,
} from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { CollectionModel } from '../models/collection-model';
import { NewsletterSubscriberModel, type NewsletterEventDoc } from '../models/newsletter-subscriber-model';
import { OutfitModel } from '../models/outfit-model';
import { HOME_PAGE_KEY, PageLayoutModel } from '../models/page-layout-model';
import { createCollection, updateCollection } from './collection-service';
import { assertHomeLayoutLimits } from './home-layout-guards';
import { outfitPaths } from './revalidate-web-service';
import { buildHomeContent } from './seed-demo-home-layout';
import { uploadSeedImage } from './seed-service';
import { getSavedConsent } from './settings-newsletter-consent-service';
import { updateSettings } from './settings-service';
import { upsertOutfitBySlug } from './outfit-service';

export interface DemoSeedOptions {
  seedDir: string;
  imageRoot: string;
  /** Drop every outfit, collection, subscriber and the home layout before seeding (admins and sessions stay). */
  reset: boolean;
}

export interface DemoSeedSummary {
  collections: number;
  outfits: number;
  sections: number;
  subscribers: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const resetContent = async (): Promise<void> => {
  await Promise.all([
    OutfitModel.deleteMany({}),
    CollectionModel.deleteMany({}),
    NewsletterSubscriberModel.deleteMany({}),
    PageLayoutModel.deleteMany({ pageKey: HOME_PAGE_KEY }),
  ]);
};

const seedCollections = async (ctx: AppContext, seed: DemoSeedFile, upload: Uploader): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  for (const collection of seed.collections) {
    const input = { ...collection, coverImage: await upload('model', collection.coverImage) };
    const existing = await CollectionModel.findOne({ slug: collection.slug }).select({ _id: 1 }).lean<{ _id: unknown }>();
    const dto = existing
      ? (await updateCollection(String(existing._id), input, ctx.env))?.collection
      : await createCollection(input, ctx.env);
    if (!dto) throw new Error(`Collection ${collection.slug} vanished while seeding`);
    ids.set(collection.slug, dto.id);
  }
  return ids;
};

const seedOutfits = async (seed: DemoSeedFile, collectionIds: Map<string, string>, upload: Uploader): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  for (const outfit of seed.outfits) {
    const items = [];
    for (const { detect: _detect, ...item } of outfit.items) {
      items.push({ ...item, image: await upload('item', item.image) });
    }
    const input: OutfitInput = outfitInputSchema.parse({
      slug: outfit.slug,
      title: outfit.title,
      ...(outfit.seoDescription ? { seoDescription: outfit.seoDescription } : {}),
      modelImage: await upload('model', outfit.modelImage),
      status: outfit.status,
      featured: outfit.featured,
      collectionIds: outfit.collections.map((slug) => {
        const id = collectionIds.get(slug);
        if (!id) throw new Error(`Outfit ${outfit.slug} refers to unknown collection ${slug}`);
        return id;
      }),
      items,
    });
    const saved = await upsertOutfitBySlug(input);
    ids.set(outfit.slug, saved.id);
  }
  return ids;
};

// The seed publishes directly: draft and published are the same content, with no previous version to undo to.
const publishHomeLayout = async (content: unknown[]): Promise<void> => {
  const now = new Date();
  await PageLayoutModel.updateOne(
    { pageKey: HOME_PAGE_KEY },
    {
      $set: {
        draft: { content },
        draftUpdatedAt: now,
        published: { content },
        publishedAt: now,
        previous: null,
        schemaVersion: HOME_LAYOUT_SCHEMA_VERSION,
      },
    },
    { upsert: true },
  );
};

const seedSubscribers = async (subscribers: DemoSubscriber[]): Promise<void> => {
  if (subscribers.length === 0) return;
  const consent = await getSavedConsent();
  if (!consent) throw new Error('Subscribers need settings.newsletterConsent in the seed file');
  for (const subscriber of subscribers) {
    const subscribedAt = new Date(Date.now() - subscriber.daysAgo * DAY_MS);
    const unsubscribedAt = new Date(subscribedAt.getTime() + DAY_MS);
    const events: NewsletterEventDoc[] = [
      { type: 'subscribe', at: subscribedAt, actor: 'self', source: 'home', textVersion: consent.version, consentText: consent.text },
    ];
    if (subscriber.status === 'unsubscribed') events.push({ type: 'unsubscribe', at: unsubscribedAt, actor: 'self' });
    const latest = events[events.length - 1]!.at;
    await NewsletterSubscriberModel.updateOne(
      { email: subscriber.email },
      {
        $set: {
          status: subscriber.status,
          source: 'home',
          consentedAt: subscribedAt,
          consentText: consent.text,
          consentTextVersion: consent.version,
          events,
          createdAt: subscribedAt,
          updatedAt: latest,
          ...(subscriber.status === 'unsubscribed' ? { unsubscribedAt } : {}),
        },
        ...(subscriber.status === 'subscribed' ? { $unset: { unsubscribedAt: 1 } } : {}),
      },
      { upsert: true, timestamps: false },
    );
  }
};

type Uploader = (kind: MediaKind, image: DemoImage) => Promise<ImageRef>;

export const seedDemo = async (ctx: AppContext, seed: DemoSeedFile, options: DemoSeedOptions): Promise<DemoSeedSummary> => {
  if (options.reset) await resetContent();
  const seedOptions = { seedDir: options.seedDir, imageRoot: options.imageRoot, publishWithPlaceholder: false };
  const upload: Uploader = (kind, image) => uploadSeedImage(ctx, seedOptions, kind, { file: image.file, width: 1, height: 1 });

  const { ogImage, ...settings } = seed.settings;
  await updateSettings(settingsInputSchema.parse({ ...settings, ...(ogImage ? { ogImage: await upload('model', ogImage) } : {}) }), ctx.env);

  const collectionIds = await seedCollections(ctx, seed, upload);
  const outfitIds = await seedOutfits(seed, collectionIds, upload);
  const content = assertHomeLayoutLimits(await buildHomeContent(seed.home, { upload, collectionIds, outfitIds }), ctx.env);
  await publishHomeLayout(content);
  await seedSubscribers(seed.subscribers);

  await ctx.revalidate({ scope: 'all' });
  await ctx.revalidate(outfitPaths(...seed.outfits.map((outfit) => outfit.slug)));
  return { collections: collectionIds.size, outfits: outfitIds.size, sections: content.length, subscribers: seed.subscribers.length };
};
