import { test as setup } from '@playwright/test';
import { adminApi } from './support/admin-api';
import { assertContentResetAllowed, hasPendingContentSnapshot, SNAPSHOT_FILE, takeContentSnapshot } from './support/content-snapshot';

// Fails fast on a shared target, then records the home layout and settings that content.teardown.ts puts back.
setup('snapshot home layout and settings', async ({ baseURL }) => {
  assertContentResetAllowed(baseURL ?? '');
  if (hasPendingContentSnapshot()) {
    console.warn(`Reusing ${SNAPSHOT_FILE}: the previous content teardown did not finish restoring.`);
    return;
  }
  const api = await adminApi();
  try {
    await takeContentSnapshot(api);
  } finally {
    await api.dispose();
  }
});
