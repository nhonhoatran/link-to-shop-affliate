import { z } from 'zod';

export const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/;

export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');
