import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { AppError } from '../utils/errors';

const SALT_ROUNDS = 12;

export const adminStaffService = {
  list: async () => {
    const staff = await db.adminStaff.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        adminRole: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        createdById: true,
      },
    });
    return staff;
  },

  create: async (
    data: { email: string; password: string; name: string; adminRole: 'SUPER_ADMIN' | 'SUPPORT_AGENT' },
    createdById: number,
  ) => {
    const existing = await db.adminStaff.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('An account with this email already exists', 409);

    if (data.password.length < 12) {
      throw new AppError('Password must be at least 12 characters', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const staff = await db.adminStaff.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        adminRole: data.adminRole,
        createdById,
        isActive: true,
      },
      select: { id: true, email: true, name: true, adminRole: true, isActive: true, createdAt: true },
    });
    return staff;
  },

  setActive: async (id: number, isActive: boolean) => {
    const staff = await db.adminStaff.findUnique({ where: { id } });
    if (!staff) throw new AppError('Staff account not found', 404);
    return db.adminStaff.update({ where: { id }, data: { isActive } });
  },

  resetPassword: async (id: number, newPassword: string) => {
    if (newPassword.length < 12) throw new AppError('Password must be at least 12 characters', 400);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.adminStaff.update({ where: { id }, data: { passwordHash } });
    // Invalidate all active sessions for this staff member
    const syntheticPhone = `staff_${id}`;
    const userRow = await db.user.findUnique({ where: { phone: syntheticPhone } });
    if (userRow) await db.session.deleteMany({ where: { userId: userRow.id } });
    return { success: true };
  },
};
