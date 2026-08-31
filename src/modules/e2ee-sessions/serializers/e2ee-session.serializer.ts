export function serializeSession(session: {
  id: string;
  sessionState: string;
  associatedDataHash: string;
  senderEphemeralPublic: string;
}) {
  return {
    sessionId: session.id,
    rootKeyCiphertext: session.sessionState,
    chainKeyCiphertext: session.associatedDataHash,
    senderEphemeralPublic: session.senderEphemeralPublic,
  };
}
