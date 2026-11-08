import { test as teardown } from '@playwright/test';
import { adminApi } from './support/admin-api';
import { restoreSettings } from './support/admin-settings';
import { deleteContentFixtures } from './support/collection-fixtures';
import { loadContentSnapshot, restoreHome } from './support/content-snapshot';
import { deleteE2eSubscribers } from './support/newsletter-fixtures';

// Runs after the content chain, even when a spec failed. Puts the home layout and settings back to what
// content.setup.ts recorded, then removes the e2e collections, outfits and newsletter subscribers.
teardown('restore home layout, settings and content fixtures', async () => {
  const snapshot = loadContentSnapshot();
  const api = await adminApi();
  try {
    await restoreHome(api, snapshot.home);
    await deleteContentFixtures(api);
    await deleteE2eSubscribers(api);
  } finally {
    await api.dispose();
  }
  await restoreSettings(snapshot.settings);
});
