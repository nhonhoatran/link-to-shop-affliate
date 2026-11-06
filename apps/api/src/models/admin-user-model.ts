import { Schema, model, type Types } from 'mongoose';

export interface AdminUserDoc {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminUserRecord = AdminUserDoc & { _id: Types.ObjectId };

const adminUserSchema = new Schema<AdminUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export const AdminUserModel = model<AdminUserDoc>('AdminUser', adminUserSchema);
