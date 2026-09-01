import { E2eeEnvelope, E2eeEnvelopeType, E2eeEnvelopeStatus } from '@prisma/client';

export interface EnvelopeResponse {
  id: string;
  sessionId: string;
  type: E2eeEnvelopeType;
  ciphertext: string;
  associatedData: string | null;
  senderDeviceId: string;
  recipientDeviceId: string;
  status: E2eeEnvelopeStatus;
  attempts: number;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeEnvelope(envelope: E2eeEnvelope): EnvelopeResponse {
  return {
    id: envelope.id,
    sessionId: envelope.sessionId,
    type: envelope.type,
    ciphertext: envelope.ciphertext,
    associatedData: envelope.associatedData,
    senderDeviceId: envelope.senderDeviceId,
    recipientDeviceId: envelope.recipientDeviceId,
    status: envelope.status,
    attempts: envelope.attempts,
    lastError: envelope.lastError,
    deliveredAt: envelope.deliveredAt,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
  };
}

export function serializeEnvelopeList(
  envelopes: E2eeEnvelope[],
): EnvelopeResponse[] {
  return envelopes.map(serializeEnvelope);
}