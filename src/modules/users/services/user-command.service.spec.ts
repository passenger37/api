import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { UserCommandService } from './user-command.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UsersRepository } from '../repositories/users.repository';
import { UserSocialRepository } from '../repositories/user-social.repository';
import { UserDomainService } from './user-domain.service';
import { UserProfileDomainService } from './user-profile-domain.service';
import { UserValidationService } from './user-validation.service';
import { FollowActionResult } from '../enums/follow-action-result.enum';

describe('UserCommandService - social graph', () => {
  let service: UserCommandService;
  let prisma: { $transaction: jest.Mock };
  let repository: { findById: jest.Mock };
  let validation: {
    validateUserExists: jest.Mock;
    validateCannotFollowSelf: jest.Mock;
    validateNotAlreadyFollowing: jest.Mock;
    validateNotAlreadyRequested: jest.Mock;
    validateFollowExists: jest.Mock;
    validateCannotBlockSelf: jest.Mock;
    validateNotAlreadyBlocked: jest.Mock;
    validateBlockExists: jest.Mock;
    validateCannotMuteSelf: jest.Mock;
    validateNotAlreadyMuted: jest.Mock;
    validateMuteExists: jest.Mock;
    validateFollowRequestExists: jest.Mock;
    validateCannotAddSelfToCircle: jest.Mock;
    validateAlreadyInCircle: jest.Mock;
    validateNotInCircle: jest.Mock;
  };
  let socialRepository: {
    followUser: jest.Mock;
    unfollowUser: jest.Mock;
    blockUser: jest.Mock;
    unblockUser: jest.Mock;
    muteUser: jest.Mock;
    unmuteUser: jest.Mock;
    sendFollowRequest: jest.Mock;
    cancelFollowRequest: jest.Mock;
    removeFollowRelationship: jest.Mock;
    removeFollowRequestRelationship: jest.Mock;
    existsBlock: jest.Mock;
    addCircleMember: jest.Mock;
    removeCircleMember: jest.Mock;
    existsCircleMember: jest.Mock;
  };

  const tx = { id: 'tx' };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    repository = {
      findById: jest.fn(),
    };
    validation = {
      validateUserExists: jest.fn(),
      validateCannotFollowSelf: jest.fn(),
      validateNotAlreadyFollowing: jest.fn(),
      validateNotAlreadyRequested: jest.fn(),
      validateFollowExists: jest.fn(),
      validateCannotBlockSelf: jest.fn(),
      validateNotAlreadyBlocked: jest.fn(),
      validateBlockExists: jest.fn(),
      validateCannotMuteSelf: jest.fn(),
      validateNotAlreadyMuted: jest.fn(),
      validateMuteExists: jest.fn(),
      validateFollowRequestExists: jest.fn(),
      validateCannotAddSelfToCircle: jest.fn(),
      validateAlreadyInCircle: jest.fn(),
      validateNotInCircle: jest.fn(),
    };
    socialRepository = {
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      sendFollowRequest: jest.fn(),
      cancelFollowRequest: jest.fn(),
      removeFollowRelationship: jest.fn(),
      removeFollowRequestRelationship: jest.fn(),
      existsBlock: jest.fn(),
      addCircleMember: jest.fn(),
      removeCircleMember: jest.fn(),
      existsCircleMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCommandService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserDomainService, useValue: {} },
        { provide: UserProfileDomainService, useValue: {} },
        { provide: UsersRepository, useValue: repository },
        { provide: UserValidationService, useValue: validation },
        { provide: UserSocialRepository, useValue: socialRepository },
      ],
    }).compile();

    service = module.get(UserCommandService);
  });

  describe('followUser', () => {
    it('creates a direct follow for public accounts', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateNotAlreadyFollowing.mockResolvedValue(undefined);
      validation.validateNotAlreadyRequested.mockResolvedValue(undefined);
      repository.findById.mockResolvedValue({
        id: 'target-1',
        isPrivate: false,
      });

      const result = await service.followUser('user-1', 'target-1');

      expect(socialRepository.followUser).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
      expect(result).toEqual({ status: FollowActionResult.FOLLOWED });
    });

    it('sends a follow request for private accounts', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateNotAlreadyFollowing.mockResolvedValue(undefined);
      validation.validateNotAlreadyRequested.mockResolvedValue(undefined);
      repository.findById.mockResolvedValue({
        id: 'target-1',
        isPrivate: true,
      });

      const result = await service.followUser('user-1', 'target-1');

      expect(socialRepository.sendFollowRequest).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
      expect(socialRepository.followUser).not.toHaveBeenCalled();
      expect(result).toEqual({ status: FollowActionResult.REQUEST_SENT });
    });

    it('rejects following yourself', async () => {
      validation.validateCannotFollowSelf.mockImplementation(() => {
        throw new BadRequestException('You cannot follow yourself.');
      });

      await expect(service.followUser('user-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('unfollowUser', () => {
    it('removes an existing follow', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateFollowExists.mockResolvedValue(undefined);

      await service.unfollowUser('user-1', 'target-1');

      expect(socialRepository.unfollowUser).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });

    it('throws when no follow exists', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateFollowExists.mockRejectedValue(
        new NotFoundException('You are not following this user.'),
      );

      await expect(service.unfollowUser('user-1', 'target-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('blockUser', () => {
    it('removes follow relationships and pending follow requests', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateNotAlreadyBlocked.mockResolvedValue(undefined);

      await service.blockUser('user-1', 'target-1');

      expect(socialRepository.blockUser).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
      expect(socialRepository.removeFollowRelationship).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
      expect(
        socialRepository.removeFollowRequestRelationship,
      ).toHaveBeenCalledWith('user-1', 'target-1', tx);
    });

    it('rejects blocking yourself', async () => {
      validation.validateCannotBlockSelf.mockImplementation(() => {
        throw new BadRequestException('You cannot block yourself.');
      });

      await expect(service.blockUser('user-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('unblockUser', () => {
    it('removes an existing block', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateBlockExists.mockResolvedValue(undefined);

      await service.unblockUser('user-1', 'target-1');

      expect(socialRepository.unblockUser).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });
  });

  describe('muteUser / unmuteUser', () => {
    it('creates a mute', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateNotAlreadyMuted.mockResolvedValue(undefined);

      await service.muteUser('user-1', 'target-1');

      expect(socialRepository.muteUser).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });

    it('removes a mute', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateMuteExists.mockResolvedValue(undefined);

      await service.unmuteUser('user-1', 'target-1');

      expect(socialRepository.unmuteUser).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });
  });

  describe('follow requests', () => {
    it('cancels a sent request', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateFollowRequestExists.mockResolvedValue(undefined);

      await service.cancelFollowRequest('user-1', 'target-1');

      expect(socialRepository.cancelFollowRequest).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });

    it('accepts a request by creating the follow and removing the request', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateFollowRequestExists.mockResolvedValue(undefined);

      await service.acceptFollowRequest('receiver-1', 'requester-1');

      expect(socialRepository.followUser).toHaveBeenCalledWith(
        'requester-1',
        'receiver-1',
        tx,
      );
      expect(socialRepository.cancelFollowRequest).toHaveBeenCalledWith(
        'requester-1',
        'receiver-1',
        tx,
      );
    });

    it('rejects a request by removing it without creating a follow', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateFollowRequestExists.mockResolvedValue(undefined);

      await service.rejectFollowRequest('receiver-1', 'requester-1');

      expect(socialRepository.cancelFollowRequest).toHaveBeenCalledWith(
        'requester-1',
        'receiver-1',
        tx,
      );
      expect(socialRepository.followUser).not.toHaveBeenCalled();
    });
  });

  describe('addCircleMember', () => {
    it('adds a member with no active block relationship', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateAlreadyInCircle.mockResolvedValue(undefined);
      socialRepository.existsBlock.mockResolvedValue(false);

      await service.addCircleMember('user-1', 'target-1');

      expect(socialRepository.existsBlock).toHaveBeenCalledTimes(2);
      expect(socialRepository.addCircleMember).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });

    it('rejects adding a user with an active block relationship', async () => {
      validation.validateUserExists.mockResolvedValue(undefined);
      validation.validateAlreadyInCircle.mockResolvedValue(undefined);
      socialRepository.existsBlock.mockResolvedValue(true);

      await expect(
        service.addCircleMember('user-1', 'target-1'),
      ).rejects.toThrow(ConflictException);
      expect(socialRepository.addCircleMember).not.toHaveBeenCalled();
    });

    it('rejects adding yourself to the circle', async () => {
      validation.validateCannotAddSelfToCircle.mockImplementation(() => {
        throw new BadRequestException('You cannot add yourself to the circle.');
      });

      await expect(service.addCircleMember('user-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeCircleMember', () => {
    it('removes an existing circle member', async () => {
      validation.validateNotInCircle.mockResolvedValue(undefined);

      await service.removeCircleMember('user-1', 'target-1');

      expect(socialRepository.removeCircleMember).toHaveBeenCalledWith(
        'user-1',
        'target-1',
        tx,
      );
    });

    it('throws when the member is not in the circle', async () => {
      socialRepository.existsCircleMember.mockResolvedValue(false);
      validation.validateNotInCircle.mockRejectedValue(
        new NotFoundException('User is not in your circle.'),
      );

      await expect(
        service.removeCircleMember('user-1', 'target-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
