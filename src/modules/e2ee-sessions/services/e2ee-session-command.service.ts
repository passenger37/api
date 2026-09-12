import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { E2eeSessionRepository } from '../repositories/e2ee-session.repository';
import { EstablishSessionRequestDto } from '../dto/establish-session.request';
import { AcceptSessionRequestDto } from '../dto/accept-session.request';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { E2eeSignedPreKeyRepository } from '../../e2ee-devices/repositories/e2ee-signed-prekey.repository';
import { E2eeOneTimePreKeyRepository } from '../../e2ee-devices/repositories/e2ee-one-time-prekey.repository';

/**
 * Session establishment is metadata-only: the client performs all X3DH/DH
 * ratchet cryptography locally and the server persists nothing but a public
 * descriptor (device pair + lifecycle timestamps). No session, root, chain,
 * or identity secrets ever reach the backend.
 */
@Injectable()
export class E2eeSessionCommandService {
  constructor(
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly signedPreKeyRepo: E2eeSignedPreKeyRepository,
    private readonly oneTimePreKeyRepo: E2eeOneTimePreKeyRepository,
  ) {}

  async establishSession(
    callerUserId: string,
    dto: EstablishSessionRequestDto,
  ) {
    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== callerUserId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    const recipientDevice = await this.deviceRepo.findById(
      dto.recipientDeviceId,
    );
    if (!recipientDevice || recipientDevice.userId !== dto.recipientUserId) {
      throw new NotFoundException(
        'Recipient device not found or does not belong to the recipient',
      );
    }
    if (recipientDevice.isRevoked) {
      throw new BadRequestException('Recipient device is revoked');
    }

    const activeSignedPreKey = await this.signedPreKeyRepo.findActive(
      dto.recipientDeviceId,
    );
    if (!activeSignedPreKey) {
      throw new BadRequestException(
        'Recipient device has no active signed prekey',
      );
    }

    if (dto.oneTimePrekeyId) {
      const claimed = await this.oneTimePreKeyRepo.consumeNext(
        dto.recipientDeviceId,
      );
      if (!claimed || claimed.preKeyId.toString() !== dto.oneTimePrekeyId) {
        throw new BadRequestException(
          'One-time prekey not available or already consumed',
        );
      }
    }

    const existing = await this.sessionRepo.findActiveByDevicePair(
      dto.senderDeviceId,
      dto.recipientDeviceId,
    );
    if (existing) {
      // Re-establishment supersedes the previous session (new OTPK → new ratchet).
      await this.sessionRepo.archive(existing.id);
    }

    const session = await this.sessionRepo.create({
      senderDevice: { connect: { id: dto.senderDeviceId } },
      recipientDevice: { connect: { id: dto.recipientDeviceId } },
    });

    return {
      sessionId: session.id,
      senderDeviceId: session.senderDeviceId,
      recipientDeviceId: session.recipientDeviceId,
    };
  }

  async acceptSession(callerUserId: string, dto: AcceptSessionRequestDto) {
    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session || !session.isActive) {
      throw new NotFoundException('Session not found or archived');
    }
    if (session.recipientDeviceId !== dto.recipientDeviceId) {
      throw new NotFoundException('Session not found');
    }

    const recipientDevice = await this.deviceRepo.findById(
      dto.recipientDeviceId,
    );
    if (!recipientDevice || recipientDevice.userId !== callerUserId) {
      throw new ForbiddenException(
        'Recipient device does not belong to the caller',
      );
    }
    if (recipientDevice.isRevoked) {
      throw new BadRequestException('Recipient device is revoked');
    }

    if (session.acceptedAt) {
      return {
        sessionId: session.id,
        senderDeviceId: session.senderDeviceId,
        recipientDeviceId: session.recipientDeviceId,
        acceptedAt: session.acceptedAt,
      };
    }

    const accepted = await this.sessionRepo.accept(dto.sessionId);

    return {
      sessionId: accepted.id,
      senderDeviceId: accepted.senderDeviceId,
      recipientDeviceId: accepted.recipientDeviceId,
      acceptedAt: accepted.acceptedAt,
    };
  }
}
