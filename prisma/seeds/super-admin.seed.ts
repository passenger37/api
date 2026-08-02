import { Role, User } from '@prisma/client';

import { SUPER_ADMIN } from '../constants/super-admin';
import { hashPassword } from '../helpers/hash-password';
import { SeedContext } from '../utils/seed-context';

export class SuperAdminSeed {
  async run(
    context: SeedContext,
  ): Promise<void> {
    console.log('\n🌱 Seeding Super Admin...');

    const role =
      await this.getSuperAdminRole(context);

    const user =
      await this.findOrCreateUser(context);

    await this.assignRole(
      context,
      user,
      role,
    );

    console.log(
      '✅ Super Admin seeding completed.',
    );
  }

  // =====================================================
  // Role
  // =====================================================

  private async getSuperAdminRole(
    context: SeedContext,
  ): Promise<Role> {
    const role =
      await context.prisma.role.findUnique({
        where: {
          name: 'SUPER_ADMIN',
        },
      });

    if (!role) {
      throw new Error(
        'SUPER_ADMIN role not found. Run RoleSeed first.',
      );
    }

    return role;
  }

  // =====================================================
  // User
  // =====================================================

  private async findOrCreateUser(
    context: SeedContext,
  ): Promise<User> {
    const existing =
      await context.prisma.user.findFirst({
        where: {
          OR: [
            {
              email: SUPER_ADMIN.email,
            },
            {
              username:
                SUPER_ADMIN.username,
            },
          ],
        },
      });

    if (existing) {
      console.log(
        'ℹ️ Super Admin already exists.',
      );

      return existing;
    }

    const passwordHash =
      await hashPassword(
        SUPER_ADMIN.password,
      );

    const user =
      await context.prisma.user.create({
        data: {
          email: SUPER_ADMIN.email,

          username:
            SUPER_ADMIN.username,

          displayName:
            SUPER_ADMIN.displayName,

          passwordHash,

          isVerified:
            SUPER_ADMIN.isVerified,

          status: 'ACTIVE',
        },
      });

    console.log(
      '✅ Super Admin user created.',
    );

    return user;
  }

  // =====================================================
  // Assign Role
  // =====================================================

  private async assignRole(
    context: SeedContext,
    user: User,
    role: Role,
  ): Promise<void> {
    const assignment =
      await context.prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: user.id,

            roleId: role.id,
          },
        },
      });

    if (assignment) {
      console.log(
        'ℹ️ SUPER_ADMIN role already assigned.',
      );

      return;
    }

    await context.prisma.userRole.create({
      data: {
        userId: user.id,

        roleId: role.id,
      },
    });

    console.log(
      '✅ SUPER_ADMIN role assigned.',
    );
  }
}