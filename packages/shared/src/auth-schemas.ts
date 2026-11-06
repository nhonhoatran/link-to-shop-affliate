import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const createAdminInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200),
});

export const adminUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  createdAt: z.string(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;
export type AdminUserDto = z.infer<typeof adminUserSchema>;
