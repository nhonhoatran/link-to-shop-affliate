import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../config/env-config';
import { getDeviceCookieMaxAgeDays } from './runtime-defaults';

export const DEVICE_COOKIE_NAME = 'u30.dev';

export const normalizeEmail = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Domain-separated from the session secret's other uses; the cookie only proves "this browser logged in as this email".
const sign = (secret: string, email: string): string =>
  createHmac('sha256', secret).update(`device-cookie:${email}`).digest('base64url');

const readCookie = (req: Request, name: string): string | undefined => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return undefined;
};

export const hasValidDeviceCookie = (req: Request, secret: string, email: string): boolean => {
  const presented = readCookie(req, DEVICE_COOKIE_NAME);
  if (!presented || !email) return false;
  const expected = Buffer.from(sign(secret, email));
  const actual = Buffer.from(presented);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const deviceCookieOptions = (env: Env): CookieOptions => ({
  httpOnly: true,
  secure: env.SESSION_COOKIE_SECURE,
  sameSite: 'lax',
  maxAge: getDeviceCookieMaxAgeDays() * 86_400_000,
});

export const setDeviceCookie = (res: Response, env: Env, email: string): void => {
  res.cookie(DEVICE_COOKIE_NAME, sign(env.SESSION_SECRET, normalizeEmail(email)), deviceCookieOptions(env));
};
