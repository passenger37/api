import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { E2eeRatchetStateRepository } from '../repositories/e2ee-ratchet-state.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeRatchetState } from '@prisma/client';
import {
  serializeEncryptResult,
  serializeDecryptResult,
  serializeRatchetStepResult,
} from '../serializers/e2ee-ratchet.serializer';
import {
  EncryptRequestDto,
  DecryptRequestDto,
  RatchetStepRequestDto,
} from '../dto/ratchet.request';

const ROOT_INFO = 'NexusRatchetRoot';
const CHAIN_BOOTSTRAP_INFO = 'NexusRatchetChainInit';
const MESSAGE_KEY_SEED = Buffer.from([0x01]);
const NEXT_CHAIN_KEY_SEED = Buffer.from([0x02]);
const MAX_SKIPPED_KEYS = 1000;

interface RatchetHeader {
  dhPublic: string;
  messageNumber: number;
  previousChainLength: number;
}

@Injectable()
export class E2eeRatchetCommandService {
  constructor(
    private readonly ratchetStateRepo: E2eeRatchetStateRepository,
    private readonly sessionRepo: E2eeSessionRepository,
  ) {}

  async encrypt(userId: string, dto: EncryptRequestDto) {
    const state = await this.ensureState(dto.sessionId);
    if (!state.sendingChainKey) {
      throw new BadRequestException('Sending chain not initialized');
    }

    const { messageKey, nextChainKey } = this.kdfChainKey(state.sendingChainKey);
    const header: RatchetHeader = {
      dhPublic: state.nextDhPublicKey ?? '',
      messageNumber: state.sendingMessageNumber,
      previousChainLength: state.previousReceivingChainLength,
    };
    const ciphertext = this.aesEncrypt(
      messageKey,
      dto.plaintext,
      this.buildAssociatedData(header, dto.associatedData),
    );

    await this.ratchetStateRepo.update(dto.sessionId, {
      sendingChainKey: nextChainKey,
      sendingMessageNumber: state.sendingMessageNumber + 1,
    });

    return serializeEncryptResult(ciphertext, header);
  }

  async decrypt(userId: string, dto: DecryptRequestDto) {
    const header = this.parseHeader(dto.header);
    const state = await this.ensureState(dto.sessionId);

    if (
      (state.remoteDhPublicKey ?? '') !== '' &&
      header.dhPublic !== state.remoteDhPublicKey
    ) {
      this.skipMessageKeys(state, header.previousChainLength);
      await this.dhRatchetStep(state, header.dhPublic);
    } else if ((state.remoteDhPublicKey ?? '') === '') {
      state.remoteDhPublicKey = header.dhPublic;
    }

    const skippedId = `${header.dhPublic}:${header.messageNumber}`;
    let usedSkipped = false;
    let messageKey: Buffer;

    if (header.messageNumber < state.receivingMessageNumber) {
      const currentSkipped = this.parseSkippedKeys(state.skippedMessageKeys);
      const skipped = currentSkipped[skippedId];
      if (!skipped) {
        throw new BadRequestException(
          'Message key not available for this message number',
        );
      }
      usedSkipped = true;
      messageKey = Buffer.from(skipped, 'base64');
    } else {
      this.skipMessageKeys(state, header.messageNumber);
      const advanced = this.kdfChainKey(state.receivingChainKey);
      messageKey = advanced.messageKey;
      state.receivingChainKey = advanced.nextChainKey;
      state.receivingMessageNumber += 1;
    }

    const plaintext = this.aesDecrypt(
      messageKey,
      dto.ciphertext,
      this.buildAssociatedData(header, dto.associatedData),
    );

    const finalSkipped = this.parseSkippedKeys(state.skippedMessageKeys);
    if (usedSkipped) {
      delete finalSkipped[skippedId];
    }

    await this.ratchetStateRepo.update(dto.sessionId, {
      rootKey: state.rootKey,
      sendingChainKey: state.sendingChainKey,
      receivingChainKey: state.receivingChainKey,
      sendingMessageNumber: state.sendingMessageNumber,
      receivingMessageNumber: state.receivingMessageNumber,
      previousReceivingChainLength: state.previousReceivingChainLength,
      nextDhPublicKey: state.nextDhPublicKey,
      currentDhPrivateKey: state.currentDhPrivateKey,
      remoteDhPublicKey: state.remoteDhPublicKey,
      skippedMessageKeys: JSON.stringify(finalSkipped),
    });

    return serializeDecryptResult(plaintext);
  }

  async ratchetStep(userId: string, dto: RatchetStepRequestDto) {
    const state = await this.ensureState(dto.sessionId);
    await this.dhRatchetStep(state, dto.remoteDhPublic);
    await this.ratchetStateRepo.update(dto.sessionId, {
      rootKey: state.rootKey,
      sendingChainKey: state.sendingChainKey,
      receivingChainKey: state.receivingChainKey,
      sendingMessageNumber: state.sendingMessageNumber,
      receivingMessageNumber: state.receivingMessageNumber,
      previousReceivingChainLength: state.previousReceivingChainLength,
      nextDhPublicKey: state.nextDhPublicKey,
      currentDhPrivateKey: state.currentDhPrivateKey,
      remoteDhPublicKey: state.remoteDhPublicKey,
    });
    return serializeRatchetStepResult(
      state.nextDhPublicKey ?? '',
      state.rootKey,
    );
  }

  private async ensureState(sessionId: string): Promise<E2eeRatchetState> {
    const existing = await this.ratchetStateRepo.findBySessionId(sessionId);
    if (existing) {
      return existing;
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session || !session.isActive) {
      throw new NotFoundException('Session not found or archived');
    }

    const rootKey = this.rootKeyFromSessionState(session.sessionState);
    const { privateDer, publicDer } = this.generateDhKeyPair();
    const created = await this.ratchetStateRepo.create({
      session: { connect: { id: sessionId } },
      rootKey,
      sendingChainKey: this.deriveBootstrapChain(rootKey, CHAIN_BOOTSTRAP_INFO),
      receivingChainKey: this.deriveBootstrapChain(rootKey, CHAIN_BOOTSTRAP_INFO),
      nextDhPublicKey: publicDer,
      currentDhPrivateKey: privateDer,
    });
    return created;
  }

  private async dhRatchetStep(
    state: E2eeRatchetState,
    remoteDhPublic: string,
  ): Promise<void> {
    const remoteKey = this.importDhPublic(remoteDhPublic);
    const previousPrivate = this.importDhPrivate(
      state.currentDhPrivateKey ?? '',
    );

    const first = this.kdfRootKey(
      state.rootKey,
      crypto.diffieHellman({ privateKey: previousPrivate, publicKey: remoteKey }),
    );

    const { privateDer, publicDer } = this.generateDhKeyPair();
    const second = this.kdfRootKey(
      first.rootKey,
      crypto.diffieHellman({
        privateKey: this.importDhPrivate(privateDer),
        publicKey: remoteKey,
      }),
    );

    state.previousReceivingChainLength = state.sendingMessageNumber;
    state.sendingMessageNumber = 0;
    state.receivingMessageNumber = 0;
    state.rootKey = second.rootKey;
    state.sendingChainKey = second.chainKey;
    state.receivingChainKey = first.chainKey;
    state.nextDhPublicKey = publicDer;
    state.currentDhPrivateKey = privateDer;
    state.remoteDhPublicKey = remoteDhPublic;
  }

  private skipMessageKeys(
    state: E2eeRatchetState,
    until: number,
  ): void {
    if (until - state.receivingMessageNumber > MAX_SKIPPED_KEYS) {
      throw new BadRequestException('Too many skipped message keys');
    }
    const skippedMap = this.parseSkippedKeys(state.skippedMessageKeys);
    const chainDhPublic = state.remoteDhPublicKey ?? '';
    while (state.receivingMessageNumber < until) {
      if (Object.keys(skippedMap).length >= MAX_SKIPPED_KEYS) {
        throw new BadRequestException('Too many skipped message keys');
      }
      const { messageKey, nextChainKey } = this.kdfChainKey(
        state.receivingChainKey,
      );
      skippedMap[
        `${chainDhPublic}:${state.receivingMessageNumber}`
      ] = messageKey.toString('base64');
      state.receivingChainKey = nextChainKey;
      state.receivingMessageNumber += 1;
    }
    state.skippedMessageKeys = JSON.stringify(skippedMap);
  }

  private rootKeyFromSessionState(sessionState: string): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(sessionState, 'base64'))
      .digest('base64');
  }

  private deriveBootstrapChain(rootKey: string, info: string): string {
    const derived = Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(rootKey, 'base64'),
        Buffer.alloc(0),
        Buffer.from(info),
        32,
      ),
    );
    return derived.toString('base64');
  }

  private kdfRootKey(
    rootKey: string,
    dhSecret: Buffer,
  ): { rootKey: string; chainKey: string } {
    const derived = Buffer.from(
      crypto.hkdfSync(
        'sha256',
        dhSecret,
        Buffer.from(rootKey, 'base64'),
        Buffer.from(ROOT_INFO),
        64,
      ),
    );
    return {
      rootKey: derived.subarray(0, 32).toString('base64'),
      chainKey: derived.subarray(32, 64).toString('base64'),
    };
  }

  private kdfChainKey(chainKey: string): {
    messageKey: Buffer;
    nextChainKey: string;
  } {
    const key = Buffer.from(chainKey, 'base64');
    return {
      messageKey: crypto.createHmac('sha256', key).update(MESSAGE_KEY_SEED).digest(),
      nextChainKey: crypto
        .createHmac('sha256', key)
        .update(NEXT_CHAIN_KEY_SEED)
        .digest()
        .toString('base64'),
    };
  }

  private buildAssociatedData(
    header: RatchetHeader,
    associatedData?: string,
  ): string {
    return [header.dhPublic, header.messageNumber, header.previousChainLength, associatedData ?? ''].join('|');
  }

  private parseHeader(raw: string): RatchetHeader {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Invalid ratchet header');
    }
    const header = parsed as Partial<RatchetHeader>;
    if (
      typeof header?.dhPublic !== 'string' ||
      !header.dhPublic ||
      typeof header?.messageNumber !== 'number' ||
      header.messageNumber < 0 ||
      !Number.isInteger(header.messageNumber) ||
      typeof header?.previousChainLength !== 'number' ||
      header.previousChainLength < 0 ||
      !Number.isInteger(header.previousChainLength)
    ) {
      throw new BadRequestException('Invalid ratchet header');
    }
    return {
      dhPublic: header.dhPublic,
      messageNumber: header.messageNumber,
      previousChainLength: header.previousChainLength,
    };
  }

  private parseSkippedKeys(raw: string): Record<string, string> {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private generateDhKeyPair(): { privateDer: string; publicDer: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519');
    return {
      privateDer: privateKey
        .export({ type: 'pkcs8', format: 'der' })
        .toString('base64'),
      publicDer: publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64'),
    };
  }

  private importDhPublic(publicDer: string): crypto.KeyObject {
    try {
      return crypto.createPublicKey({
        key: Buffer.from(publicDer, 'base64'),
        format: 'der',
        type: 'spki',
      });
    } catch {
      throw new BadRequestException('Invalid remote DH public key');
    }
  }

  private importDhPrivate(privateDer: string): crypto.KeyObject {
    try {
      return crypto.createPrivateKey({
        key: Buffer.from(privateDer, 'base64'),
        format: 'der',
        type: 'pkcs8',
      });
    } catch {
      throw new BadRequestException('Invalid local DH private key');
    }
  }

  private aesEncrypt(
    messageKey: Buffer,
    plaintext: string,
    associatedData: string,
  ): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', messageKey, iv);
    cipher.setAAD(Buffer.from(associatedData));
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  private aesDecrypt(
    messageKey: Buffer,
    ciphertext: string,
    associatedData: string,
  ): string {
    const raw = Buffer.from(ciphertext, 'base64');
    if (raw.length < 12 + 16) {
      throw new BadRequestException('Invalid ciphertext');
    }
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const data = raw.subarray(12, raw.length - 16);
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', messageKey, iv);
      decipher.setAAD(Buffer.from(associatedData));
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new BadRequestException('Message decryption failed');
    }
  }
}
