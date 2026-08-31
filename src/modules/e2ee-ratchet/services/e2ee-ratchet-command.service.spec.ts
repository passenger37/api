import { E2eeRatchetCommandService } from './e2ee-ratchet-command.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

describe('E2eeRatchetCommandService', () => {
  let service: E2eeRatchetCommandService;
  let store: Map<string, any>;
  let ratchetStateRepo: any;
  let sessionRepo: any;

  const sessionSeed = randomBytes(48).toString('base64');

  const rowFromState = (state: any) => ({ ...state });

  beforeEach(() => {
    store = new Map();
    ratchetStateRepo = {
      findBySessionId: jest.fn(async (sessionId: string) => {
        const row = store.get(sessionId);
        return row ? rowFromState(row) : null;
      }),
      create: jest.fn(async (data: any) => {
        const row = {
          id: `ratchet-${store.size + 1}`,
          sessionId: data.session.connect.id,
          rootKey: data.rootKey,
          sendingChainKey: data.sendingChainKey,
          receivingChainKey: data.receivingChainKey,
          sendingMessageNumber: 0,
          receivingMessageNumber: 0,
          previousReceivingChainLength: 0,
          skippedMessageKeys: '{}',
          nextDhPublicKey: data.nextDhPublicKey,
          currentDhPrivateKey: data.currentDhPrivateKey,
          remoteDhPublicKey: null,
        };
        store.set(row.sessionId, row);
        return rowFromState(row);
      }),
      update: jest.fn(async (sessionId: string, data: any) => {
        const row = store.get(sessionId);
        Object.assign(row, data);
        return rowFromState(row);
      }),
    };
    sessionRepo = {
      findById: jest.fn(async (sessionId: string) => {
        if (sessionId === 'missing') return null;
        return {
          id: sessionId,
          isActive: true,
          sessionState: sessionSeed,
        };
      }),
    };

    service = new E2eeRatchetCommandService(
      ratchetStateRepo,
      sessionRepo as any,
    );
  });

  describe('encrypt', () => {
    it('bootstraps state from the session and returns a header at message number 0', async () => {
      const result = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'hello',
      });

      expect(result.ciphertext).toBeTruthy();
      expect(result.header.messageNumber).toBe(0);
      expect(result.header.previousChainLength).toBe(0);
      expect(result.header.dhPublic).toBeTruthy();
      expect(sessionRepo.findById).toHaveBeenCalledWith('s1');
    });

    it('advances the sending chain on each message', async () => {
      const first = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'one',
      });
      const second = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'two',
      });

      expect(first.header.messageNumber).toBe(0);
      expect(second.header.messageNumber).toBe(1);
      const row = store.get('s1');
      expect(row.sendingMessageNumber).toBe(2);
    });

    it('throws NotFound when the session does not exist', async () => {
      await expect(
        service.encrypt('userA', { sessionId: 'missing', plaintext: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('decrypt round-trip', () => {
    it('decrypts a message encrypted from a peer session with the same seed', async () => {
      const sender = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'secret payload',
        associatedData: 'ad',
      });
      const decrypted = await service.decrypt('userB', {
        sessionId: 's2',
        ciphertext: sender.ciphertext,
        header: JSON.stringify(sender.header),
        associatedData: 'ad',
      });

      expect(decrypted.plaintext).toBe('secret payload');
    });

    it('fails when associated data does not match', async () => {
      const sender = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'secret payload',
        associatedData: 'ad',
      });

      await expect(
        service.decrypt('userB', {
          sessionId: 's2',
          ciphertext: sender.ciphertext,
          header: JSON.stringify(sender.header),
          associatedData: 'other',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('decrypts out-of-order messages using skipped message keys', async () => {
      const first = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'first',
      });
      const second = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'second',
      });

      const late = await service.decrypt('userB', {
        sessionId: 's2',
        ciphertext: second.ciphertext,
        header: JSON.stringify(second.header),
      });
      expect(late.plaintext).toBe('second');

      const early = await service.decrypt('userB', {
        sessionId: 's2',
        ciphertext: first.ciphertext,
        header: JSON.stringify(first.header),
      });
      expect(early.plaintext).toBe('first');

      const row = store.get('s2');
      expect(JSON.parse(row.skippedMessageKeys)).toEqual({});
    });

    it('rejects an unknown skipped message number', async () => {
      const sender = await service.encrypt('userA', {
        sessionId: 's1',
        plaintext: 'msg',
      });

      await service.decrypt('userB', {
        sessionId: 's2',
        ciphertext: sender.ciphertext,
        header: JSON.stringify(sender.header),
      });

      await expect(
        service.decrypt('userB', {
          sessionId: 's2',
          ciphertext: sender.ciphertext,
          header: JSON.stringify({ ...sender.header, messageNumber: 0 }),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a malformed header', async () => {
      await expect(
        service.decrypt('userB', {
          sessionId: 's2',
          ciphertext: 'abc',
          header: 'not-json',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound when the session does not exist', async () => {
      await expect(
        service.decrypt('userB', {
          sessionId: 'missing',
          ciphertext: 'abc',
          header: JSON.stringify({
            dhPublic: 'x',
            messageNumber: 0,
            previousChainLength: 0,
          }),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ratchetStep', () => {
    it('performs a DH ratchet step, resets counters and records the remote key', async () => {
      await service.encrypt('userA', { sessionId: 's1', plaintext: 'a' });
      await service.encrypt('userA', { sessionId: 's1', plaintext: 'b' });

      const { generateKeyPairSync } = jest.requireActual('crypto');
      const remote = generateKeyPairSync('x25519');
      const remotePublic = remote.publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64');

      const result = await service.ratchetStep('userA', {
        sessionId: 's1',
        remoteDhPublic: remotePublic,
      });

      expect(result.dhPublic).toBeTruthy();
      expect(result.rootKey).toBeTruthy();

      const row = store.get('s1');
      expect(row.sendingMessageNumber).toBe(0);
      expect(row.receivingMessageNumber).toBe(0);
      expect(row.remoteDhPublicKey).toBe(remotePublic);
      expect(row.nextDhPublicKey).toBe(result.dhPublic);
      expect(row.rootKey).toBe(result.rootKey);
      expect(row.currentDhPrivateKey).toBeTruthy();
    });

    it('rejects an invalid remote DH public key', async () => {
      await expect(
        service.ratchetStep('userA', {
          sessionId: 's1',
          remoteDhPublic: 'not-a-key',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
