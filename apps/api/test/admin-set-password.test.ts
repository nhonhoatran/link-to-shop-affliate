import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authenticate, createAdmin, setAdminPassword } from '../src/services/admin-user-service';
import { TEST_EMAIL, TEST_PASSWORD, startTestApp, type TestApp } from './helpers/test-app';

describe('setAdminPassword', () => {
  let testApp: TestApp;
  beforeAll(async () => {
    testApp = await startTestApp();
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);
  });
  afterAll(async () => {
    await testApp.stop();
  });

  it('replaces the password of an existing admin, matching the email case-insensitively', async () => {
    const updated = await setAdminPassword(` ${TEST_EMAIL.toUpperCase()} `, 'brand-new-password');
    expect(updated?.email).toBe(TEST_EMAIL);
    expect(await authenticate(TEST_EMAIL, 'brand-new-password')).not.toBeNull();
    expect(await authenticate(TEST_EMAIL, TEST_PASSWORD)).toBeNull();
  });

  it('returns null and creates nothing when no admin has that email', async () => {
    expect(await setAdminPassword('nobody@example.com', 'whatever-password')).toBeNull();
    expect(await authenticate('nobody@example.com', 'whatever-password')).toBeNull();
  });
});
