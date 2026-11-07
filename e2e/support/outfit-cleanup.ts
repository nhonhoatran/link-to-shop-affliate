import { expect, type APIRequestContext } from '@playwright/test';
import type { E2EOutfitState } from './outfit-state';

/** Deletes an e2e outfit through the admin API and checks its public route is gone. */
export async function deleteE2EOutfit(request: APIRequestContext, state: E2EOutfitState): Promise<void> {
  const deleted = await request.delete(`/api/admin/outfits/${state.outfitId}`);
  expect([200, 204, 404], 'delete e2e outfit').toContain(deleted.status());

  const publicAfter = await request.get(`/api/public/outfits/${state.slug}`);
  expect(publicAfter.status(), 'public route after delete').toBe(404);
}
