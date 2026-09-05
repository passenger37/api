import { Injectable } from '@nestjs/common';
import {
  ProtocolAddress,
  SessionRecord,
  SessionStore,
  IdentityKeyStore,
  PreKeyStore,
  SignedPreKeyStore,
  KyberPreKeyStore,
  IdentityChange,
  Direction,
  PreKeyRecord,
  SignedPreKeyRecord,
  KyberPreKeyRecord,
  PublicKey,
  PrivateKey,
  IdentityKeyPair,
  Uuid,
} from '@signalapp/libsignal-client';

import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { E2eeOneTimePreKeyRepository } from '../../e2ee-devices/repositories/e2ee-one-time-prekey.repository';
import { E2eeSignedPreKeyRepository } from '../../e2ee-devices/repositories/e2ee-signed-prekey.repository';
import { E2eeRatchetStateRepository } from '../repositories/e2ee-ratchet-state.repository';

@Injectable()
export class LibsignalSessionStore implements SessionStore {
  constructor(
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly ratchetStateRepo: E2eeRatchetStateRepository,
  ) {}

  async saveSession(name: ProtocolAddress, record: SessionRecord): Promise<void> {
    const session = await this.sessionRepo.findBySenderAndRecipient(
      name.name(),
      String(name.deviceId()),
    );
    if (!session) return;

    await this.ratchetStateRepo.upsertSessionRecord(session.id, record.serialize());
  }

  async getSession(name: ProtocolAddress): Promise<SessionRecord | null> {
    const session = await this.sessionRepo.findBySenderAndRecipient(
      name.name(),
      String(name.deviceId()),
    );
    if (!session) return null;

    const state = await this.ratchetStateRepo.findBySessionId(session.id);
    if (!state || !state.sessionState) return null;

    return SessionRecord.deserialize(Buffer.from(state.sessionState, 'base64'));
  }

  async getExistingSessions(addresses: ProtocolAddress[]): Promise<SessionRecord[]> {
    const records: SessionRecord[] = [];
    for (const addr of addresses) {
      const record = await this.getSession(addr);
      if (record) records.push(record);
    }
    return records;
  }
}

@Injectable()
export class LibsignalIdentityKeyStore implements IdentityKeyStore {
  constructor(
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getIdentityKey(): Promise<any> {
    throw new Error('getIdentityKey not available on server');
  }

  async getIdentityKeyPair(): Promise<any> {
    throw new Error('getIdentityKeyPair not available on server');
  }

  async getLocalRegistrationId(): Promise<number> {
    return 1;
  }

  async saveIdentity(
    name: ProtocolAddress,
    key: PublicKey,
  ): Promise<IdentityChange> {
    return IdentityChange.NewOrUnchanged;
  }

  async isTrustedIdentity(
    name: ProtocolAddress,
    key: PublicKey,
    direction: Direction,
  ): Promise<boolean> {
    return true;
  }

  async getIdentity(name: ProtocolAddress): Promise<PublicKey | null> {
    const device = await this.deviceRepo.findById(name.name());
    if (!device) return null;

    return PublicKey.deserialize(Buffer.from(device.identityKeyPublic, 'base64'));
  }
}

@Injectable()
export class LibsignalPreKeyStore implements PreKeyStore {
  constructor(
    private readonly preKeyRepo: E2eeOneTimePreKeyRepository,
  ) {}

  async savePreKey(id: number, record: any): Promise<void> {}

  async getPreKey(id: number): Promise<PreKeyRecord> {
    throw new Error('PreKey private keys not stored on server');
  }

  async removePreKey(id: number): Promise<void> {
    await this.preKeyRepo.markConsumed(String(id));
  }
}

@Injectable()
export class LibsignalSignedPreKeyStore implements SignedPreKeyStore {
  constructor(
    private readonly signedPreKeyRepo: E2eeSignedPreKeyRepository,
  ) {}

  async saveSignedPreKey(id: number, record: any): Promise<void> {}

  async getSignedPreKey(id: number): Promise<SignedPreKeyRecord> {
    throw new Error('SignedPreKey private key not stored on server');
  }
}

@Injectable()
export class LibsignalKyberPreKeyStore implements KyberPreKeyStore {
  constructor() {}

  async saveKyberPreKey(
    kyberPreKeyId: number,
    record: KyberPreKeyRecord,
  ): Promise<void> {}

  async getKyberPreKey(kyberPreKeyId: number): Promise<KyberPreKeyRecord> {
    throw new Error('KyberPreKey private key not stored on server');
  }

  async markKyberPreKeyUsed(
    kyberPreKeyId: number,
    signedPreKeyId: number,
    baseKey: PublicKey,
  ): Promise<void> {}
}