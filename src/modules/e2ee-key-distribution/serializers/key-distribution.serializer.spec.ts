import { serializeKeyBundle } from './key-distribution.serializer';

describe('key-distribution.serializer', () => {
  it('should serialize a device with signed prekey and count', () => {
    const result = serializeKeyBundle({
      deviceId: 'dev1',
      identityKeyPublic: 'ik',
      signedPrekey: { signedPreKeyId: 1, publicKey: 'spk', signature: 'sig' },
      oneTimePrekeyCount: 3,
    });

    expect(result).toEqual({
      deviceId: 'dev1',
      identityKeyPublic: 'ik',
      signedPrekey: { signedPreKeyId: 1, publicKey: 'spk', signature: 'sig' },
      oneTimePrekeyCount: 3,
    });
  });

  it('should serialize a device with null signed prekey and zero count', () => {
    const result = serializeKeyBundle({
      deviceId: 'dev2',
      identityKeyPublic: 'ik2',
      signedPrekey: null,
      oneTimePrekeyCount: 0,
    });

    expect(result).toEqual({
      deviceId: 'dev2',
      identityKeyPublic: 'ik2',
      signedPrekey: null,
      oneTimePrekeyCount: 0,
    });
  });
});
