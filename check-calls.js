const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.call.findMany({ take: 5, select: { id: true, status: true } })
  .then(c => console.log(JSON.stringify(c, null, 2)))
  .finally(() => prisma.$disconnect());