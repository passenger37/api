export class PublicKey {
  static deserialize(buf: Uint8Array): PublicKey {
    return new PublicKey();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  equals(other: PublicKey): boolean {
    return true;
  }
}

export class PrivateKey {
  static generate(): PrivateKey {
    return new PrivateKey();
  }
  static deserialize(buf: Uint8Array): PrivateKey {
    return new PrivateKey();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  sign(msg: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
  agree(other_key: PublicKey): Uint8Array {
    return new Uint8Array();
  }
  getPublicKey(): PublicKey {
    return new PublicKey();
  }
}

export class IdentityKeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;

  constructor(publicKey: PublicKey, privateKey: PrivateKey) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  static generate(): IdentityKeyPair {
    return new IdentityKeyPair(new PublicKey(), new PrivateKey());
  }
  static deserialize(buf: Uint8Array): IdentityKeyPair {
    return new IdentityKeyPair(new PublicKey(), new PrivateKey());
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  signAlternateIdentity(other: PublicKey): Uint8Array {
    return new Uint8Array();
  }
}

export class PreKeyRecord {
  static new(id: number, pubKey: PublicKey, privKey: PrivateKey): PreKeyRecord {
    return new PreKeyRecord();
  }
  static deserialize(buf: Uint8Array): PreKeyRecord {
    return new PreKeyRecord();
  }
  id(): number {
    return 1;
  }
  privateKey(): PrivateKey {
    return new PrivateKey();
  }
  publicKey(): PublicKey {
    return new PublicKey();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class SignedPreKeyRecord {
  static new(id: number, timestamp: number, pubKey: PublicKey, privKey: PrivateKey, signature: Uint8Array): SignedPreKeyRecord {
    return new SignedPreKeyRecord();
  }
  static deserialize(buf: Uint8Array): SignedPreKeyRecord {
    return new SignedPreKeyRecord();
  }
  id(): number {
    return 1;
  }
  privateKey(): PrivateKey {
    return new PrivateKey();
  }
  publicKey(): PublicKey {
    return new PublicKey();
  }
  signature(): Uint8Array {
    return new Uint8Array();
  }
  timestamp(): number {
    return Date.now();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class KyberPreKeyRecord {
  static new(id: number, timestamp: number, keyPair: any, signature: Uint8Array): KyberPreKeyRecord {
    return new KyberPreKeyRecord();
  }
  static deserialize(buf: Uint8Array): KyberPreKeyRecord {
    return new KyberPreKeyRecord();
  }
  id(): number {
    return 1;
  }
  keyPair(): any {
    return {};
  }
  publicKey(): any {
    return {};
  }
  secretKey(): any {
    return {};
  }
  signature(): Uint8Array {
    return new Uint8Array();
  }
  timestamp(): number {
    return Date.now();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class PreKeyBundle {
  static new(
    registration_id: number,
    device_id: number,
    prekey_id: number | null,
    prekey: PublicKey | null,
    signed_prekey_id: number,
    signed_prekey: PublicKey,
    signed_prekey_signature: Uint8Array,
    identity_key: PublicKey,
    kyber_prekey_id: number,
    kyber_prekey: any,
    kyber_prekey_signature: Uint8Array,
  ): PreKeyBundle {
    return new PreKeyBundle();
  }
  static _fromNativeHandle(handle: any): PreKeyBundle {
    return new PreKeyBundle();
  }
  deviceId(): number {
    return 1;
  }
  identityKey(): PublicKey {
    return new PublicKey();
  }
  preKeyId(): number | null {
    return 1;
  }
  preKeyPublic(): PublicKey | null {
    return new PublicKey();
  }
  registrationId(): number {
    return 1;
  }
  signedPreKeyId(): number {
    return 1;
  }
  signedPreKeyPublic(): PublicKey {
    return new PublicKey();
  }
  signedPreKeySignature(): Uint8Array {
    return new Uint8Array();
  }
  kyberPreKeyId(): number {
    return 1;
  }
  kyberPreKeyPublic(): any {
    return {};
  }
  kyberPreKeySignature(): Uint8Array {
    return new Uint8Array();
  }
}

export class ProtocolAddress {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(handle: any): ProtocolAddress {
    return new ProtocolAddress();
  }
  static new(name: string | any, deviceId: number): ProtocolAddress {
    return new ProtocolAddress();
  }
  name(): string {
    return 'test';
  }
  serviceId(): any {
    return null;
  }
  deviceId(): number {
    return 1;
  }
  toString(): string {
    return 'test:1';
  }
}

export class Aci {
  private constructor() {}
  static fromUuid(uuidString: string): Aci {
    return new Aci();
  }
  static fromUuidBytes(uuidBytes: ArrayLike<number>): Aci {
    return new Aci();
  }
}

export class Pni {
  private constructor() {}
  static fromUuid(uuidString: string): Pni {
    return new Pni();
  }
  static fromUuidBytes(uuidBytes: ArrayLike<number>): Pni {
    return new Pni();
  }
}

export class SignalMessage {
  readonly _nativeHandle: any;
  constructor() {}
  static _new(...args: any[]): SignalMessage {
    return new SignalMessage();
  }
  static deserialize(buf: Uint8Array): SignalMessage {
    return new SignalMessage();
  }
  body(): Uint8Array {
    return new Uint8Array();
  }
  pqRatchet(): Uint8Array {
    return new Uint8Array();
  }
  counter(): number {
    return 1;
  }
  messageVersion(): number {
    return 1;
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class PreKeySignalMessage {
  readonly _nativeHandle: any;
  private constructor() {}
  static _new(...args: any[]): PreKeySignalMessage {
    return new PreKeySignalMessage();
  }
  static deserialize(buf: Uint8Array): PreKeySignalMessage {
    return new PreKeySignalMessage();
  }
  preKeyId(): number | null {
    return 1;
  }
  registrationId(): number {
    return 1;
  }
  signedPreKeyId(): number {
    return 1;
  }
  version(): number {
    return 1;
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class CiphertextMessage {
  readonly _nativeHandle: any;
  constructor() {}
  static deserialize(buf: Uint8Array): CiphertextMessage {
    return new CiphertextMessage();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export enum CiphertextMessageType {
  Whisper = 2,
  PreKey = 3,
  SenderKey = 7,
  Plaintext = 8,
}

export enum Direction {
  Sending = 0,
  Receiving = 1,
}

export enum ContentHint {
  Default = 0,
  Resendable = 1,
  Implicit = 2,
}

export function hkdf(
  outputLength: number,
  keyMaterial: Uint8Array,
  label: Uint8Array,
  salt: Uint8Array | null,
): Uint8Array {
  return new Uint8Array(outputLength);
}

export class ScannableFingerprint {
  private readonly scannable: Uint8Array;
  constructor() {}
  static _fromBuffer(scannable: Uint8Array): ScannableFingerprint {
    return new ScannableFingerprint();
  }
  compare(other: ScannableFingerprint): boolean {
    return true;
  }
  toBuffer(): Uint8Array {
    return new Uint8Array();
  }
}

export class DisplayableFingerprint {
  private readonly display: string;
  constructor() {}
  static _fromString(display: string): DisplayableFingerprint {
    return new DisplayableFingerprint();
  }
  toString(): string {
    return '1234567890123456789012345678901234567890';
  }
}

export class Fingerprint {
  readonly _nativeHandle: any;
  private constructor() {}
  static new(
    iterations: number,
    version: number,
    localIdentifier: Uint8Array,
    localKey: PublicKey,
    remoteIdentifier: Uint8Array,
    remoteKey: PublicKey,
  ): Fingerprint {
    return new Fingerprint();
  }
  displayableFingerprint(): DisplayableFingerprint {
    return new DisplayableFingerprint();
  }
  scannableFingerprint(): ScannableFingerprint {
    return new ScannableFingerprint();
  }
}

export class Aes256GcmSiv {
  readonly _nativeHandle: any;
  private constructor() {}
  static new(key: Uint8Array): Aes256GcmSiv {
    return new Aes256GcmSiv();
  }
  encrypt(message: Uint8Array, nonce: Uint8Array, associatedData: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
  decrypt(message: Uint8Array, nonce: Uint8Array, associatedData: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
}

export class SessionRecord {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(nativeHandle: any): SessionRecord {
    return new SessionRecord();
  }
  static deserialize(buf: Uint8Array): SessionRecord {
    return new SessionRecord();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  archiveCurrentState(): void {}
  localRegistrationId(): number {
    return 1;
  }
  remoteRegistrationId(): number {
    return 1;
  }
  hasCurrentState(now?: Date): boolean {
    return true;
  }
  currentRatchetKeyMatches(key: PublicKey): boolean {
    return true;
  }
}

export abstract class SessionStore {
  abstract saveSession(name: ProtocolAddress, record: SessionRecord): Promise<void>;
  abstract getSession(name: ProtocolAddress): Promise<SessionRecord | null>;
  abstract getExistingSessions(addresses: ProtocolAddress[]): Promise<SessionRecord[]>;
}

export enum IdentityChange {
  NewOrUnchanged = 0,
  ReplacedExisting = 1,
}

export abstract class IdentityKeyStore {
  abstract getIdentityKey(): Promise<PrivateKey>;
  getIdentityKeyPair(): Promise<IdentityKeyPair> {
    return Promise.resolve(new IdentityKeyPair(new PublicKey(), new PrivateKey()));
  }
  abstract getLocalRegistrationId(): Promise<number>;
  abstract saveIdentity(name: ProtocolAddress, key: PublicKey): Promise<IdentityChange>;
  abstract isTrustedIdentity(name: ProtocolAddress, key: PublicKey, direction: Direction): Promise<boolean>;
  abstract getIdentity(name: ProtocolAddress): Promise<PublicKey | null>;
}

export abstract class PreKeyStore {
  abstract savePreKey(id: number, record: PreKeyRecord): Promise<void>;
  abstract getPreKey(id: number): Promise<PreKeyRecord>;
  abstract removePreKey(id: number): Promise<void>;
}

export abstract class SignedPreKeyStore {
  abstract saveSignedPreKey(id: number, record: SignedPreKeyRecord): Promise<void>;
  abstract getSignedPreKey(id: number): Promise<SignedPreKeyRecord>;
}

export abstract class KyberPreKeyStore {
  abstract saveKyberPreKey(kyberPreKeyId: number, record: any): Promise<void>;
  abstract getKyberPreKey(kyberPreKeyId: number): Promise<any>;
  abstract markKyberPreKeyUsed(kyberPreKeyId: number, signedPreKeyId: number, baseKey: PublicKey): Promise<void>;
}

export abstract class SenderKeyStore {
  abstract saveSenderKey(sender: ProtocolAddress, distributionId: any, record: any): Promise<void>;
  abstract getSenderKey(sender: ProtocolAddress, distributionId: any): Promise<any | null>;
}

export function groupEncrypt(sender: ProtocolAddress, distributionId: any, store: SenderKeyStore, message: Uint8Array): Promise<any> {
  return Promise.resolve(new Uint8Array());
}

export function groupDecrypt(sender: ProtocolAddress, store: SenderKeyStore, message: Uint8Array): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array());
}

export class SealedSenderDecryptionResult {
  readonly _nativeHandle: any;
  constructor() {}
  static _fromNativeHandle(nativeHandle: any): SealedSenderDecryptionResult {
    return new SealedSenderDecryptionResult();
  }
  message(): Uint8Array {
    return new Uint8Array();
  }
  senderE164(): string | null {
    return null;
  }
  senderUuid(): string {
    return '';
  }
  senderAci(): Aci | null {
    return null;
  }
  deviceId(): number {
    return 1;
  }
}

export class PlaintextContent {
  readonly _nativeHandle: any;
  private constructor() {}
  static deserialize(buf: Uint8Array): PlaintextContent {
    return new PlaintextContent();
  }
  static from(message: any): PlaintextContent {
    return new PlaintextContent();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  body(): Uint8Array {
    return new Uint8Array();
  }
  asCiphertextMessage(): CiphertextMessage {
    return new CiphertextMessage();
  }
}

export class DecryptionErrorMessage {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(nativeHandle: any): DecryptionErrorMessage {
    return new DecryptionErrorMessage();
  }
  static forOriginal(bytes: Uint8Array, type: CiphertextMessageType, timestamp: number, originalSenderDeviceId: number): DecryptionErrorMessage {
    return new DecryptionErrorMessage();
  }
  static deserialize(buf: Uint8Array): DecryptionErrorMessage {
    return new DecryptionErrorMessage();
  }
  static extractFromSerializedBody(buf: Uint8Array): DecryptionErrorMessage {
    return new DecryptionErrorMessage();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  timestamp(): number {
    return Date.now();
  }
  deviceId(): number {
    return 1;
  }
  ratchetKey(): PublicKey | undefined {
    return undefined;
  }
}

export function processPreKeyBundle(
  bundle: PreKeyBundle,
  address: ProtocolAddress,
  localAddress: ProtocolAddress,
  sessionStore: SessionStore,
  identityStore: IdentityKeyStore,
  now?: Date,
): Promise<void> {
  return Promise.resolve();
}

export function signalEncrypt(
  message: Uint8Array,
  address: ProtocolAddress,
  localAddress: ProtocolAddress,
  sessionStore: SessionStore,
  identityStore: IdentityKeyStore,
  now?: Date,
): Promise<any> {
  return Promise.resolve(new SignalMessage());
}

export function signalDecrypt(
  message: SignalMessage,
  address: ProtocolAddress,
  localAddress: ProtocolAddress,
  sessionStore: SessionStore,
  identityStore: IdentityKeyStore,
): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array());
}

export function signalDecryptPreKey(
  message: PreKeySignalMessage,
  address: ProtocolAddress,
  localAddress: ProtocolAddress,
  sessionStore: SessionStore,
  identityStore: IdentityKeyStore,
  prekeyStore: PreKeyStore,
  signedPrekeyStore: SignedPreKeyStore,
  kyberPrekeyStore: KyberPreKeyStore,
): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array());
}

export function sealedSenderEncryptMessage(
  message: Uint8Array,
  address: ProtocolAddress,
  senderCert: any,
  sessionStore: SessionStore,
  identityStore: IdentityKeyStore,
): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array());
}

export function sealedSenderEncrypt(
  content: any,
  address: ProtocolAddress,
  identityStore: IdentityKeyStore,
): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array());
}

export type SealedSenderMultiRecipientEncryptOptions = {
  content: any;
  recipients: ProtocolAddress[];
  excludedRecipients?: any[];
  identityStore: IdentityKeyStore;
  sessionStore: SessionStore;
};

export function sealedSenderMultiRecipientEncrypt(options: SealedSenderMultiRecipientEncryptOptions): Promise<Uint8Array>;
export function sealedSenderMultiRecipientEncrypt(
  content: any,
  recipients: ProtocolAddress[],
  identityStore: IdentityKeyStore,
  sessionStore: SessionStore,
): Promise<Uint8Array>;
export function sealedSenderMultiRecipientEncrypt(...args: any[]): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array());
}

export function sealedSenderMultiRecipientMessageForSingleRecipient(message: Uint8Array): Uint8Array {
  return new Uint8Array();
}

export function sealedSenderDecryptMessage(
  message: Uint8Array,
  trustRoot: PublicKey,
  timestamp: number,
  localE164: string | null,
  localUuid: string,
  localDeviceId: number,
  sessionStore: SessionStore,
  identityStore: IdentityKeyStore,
  prekeyStore: PreKeyStore,
  signedPrekeyStore: SignedPreKeyStore,
  kyberPrekeyStore: KyberPreKeyStore,
): Promise<SealedSenderDecryptionResult> {
  return Promise.resolve(new SealedSenderDecryptionResult());
}

export function sealedSenderDecryptToUsmc(
  message: Uint8Array,
  identityStore: IdentityKeyStore,
): Promise<any> {
  return Promise.resolve(new Uint8Array());
}

export class Cds2Client {
  readonly _nativeHandle: any;
  private constructor() {}
  static new(mrenclave: Uint8Array, attestationMsg: Uint8Array, currentTimestamp: Date): Cds2Client {
    return new Cds2Client();
  }
  initialRequest(): Uint8Array {
    return new Uint8Array();
  }
  completeHandshake(buffer: Uint8Array): void {}
  establishedSend(buffer: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
  establishedRecv(buffer: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
}

export class HsmEnclaveClient {
  readonly _nativeHandle: any;
  private constructor() {}
  static new(public_key: Uint8Array, code_hashes: Uint8Array[]): HsmEnclaveClient {
    return new HsmEnclaveClient();
  }
  initialRequest(): Uint8Array {
    return new Uint8Array();
  }
  completeHandshake(buffer: Uint8Array): void {}
  establishedSend(buffer: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
  establishedRecv(buffer: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
}

export class Svr2Client {
  readonly _nativeHandle: any;
  private constructor() {}
  static new(mrenclave: Uint8Array, attestationMsg: Uint8Array, currentTimestamp: Date): Svr2Client {
    return new Svr2Client();
  }
  initialRequest(): Uint8Array {
    return new Uint8Array();
  }
  completeHandshake(buffer: Uint8Array): void {}
  establishedSend(buffer: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
  establishedRecv(buffer: Uint8Array): Uint8Array {
    return new Uint8Array();
  }
}

export enum LogLevel {
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5,
}

export function initLogger(maxLevel: LogLevel, callback: (level: LogLevel, target: string, file: string | null, line: number | null, message: string) => void): void {}

export class SenderKeyDistributionMessage {
  readonly _nativeHandle: any;
  private constructor() {}
  static create(sender: ProtocolAddress, distributionId: any, store: SenderKeyStore): Promise<SenderKeyDistributionMessage> {
    return Promise.resolve(new SenderKeyDistributionMessage());
  }
  static _new(...args: any[]): SenderKeyDistributionMessage {
    return new SenderKeyDistributionMessage();
  }
  static deserialize(buf: Uint8Array): SenderKeyDistributionMessage {
    return new SenderKeyDistributionMessage();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  chainKey(): Uint8Array {
    return new Uint8Array();
  }
  iteration(): number {
    return 1;
  }
  chainId(): number {
    return 1;
  }
  distributionId(): any {
    return {};
  }
}

export function processSenderKeyDistributionMessage(sender: ProtocolAddress, message: SenderKeyDistributionMessage, store: SenderKeyStore): Promise<void> {
  return Promise.resolve();
}

export class SenderKeyMessage {
  readonly _nativeHandle: any;
  private constructor() {}
  static _new(...args: any[]): SenderKeyMessage {
    return new SenderKeyMessage();
  }
  static deserialize(buf: Uint8Array): SenderKeyMessage {
    return new SenderKeyMessage();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  ciphertext(): Uint8Array {
    return new Uint8Array();
  }
  iteration(): number {
    return 1;
  }
  chainId(): number {
    return 1;
  }
  distributionId(): any {
    return {};
  }
  verifySignature(key: PublicKey): boolean {
    return true;
  }
}

export class UnidentifiedSenderMessageContent {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(nativeHandle: any): UnidentifiedSenderMessageContent {
    return new UnidentifiedSenderMessageContent();
  }
  static new(message: any, senderCert: any, contentHint: number, groupId: Uint8Array | null): UnidentifiedSenderMessageContent {
    return new UnidentifiedSenderMessageContent();
  }
  static deserialize(buf: Uint8Array): UnidentifiedSenderMessageContent {
    return new UnidentifiedSenderMessageContent();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  contents(): Uint8Array {
    return new Uint8Array();
  }
  msgType(): number {
    return 1;
  }
  senderCertificate(): any {
    return {};
  }
  contentHint(): number {
    return 1;
  }
  groupId(): Uint8Array | null {
    return null;
  }
}

export class SenderCertificate {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(nativeHandle: any): SenderCertificate {
    return new SenderCertificate();
  }
  static new(...args: any[]): SenderCertificate {
    return new SenderCertificate();
  }
  static deserialize(buf: Uint8Array): SenderCertificate {
    return new SenderCertificate();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  certificate(): Uint8Array {
    return new Uint8Array();
  }
  expiration(): number {
    return Date.now();
  }
  key(): PublicKey {
    return new PublicKey();
  }
  senderE164(): string | null {
    return null;
  }
  senderUuid(): string {
    return '';
  }
  senderAci(): Aci | null {
    return null;
  }
  senderDeviceId(): number {
    return 1;
  }
  serverCertificate(): any {
    return {};
  }
  signature(): Uint8Array {
    return new Uint8Array();
  }
  validate(trustRoot: PublicKey, time: number): boolean {
    return true;
  }
  validateWithTrustRoots(trustRoots: PublicKey[], time: number): boolean {
    return true;
  }
}

export class ServerCertificate {
  readonly _nativeHandle: any;
  static _fromNativeHandle(nativeHandle: any): ServerCertificate {
    return new ServerCertificate();
  }
  private constructor() {}
  static new(keyId: number, serverKey: PublicKey, trustRoot: PrivateKey): ServerCertificate {
    return new ServerCertificate();
  }
  static deserialize(buf: Uint8Array): ServerCertificate {
    return new ServerCertificate();
  }
  certificateData(): Uint8Array {
    return new Uint8Array();
  }
  key(): PublicKey {
    return new PublicKey();
  }
  keyId(): number {
    return 1;
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  signature(): Uint8Array {
    return new Uint8Array();
  }
}

export class SenderKeyRecord {
  readonly _nativeHandle: any;
  static _fromNativeHandle(nativeHandle: any): SenderKeyRecord {
    return new SenderKeyRecord();
  }
  private constructor() {}
  static deserialize(buf: Uint8Array): SenderKeyRecord {
    return new SenderKeyRecord();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class KEMKeyPair {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(handle: any): KEMKeyPair {
    return new KEMKeyPair();
  }
  static generate(): KEMKeyPair {
    return new KEMKeyPair();
  }
  getPublicKey(): any {
    return {};
  }
  getSecretKey(): any {
    return {};
  }
}

export class KEMPublicKey {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(handle: any): KEMPublicKey {
    return new KEMPublicKey();
  }
  static deserialize(buf: Uint8Array): KEMPublicKey {
    return new KEMPublicKey();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class KEMSecretKey {
  readonly _nativeHandle: any;
  private constructor() {}
  static _fromNativeHandle(handle: any): KEMSecretKey {
    return new KEMSecretKey();
  }
  static deserialize(buf: Uint8Array): KEMSecretKey {
    return new KEMSecretKey();
  }
  serialize(): Uint8Array {
    return new Uint8Array();
  }
}

export class Uuid {
  constructor() {}
  static fromString(s: string): Uuid {
    return new Uuid();
  }
}

export function registerErrors(): void {}

export const uuid = {
  Uuid,
  fromString: (s: string) => new Uuid(),
};

export const usernames = {};

export const io = {};

export const Net = {};

export const Mp4Sanitizer = {};

export const WebpSanitizer = {};