import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const roles = [
  {
    name: 'USER',
    description: 'Default user',
    isSystem: true,
  },
  {
    name: 'MODERATOR',
    description: 'Community moderator',
    isSystem: true,
  },
  {
    name: 'ADMIN',
    description: 'Application administrator',
    isSystem: true,
  },
  {
    name: 'SUPER_ADMIN',
    description: 'Platform owner',
    isSystem: true,
  },
];

const permissions = [
  {
    name: 'posts.create',
    resource: 'posts',
    action: 'create',
    description: 'Create posts',
  },

  {
    name: 'posts.update',
    resource: 'posts',
    action: 'update',
    description: 'Update posts',
  },

  {
    name: 'posts.delete',
    resource: 'posts',
    action: 'delete',
    description: 'Delete posts',
  },

  {
    name: 'comments.create',
    resource: 'comments',
    action: 'create',
    description: 'Create comments',
  },

  {
    name: 'comments.delete',
    resource: 'comments',
    action: 'delete',
    description: 'Delete comments',
  },

  {
    name: 'users.update',
    resource: 'users',
    action: 'update',
    description: 'Update users',
  },

  {
    name: 'users.ban',
    resource: 'users',
    action: 'ban',
    description: 'Ban users',
  },

  {
    name: 'reports.review',
    resource: 'reports',
    action: 'review',
    description: 'Review reports',
  },

  {
    name: 'admin.dashboard',
    resource: 'admin',
    action: 'dashboard',
    description: 'Access admin dashboard',
  },
];

async function seedRoles() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {},
      create: role,
    });
  }

  console.log('✅ Roles seeded');
}

async function seedPermissions() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        name: permission.name,
      },
      update: {},
      create: permission,
    });
  }

  console.log('✅ Permissions seeded');
}

const ROLE_PERMISSIONS = {
  USER: [
    'posts.create',
    'comments.create',
  ],

  MODERATOR: [
    'posts.delete',
    'comments.delete',
    'reports.review',
  ],

  ADMIN: [
    'posts.delete',
    'users.update',
    'users.ban',
    'reports.review',
    'admin.dashboard',
  ],

  SUPER_ADMIN: permissions.map(
    p => p.name,
  ),
};

async function seedRolePermissions() {
  for (const roleName of Object.keys(
    ROLE_PERMISSIONS,
  )) {
    const role =
      await prisma.role.findUniqueOrThrow({
        where: {
          name: roleName,
        },
      });

    for (const permissionName of ROLE_PERMISSIONS[
      roleName as keyof typeof ROLE_PERMISSIONS
    ]) {
      const permission =
        await prisma.permission.findUniqueOrThrow({
          where: {
            name: permissionName,
          },
        });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log(
    '✅ Role permissions seeded',
  );
}

async function main() {
  await seedRoles();

  await seedPermissions();

  await seedRolePermissions();
}

main()
  .then(async () => {
    console.log('🎉 Seed completed');

    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });