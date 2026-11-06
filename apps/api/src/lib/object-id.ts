import { Types } from 'mongoose';

export const isObjectId = (value: unknown): value is string => typeof value === 'string' && Types.ObjectId.isValid(value);
