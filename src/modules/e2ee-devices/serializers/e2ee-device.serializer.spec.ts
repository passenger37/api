import {
  serializeE2eeDevice,
  serializeSignedPreKey,
} from './e2ee-device.serializer';

describe('e2ee-device.serializer', () => {
  it('should serialize a signed prekey', () => {
    expect(
      serializeSignedPreKey({
        signedPreKeyId: 7,
        publicKey: 'spk',
        signature: 'sig',
      }),
    ).toEqual({
      signedPreKeyId: 7,
      publicKey: 'spk',
      signature: 'sig',
    });
  });

  it('should serialize a device with its active prekey and prekey count', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const result = serializeE2eeDevice({
      id: 'dev1',
      userId: 'userA',
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
      isRevoked: false,
      revokedAt: null,
      lastSeenAt: null,
      createdAt,
      updatedAt: createdAt,
      signedPreKeys: [
        {
          id: 'spk1',
          deviceId: 'dev1',
          signedPreKeyId: 1,
          publicKey: 'spk',
          signature: 'sig',
          isActive: true,
          rotatedAt: null,
          createdAt,
        },
      ],
      _count: { oneTimePreKeys: 2 },
    });

    expect(result).toEqual({
      id: 'dev1',
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
      isRevoked: false,
      revokedAt: null,
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      signedPreKey: {
        signedPreKeyId: 1,
        publicKey: 'spk',
        signature: 'sig',
      },
      oneTimePreKeyCount: 2,
    });
  });

  it('should render null prekey when no active signed prekey exists', () => {
    const created = new Date('2026-01-01T00:00:00.000Z');

    const result = serializeE2eeDevice({
      id: 'dev1',
      userId: 'userA',
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
      isRevoked: false,
      revokedAt: null,
      lastSeenAt: new Date('2026-01-05T00:00:00.000Z'),
      createdAt: created,
      updatedAt: created,
      signedPreKeys: [],
      _count: { oneTimePreKeys: 0 },
    });

    expect(result.signedPreKey).toBeNull();
    expect(result.lastSeenAt).toBe('2026-01-05T00:00:00.000Z');
    expect(result.oneTimePreKeyCount).toBe(0);
  });
});
