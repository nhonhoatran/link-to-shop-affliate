import { test as teardown, expect } from '@playwright/test';
import { ADMIN_EMAIL, adminPassword } from './support/env';
import { deleteE2EOutfit } from './support/outfit-cleanup';
import { clearOutfitState, readOutfitStateOrNull } from './support/outfit-state';

// Deletes the outfit this run created through the admin API. The state file is cleared only after
// a successful delete, so a failed cleanup is retried by the next run instead of being lost.
teardown('delete the e2e outfit', async ({ request }) => {
  const state = readOutfitStateOrNull();
  if (!state) return;

  const login = await request.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: adminPassword() } });
  expect(login.ok(), 'admin login for cleanup').toBe(true);

  await deleteE2EOutfit(request, state);
  clearOutfitState();
});
