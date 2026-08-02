import { PrismaClient } from '@prisma/client';

export class SeedContext {
  constructor(
    public readonly prisma: PrismaClient,
  ) {}
}