export class SessionResponseDto {
  sessionId: string;
  rootKeyCiphertext: string;
  chainKeyCiphertext: string;
  senderEphemeralPublic: string;
}
