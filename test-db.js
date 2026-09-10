const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT 1`.then(() => console.log('DB OK')).catch(e => console.error(e)).finally(() => p.$disconnect());