import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ReportStatus } from '@prisma/client';

import { ReportService } from './report.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { MessageReportRepository } from '../repositories/message-report.repository';
import { UserReportRepository } from '../repositories/user-report.repository';
import { ChannelMessageQueryService } from '../../messages/services/channel-message-query.service';
import { ChannelMessageValidationService } from '../../messages/services/channel-message-validation.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { ModerationAuditRepository } from '../../servers/repositories/moderation-audit.repository';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: { $transaction: jest.Mock };
  let messageReportRepository: {
    create: jest.Mock;
    findByMessageAndReporter: jest.Mock;
    findById: jest.Mock;
    listByServer: jest.Mock;
    updateStatus: jest.Mock;
  };
  let userReportRepository: {
    create: jest.Mock;
    findByReporterAndTarget: jest.Mock;
    findById: jest.Mock;
    listByServer: jest.Mock;
    updateStatus: jest.Mock;
  };
  let messageQueryService: { getMessage: jest.Mock };
  let messageValidation: { validateChannelViewPermission: jest.Mock };
  let memberQueryService: { getMemberOrThrow: jest.Mock; getMember: jest.Mock };
  let permissionService: {
    hasPermission: jest.Mock;
    requirePermission: jest.Mock;
  };
  let auditRepository: { create: jest.Mock };

  const reporter = { id: 'member-1', userId: 'user-1', serverId: 'srv-1' };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(undefined)),
    };
    messageReportRepository = {
      create: jest.fn(),
      findByMessageAndReporter: jest.fn(),
      findById: jest.fn(),
      listByServer: jest.fn(),
      updateStatus: jest.fn(),
    };
    userReportRepository = {
      create: jest.fn(),
      findByReporterAndTarget: jest.fn(),
      findById: jest.fn(),
      listByServer: jest.fn(),
      updateStatus: jest.fn(),
    };
    messageQueryService = { getMessage: jest.fn() };
    messageValidation = { validateChannelViewPermission: jest.fn() };
    memberQueryService = {
      getMemberOrThrow: jest.fn(),
      getMember: jest.fn(),
    };
    permissionService = {
      hasPermission: jest.fn(),
      requirePermission: jest.fn(),
    };
    auditRepository = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: MessageReportRepository, useValue: messageReportRepository },
        { provide: UserReportRepository, useValue: userReportRepository },
        { provide: ChannelMessageQueryService, useValue: messageQueryService },
        {
          provide: ChannelMessageValidationService,
          useValue: messageValidation,
        },
        { provide: ServerMemberQueryService, useValue: memberQueryService },
        { provide: ServerPermissionService, useValue: permissionService },
        { provide: ModerationAuditRepository, useValue: auditRepository },
      ],
    }).compile();

    service = module.get(ReportService);
  });

  describe('submitMessageReport', () => {
    it('should create a report for another user message', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      messageQueryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        serverId: 'srv-1',
        channelId: 'ch1',
        authorMemberId: 'author-1',
        isDeleted: false,
      });
      messageValidation.validateChannelViewPermission.mockResolvedValue({});
      messageReportRepository.findByMessageAndReporter.mockResolvedValue(null);
      messageReportRepository.create.mockImplementation((data) =>
        Promise.resolve({
          ...data,
          id: 'report-1',
          status: 'PENDING',
          detailText: null,
          handledByMemberId: null,
          handledAt: null,
          createdAt: new Date(),
        }),
      );

      const result = await service.submitMessageReport('srv-1', 'user-1', {
        messageId: 'msg-1',
        reason: 'SPAM',
      });

      expect(messageReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 'srv-1',
          channelId: 'ch1',
          messageId: 'msg-1',
          reporterMemberId: 'member-1',
          reason: 'SPAM',
        }),
      );
      expect(result.id).toBe('report-1');
    });

    it('should reject reporting your own message', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      messageQueryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        serverId: 'srv-1',
        channelId: 'ch1',
        authorMemberId: 'member-1',
        isDeleted: false,
      });

      await expect(
        service.submitMessageReport('srv-1', 'user-1', {
          messageId: 'msg-1',
          reason: 'SPAM',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject messages from another server', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      messageQueryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        serverId: 'other-server',
        channelId: 'ch1',
      });

      await expect(
        service.submitMessageReport('srv-1', 'user-1', {
          messageId: 'msg-1',
          reason: 'SPAM',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should be idempotent for an existing report', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      messageQueryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        serverId: 'srv-1',
        channelId: 'ch1',
        authorMemberId: 'author-1',
        isDeleted: false,
      });
      messageValidation.validateChannelViewPermission.mockResolvedValue({});
      messageReportRepository.findByMessageAndReporter.mockResolvedValue({
        id: 'report-1',
        serverId: 'srv-1',
        channelId: 'ch1',
        messageId: 'msg-1',
        reporterMemberId: 'member-1',
        reason: 'SPAM',
        detailText: null,
        status: 'PENDING',
        handledByMemberId: null,
        handledAt: null,
        createdAt: new Date(),
      });

      const result = await service.submitMessageReport('srv-1', 'user-1', {
        messageId: 'msg-1',
        reason: 'SPAM',
      });

      expect(messageReportRepository.create).not.toHaveBeenCalled();
      expect(result.id).toBe('report-1');
    });
  });

  describe('submitUserReport', () => {
    it('should create a report for an active target member', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      memberQueryService.getMember.mockResolvedValue({ id: 'target-member' });
      userReportRepository.findByReporterAndTarget.mockResolvedValue(null);
      userReportRepository.create.mockImplementation((data) =>
        Promise.resolve({
          ...data,
          id: 'ureport-1',
          status: 'PENDING',
          detailText: null,
          handledByMemberId: null,
          handledAt: null,
          createdAt: new Date(),
        }),
      );

      const result = await service.submitUserReport('srv-1', 'user-1', {
        targetUserId: 'user-2',
        reason: 'HARASSMENT',
      });

      expect(userReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 'srv-1',
          reporterMemberId: 'member-1',
          targetUserId: 'user-2',
          reason: 'HARASSMENT',
        }),
      );
      expect(result.id).toBe('ureport-1');
    });

    it('should reject self-reports', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);

      await expect(
        service.submitUserReport('srv-1', 'user-1', {
          targetUserId: 'user-1',
          reason: 'OTHER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require the target to be an active member', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      memberQueryService.getMember.mockRejectedValue(
        new NotFoundException('Server member not found.'),
      );

      await expect(
        service.submitUserReport('srv-1', 'user-1', {
          targetUserId: 'user-2',
          reason: 'OTHER',
        }),
      ).rejects.toThrow(NotFoundException);
    });
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

  describe('resolveMessageReport', () => {
    it('should update the report and write an audit entry', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      messageReportRepository.findById.mockResolvedValue({
        id: 'report-1',
        serverId: 'srv-1',
        messageId: 'msg-1',
        channelId: 'ch1',
        reporterMemberId: 'member-1',
        reason: 'SPAM',
        status: 'PENDING',
      });
      messageReportRepository.updateStatus.mockImplementation((_id, data) =>
        Promise.resolve({
          id: 'report-1',
          ...data,
          reason: 'SPAM',
          createdAt: new Date(),
        }),
      );

      const result = await service.resolveMessageReport(
        'srv-1',
        'user-1',
        'report-1',
        { status: ReportStatus.RESOLVED, note: 'removed' },
      );

      expect(messageReportRepository.updateStatus).toHaveBeenCalledWith(
        'report-1',
        expect.objectContaining({
          status: ReportStatus.RESOLVED,
          handledByMemberId: 'member-1',
        }),
        undefined,
      );
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MESSAGE_REPORT_RESOLVED',
          metadata: expect.objectContaining({ messageId: 'msg-1' }),
        }),
        undefined,
      );
      expect(result.status).toBe(ReportStatus.RESOLVED);
    });

    it('should reject already-handled reports', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      messageReportRepository.findById.mockResolvedValue({
        id: 'report-1',
        serverId: 'srv-1',
        status: 'RESOLVED',
      });

      await expect(
        service.resolveMessageReport('srv-1', 'user-1', 'report-1', {
          status: ReportStatus.DISMISSED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveUserReport', () => {
    it('should require MEMBER_BAN permission', async () => {
      permissionService.requirePermission.mockRejectedValue(
        new ForbiddenException('Missing permission: MEMBER_BAN'),
      );

      await expect(
        service.resolveUserReport('srv-1', 'user-1', 'ureport-1', {
          status: ReportStatus.RESOLVED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update and audit a user report', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(reporter);
      userReportRepository.findById.mockResolvedValue({
        id: 'ureport-1',
        serverId: 'srv-1',
        reporterMemberId: 'member-1',
        targetUserId: 'user-2',
        reason: 'HARASSMENT',
        status: 'PENDING',
      });
      userReportRepository.updateStatus.mockImplementation((_id, data) =>
        Promise.resolve({
          id: 'ureport-1',
          ...data,
          reason: 'HARASSMENT',
          createdAt: new Date(),
        }),
      );

      const result = await service.resolveUserReport(
        'srv-1',
        'user-1',
        'ureport-1',
        { status: ReportStatus.DISMISSED },
      );

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_REPORT_RESOLVED',
          targetUserId: 'user-2',
        }),
        undefined,
      );
      expect(result.status).toBe(ReportStatus.DISMISSED);
    });
  });
});
