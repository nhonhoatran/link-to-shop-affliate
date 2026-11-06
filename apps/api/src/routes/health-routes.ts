import { Router } from 'express';
import mongoose from 'mongoose';
import type { HealthResponse } from '@under30ss/shared';
import { AppError } from '../lib/app-error';
import { getHealthTimeoutMs } from '../lib/runtime-defaults';

const CONNECTED = 1;

const pingMongo = async (): Promise<void> => {
  const db = mongoose.connection.readyState === CONNECTED ? mongoose.connection.db : undefined;
  if (!db) throw new Error('mongo not connected');
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('mongo ping timed out')), getHealthTimeoutMs());
  });
  try {
    await Promise.race([db.admin().ping(), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const createHealthRoutes = (): Router => {
  const router = Router();
  router.get('/', async (_req, res) => {
    try {
      await pingMongo();
    } catch {
      throw new AppError(503, 'INTERNAL_ERROR', 'Dịch vụ tạm thời không khả dụng');
    }
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });
  return router;
};
