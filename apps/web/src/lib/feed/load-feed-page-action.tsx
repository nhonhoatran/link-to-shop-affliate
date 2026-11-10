'use server';

import type { ReactNode } from 'react';
import { publicOutfitFeedQuerySchema } from '@under30ss/shared';
import { OutfitFeedSlides } from '@/components/feed/outfit-feed-slide';
import { getOutfitFeedPage, nextFeedPage } from '@/lib/seo/public-feed-loaders';

export interface FeedBatch {
  slides: ReactNode;
  nextPage: number | null;
}

/** Called by the browser, so the input is validated like any other request body. */
export async function loadFeedPage(input: { page: number; size: number; collection?: string }): Promise<FeedBatch> {
  const parsed = publicOutfitFeedQuerySchema.safeParse({
    page: input?.page,
    size: input?.size,
    collection: input?.collection,
  });
  if (!parsed.success) throw new Error('Invalid feed page request');
  const { page, size, collection } = parsed.data;
  const feed = await getOutfitFeedPage(page, size, collection);
  if (!feed) throw new Error('Feed collection not found');
  return { slides: <OutfitFeedSlides outfits={feed.items} />, nextPage: nextFeedPage(feed) };
}
