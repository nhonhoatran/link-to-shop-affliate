import { request as playwrightRequest, test, type APIRequestContext, type BrowserContext, type Cookie } from '@playwright/test';
import { ADMIN_EMAIL, adminPassword } from './env';

let sessionCookies: Cookie[] | null = null;

const projectBaseUrl = (): string => test.info().project.use.baseURL ?? '';

/** Logs in once per worker (the API limits login attempts per IP) and reuses the session cookies. */
async function ensureSessionCookies(): Promise<Cookie[]> {
  if (sessionCookies) return sessionCookies;
  const login = await playwrightRequest.newContext({ baseURL: projectBaseUrl() });
  try {
    const response = await login.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: adminPassword() } });
    if (!response.ok()) throw new Error(`admin API login failed with status ${response.status()}`);
    sessionCookies = (await login.storageState()).cookies;
    return sessionCookies;
  } finally {
    await login.dispose();
  }
}

/** Adds the admin session to a browser context without going through the login form. */
export async function signInContext(context: BrowserContext): Promise<void> {
  await context.addCookies(await ensureSessionCookies());
}

/** API context carrying the admin session. The caller must dispose it. */
export async function adminApi(): Promise<APIRequestContext> {
  const cookies = await ensureSessionCookies();
  return playwrightRequest.newContext({ baseURL: projectBaseUrl(), storageState: { cookies, origins: [] } });
}
