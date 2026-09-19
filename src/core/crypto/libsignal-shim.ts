import { FingerprintGenerator } from '@privacyresearch/libsignal-protocol-typescript';
import { curve } from '@raphaelvserafim/libsignal';

export class PublicKey {
  private readonly keyData: Uint8Array;

  constructor(keyData: Uint8Array) {
    this.keyData = keyData;
  }

  static deserialize(data: Buffer | Uint8Array): PublicKey {
    const keyData = data instanceof Buffer ? new Uint8Array(data) : data;
    return new PublicKey(keyData);
  }

  serialize(): Uint8Array {
    return this.keyData.slice();
  }

  toBuffer(): Buffer {
    return Buffer.from(this.keyData);
  }
}

export class Fingerprint {
  private readonly iterations: number;
  private readonly version: number;
  private readonly localIdentifier: Uint8Array;
  private readonly localKey: Uint8Array;
  private readonly remoteIdentifier: Uint8Array;
  private readonly remoteKey: Uint8Array;
  private cachedScannable: Buffer | null = null;
  private cachedDisplayable: string | null = null;

  constructor(
    iterations: number,
    version: number,
    localIdentifier: Uint8Array,
    localKey: Uint8Array,
    remoteIdentifier: Uint8Array,
    remoteKey: Uint8Array,
  ) {
    this.iterations = iterations;
    this.version = version;
    this.localIdentifier = localIdentifier;
    this.localKey = localKey;
    this.remoteIdentifier = remoteIdentifier;
    this.remoteKey = remoteKey;
  }

  static new(
    iterations: number,
    version: number,
    localIdentifier: Uint8Array,
    localKey: Uint8Array,
    remoteIdentifier: Uint8Array,
    remoteKey: Uint8Array,
  ): Fingerprint {
    return new Fingerprint(
      iterations,
      version,
      localIdentifier,
      localKey,
      remoteIdentifier,
      remoteKey,
    );
  }

  async scannableFingerprint(): Promise<Buffer> {
    if (this.cachedScannable) return this.cachedScannable;
    const generator = new FingerprintGenerator(this.iterations);
    const fp = await generator.createFor(
      Buffer.from(this.localIdentifier).toString('binary'),
      this.localKey.buffer as ArrayBuffer,
      Buffer.from(this.remoteIdentifier).toString('binary'),
      this.remoteKey.buffer as ArrayBuffer,
    );
    this.cachedScannable = Buffer.from(fp, 'utf-8');
    return this.cachedScannable;
  }

  async displayableFingerprint(): Promise<string> {
    if (this.cachedDisplayable) return this.cachedDisplayable;
    const generator = new FingerprintGenerator(this.iterations);
    const fp = await generator.createFor(
      Buffer.from(this.localIdentifier).toString('binary'),
      this.localKey.buffer as ArrayBuffer,
      Buffer.from(this.remoteIdentifier).toString('binary'),
      this.remoteKey.buffer as ArrayBuffer,
    );
    this.cachedDisplayable = fp;
    return this.cachedDisplayable;
  }
}

export function generateKeyPair(): { pubKey: Buffer; privKey: Buffer } {
  return curve.generateKeyPair();
}

export function getPublicFromPrivateKey(privKey: Uint8Array): Buffer {
  return curve.getPublicFromPrivateKey(privKey);
}
