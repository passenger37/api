import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../core/database';

@Injectable()
export class SuperAdminSeeder {
  private readonly logger = new Logger(
    SuperAdminSeeder.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async seed() {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL');
    const username = this.config.get<string>('SUPER_ADMIN_USERNAME');
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    const displayName = this.config.get<string>('SUPER_ADMIN_DISPLAY_NAME');

    if (!email || !username || !password || !displayName) {
      this.logger.warn(
        'Super Admin environment variables are missing. Skipping.',
      );
      return;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.log('Super Admin already exists.');
      return;
    }

    const role = await this.prisma.role.findUnique({
      where: {
        name: 'SUPER_ADMIN',
      },
    });

    if (!role) {
      throw new Error('SUPER_ADMIN role not found.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        isVerified: true,
      },
    });

    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    this.logger.log(
      `Super Admin created (${email})`,
    );
  }
}