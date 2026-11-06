import { test as teardown, expect } from '@playwright/test';
import { ADMIN_EMAIL, adminPassword } from './support/env';
import { clearOutfitState, readOutfitStateOrNull } from './support/outfit-state';

// Deletes the outfit this run created through the admin API, then checks the public route is gone.
teardown('delete the e2e outfit', async ({ request }) => {
  const state = readOutfitStateOrNull();
  if (!state) return;

  const login = await request.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: adminPassword() } });
  expect(login.ok(), 'admin login for cleanup').toBe(true);

  const deleted = await request.delete(`/api/admin/outfits/${state.outfitId}`);
  expect([200, 204], 'delete e2e outfit').toContain(deleted.status());

  const publicAfter = await request.get(`/api/public/outfits/${state.slug}`);
  expect(publicAfter.status(), 'public route after delete').toBe(404);

  clearOutfitState();
});
