import { AuthorizationAuditRepository } from './authorization-audit.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthorizationAudit } from '../interfaces/audit-log.interface';

describe('AuthorizationAuditRepository', () => {
  let repository: AuthorizationAuditRepository;
  let prisma: { authorizationAuditLog: { create: jest.Mock } };

  beforeEach(() => {
    prisma = { authorizationAuditLog: { create: jest.fn() } };
    repository = new AuthorizationAuditRepository(prisma as any);
  });

  it('should create an authorization audit log entry', async () => {
    const data: AuthorizationAudit = {
      actorId: 'user-1',
      action: 'ROLE_ASSIGNED',
      roleId: 'role-1',
      metadata: { source: 'cli' },
    };
    prisma.authorizationAuditLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await repository.create(data);

    expect(prisma.authorizationAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'ROLE_ASSIGNED',
        targetUserId: undefined,
        roleId: 'role-1',
        permissionId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: { source: 'cli' },
      },
    });
    expect(result).toEqual({ id: 'log-1' });
  });
});
