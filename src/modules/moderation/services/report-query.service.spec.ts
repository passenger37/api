import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';

import { ReportStatus } from '@prisma/client';

import { ReportQueryService } from './report-query.service';
import { MessageReportRepository } from '../repositories/message-report.repository';
import { UserReportRepository } from '../repositories/user-report.repository';
import { ServerPermissionService } from '../../servers/services/server-permission.service';

describe('ReportQueryService', () => {
  let service: ReportQueryService;
  let messageReportRepository: { listByServer: jest.Mock };
  let userReportRepository: { listByServer: jest.Mock };
  let permissionService: { hasPermission: jest.Mock };

  beforeEach(async () => {
    messageReportRepository = { listByServer: jest.fn() };
    userReportRepository = { listByServer: jest.fn() };
    permissionService = { hasPermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportQueryService,
        { provide: MessageReportRepository, useValue: messageReportRepository },
        { provide: UserReportRepository, useValue: userReportRepository },
        { provide: ServerPermissionService, useValue: permissionService },
      ],
    }).compile();

    service = module.get(ReportQueryService);
  });

  describe('listMessageReports', () => {
    it('should deny members without queue access', async () => {
      permissionService.hasPermission
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await expect(
        service.listMessageReports('srv-1', 'user-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should list pending reports for a moderator', async () => {
      permissionService.hasPermission
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      messageReportRepository.listByServer.mockResolvedValue([]);

      const result = await service.listMessageReports('srv-1', 'user-1', {});

      expect(messageReportRepository.listByServer).toHaveBeenCalledWith(
        'srv-1',
        {
          status: ReportStatus.PENDING,
          cursorId: undefined,
          limit: undefined,
        },
      );
      expect(result.items).toEqual([]);
    });
  });

  describe('listUserReports', () => {
    it('should list pending user reports for a queue viewer', async () => {
      permissionService.hasPermission
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      userReportRepository.listByServer.mockResolvedValue([]);

      const result = await service.listUserReports('srv-1', 'user-1', {});

      expect(userReportRepository.listByServer).toHaveBeenCalledWith('srv-1', {
        status: ReportStatus.PENDING,
        cursorId: undefined,
        limit: undefined,
      });
      expect(result.items).toEqual([]);
    });
  });
});
