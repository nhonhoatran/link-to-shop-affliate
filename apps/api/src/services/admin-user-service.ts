import type { AdminUserDto } from '@under30ss/shared';
import { conflict, notFound } from '../lib/app-error';
import { isObjectId } from '../lib/object-id';
import { AdminUserModel, type AdminUserRecord } from '../models/admin-user-model';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password-service';

type AdminUserView = Pick<AdminUserRecord, '_id' | 'email' | 'createdAt'>;

const toDto = (user: AdminUserView): AdminUserDto => ({
  id: String(user._id),
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

export const authenticate = async (email: string, password: string): Promise<AdminUserDto | null> => {
  const user = await AdminUserModel.findOne({ email }).lean<AdminUserRecord>();
  if (!user) {
    await verifyAgainstDummy(password);
    return null;
  }
  return (await verifyPassword(user.passwordHash, password)) ? toDto(user) : null;
};

export const getAdminById = async (id: string): Promise<AdminUserDto | null> => {
  if (!isObjectId(id)) return null;
  const user = await AdminUserModel.findById(id).lean<AdminUserRecord>();
  return user ? toDto(user) : null;
};

export const adminExists = async (id: string): Promise<boolean> => isObjectId(id) && Boolean(await AdminUserModel.exists({ _id: id }));

export const listAdmins = async (): Promise<AdminUserDto[]> =>
  (await AdminUserModel.find().sort({ createdAt: 1 }).lean<AdminUserRecord[]>()).map(toDto);

export const createAdmin = async (email: string, password: string): Promise<AdminUserDto> => {
  const passwordHash = await hashPassword(password);
  try {
    const created = await AdminUserModel.create({ email, passwordHash });
    return toDto(created.toObject() as AdminUserRecord);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw conflict('Email này đã có tài khoản', { email: 'Email already exists' });
    throw error;
  }
};

export const deleteAdmin = async (id: string, currentAdminId: string): Promise<void> => {
  if (id === currentAdminId) throw conflict('Không thể xoá chính tài khoản đang đăng nhập');
  if (!isObjectId(id)) throw notFound();
  if ((await AdminUserModel.countDocuments()) <= 1) throw conflict('Không thể xoá quản trị viên cuối cùng');
  const deleted = await AdminUserModel.findByIdAndDelete(id);
  if (!deleted) throw notFound();
};
