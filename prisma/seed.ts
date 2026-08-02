import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

import { SeedContext } from './utils/seed-context';

import { SeedLogger } from './helpers/seed-logger';

import { AuthorizationSeed } from './seeds/authorization.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  SeedLogger.title('Starting Nexus Database Seed');

  const context = new SeedContext(prisma);

  // =====================================================
  // Authorization
  // =====================================================

  await new AuthorizationSeed().run(context);

  // =====================================================
  // Future Seed Modules
  // =====================================================

  // await new UserSeed().run(context);
  // await new OrganizationSeed().run(context);
  // await new SchoolSeed().run(context);
  // await new CommunitySeed().run(context);
  // await new CategorySeed().run(context);
  // await new NotificationTemplateSeed().run(context);

  SeedLogger.success('Database seeded successfully.');
}

main()
  .catch((error) => {
    SeedLogger.error('Database seed failed.');

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });