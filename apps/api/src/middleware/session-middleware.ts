import type { RequestHandler } from 'express';
import session from 'express-session';
import { MongoStore } from 'connect-mongo';
import mongoose from 'mongoose';
import type { Env } from '../config/env-config';

declare module 'express-session' {
  interface SessionData {
    adminId?: string;
  }
}

export const SESSION_COOKIE_NAME = 'u30.sid';

export const createSessionMiddleware = (env: Env): RequestHandler => {
  const maxAgeSeconds = env.SESSION_MAX_AGE_HOURS * 3600;
  return session({
    name: SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      clientPromise: Promise.resolve(mongoose.connection.getClient()),
      collectionName: 'sessions',
      ttl: maxAgeSeconds,
    }),
    cookie: {
      httpOnly: true,
      secure: env.SESSION_COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: maxAgeSeconds * 1000,
    },
  });
};
