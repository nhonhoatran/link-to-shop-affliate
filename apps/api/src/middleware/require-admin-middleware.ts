import type { RequestHandler } from 'express';
import { unauthorized } from '../lib/app-error';
import { adminExists } from '../services/admin-user-service';

/** Checks the database on every call so a deleted admin loses access immediately. */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const adminId = req.session.adminId;
  if (!adminId || !(await adminExists(adminId))) throw unauthorized();
  next();
};
