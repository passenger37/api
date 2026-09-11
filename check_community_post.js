const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'CommunityPost%'`.then(r => console.log(r)).catch(e => console.error(e)).finally(() => p.$disconnect());