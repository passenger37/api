import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { E2eeSessionRepository } from '../repositories/e2ee-session.repository';
import { EstablishSessionRequestDto } from '../dto/establish-session.request';
import { AcceptSessionRequestDto } from '../dto/accept-session.request';
import { KeyDistributionQueryService } from '../../e2ee-key-distribution/services/key-distribution-query.service';
import { E2eeOneTimePreKeyRepository } from '../../e2ee-devices/repositories/e2ee-one-time-prekey.repository';

const MAX_ESTABLISHMENTS_PER_MINUTE = 20;

@Injectable()
export class E2eeSessionCommandService {
  constructor(
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly keyDistQuery: KeyDistributionQueryService,
    private readonly oneTimePreKeyRepo: E2eeOneTimePreKeyRepository,
  ) {}

  async establishSession(
    callerUserId: string,
    senderDeviceId: string,
    dto: EstablishSessionRequestDto,
  ) {
    const recipientBundles = await this.keyDistQuery.getKeyBundles(
      dto.recipientUserId,
    );
    const recipientDevice = recipientBundles.devices.find(
      (d) => d.deviceId === dto.recipientDeviceId,
    );
    if (!recipientDevice) {
      throw new NotFoundException('Recipient device not found or revoked');
    }

    const existing = await this.sessionRepo.findActiveByDevicePair(
      senderDeviceId,
      dto.recipientDeviceId,
    );
    if (existing) {
      throw new BadRequestException(
        'Active session already exists for this device pair',
      );
    }

    const hasOneTimePrekey = !!dto.oneTimePrekeyId;
    if (hasOneTimePrekey) {
      const claimed = await this.oneTimePreKeyRepo.consumeNext(
        dto.recipientDeviceId,
      );
      if (!claimed || claimed.preKeyId.toString() !== dto.oneTimePrekeyId) {
        throw new BadRequestException(
          'One-time prekey not available or already consumed',
        );
      }
    }

    const sessionState = this.deriveSessionState(
      dto.senderIdentityKey,
      dto.senderEphemeralKey,
      recipientDevice.identityKeyPublic,
      recipientDevice.signedPrekey?.publicKey ?? '',
      recipientDevice.signedPrekey?.signature ?? '',
      hasOneTimePrekey,
    );
    const associatedDataHash = this.computeAssociatedDataHash(
      dto.senderIdentityKey,
      recipientDevice.identityKeyPublic,
    );

    const session = await this.sessionRepo.create({
      senderDevice: { connect: { id: senderDeviceId } },
      recipientDevice: { connect: { id: dto.recipientDeviceId } },
      sessionState,
      associatedDataHash,
    });

    return {
      sessionId: session.id,
      rootKeyCiphertext: session.sessionState,
      chainKeyCiphertext: session.associatedDataHash,
      senderEphemeralPublic: dto.senderEphemeralKey,
    };
  }

  async acceptSession(recipientDeviceId: string, dto: AcceptSessionRequestDto) {
    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session || !session.isActive) {
      throw new NotFoundException('Session not found or archived');
    }
    if (session.recipientDeviceId !== recipientDeviceId) {
      throw new NotFoundException('Session not found');
    }

    const sessionState = this.deriveSessionState(
      dto.senderIdentityKey,
      dto.senderEphemeralPublic,
      dto.recipientIdentityKey,
      '', // recipient's signed prekey - already in stored session
      '',
      !!dto.oneTimePrekeyPublic,
    );
    const associatedDataHash = this.computeAssociatedDataHash(
      dto.senderIdentityKey,
      dto.recipientIdentityKey,
    );

    const updated = await this.sessionRepo.create({
      senderDevice: { connect: { id: session.senderDeviceId } },
      recipientDevice: { connect: { id: recipientDeviceId } },
      sessionState,
      associatedDataHash,
    });

    return {
      sessionId: updated.id,
      rootKeyCiphertext: updated.sessionState,
      chainKeyCiphertext: updated.associatedDataHash,
      senderEphemeralPublic: dto.senderEphemeralPublic,
    };
  }

  private deriveSessionState(
    senderIdentityKey: string,
    senderEphemeralKey: string,
    recipientIdentityKey: string,
    recipientSignedPrekey: string,
    recipientSignedPrekeySignature: string,
    hasOneTimePrekey: boolean,
  ): string {
    const parts = [
      'X3DH',
      senderIdentityKey,
      senderEphemeralKey,
      recipientIdentityKey,
      recipientSignedPrekey,
      recipientSignedPrekeySignature,
      hasOneTimePrekey ? '1' : '0',
    ];
    return Buffer.from(parts.join('|')).toString('base64');
  }

  private computeAssociatedDataHash(
    senderIdentityKey: string,
    recipientIdentityKey: string,
  ): string {
    const data = `AD|${senderIdentityKey}|${recipientIdentityKey}`;
    return Buffer.from(data).toString('base64');
  }
}
