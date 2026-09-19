import {
  E2eeGroup,
  E2eeGroupMember,
  E2eeGroupSession,
  E2eeGroupEnvelope,
  E2eeEnvelopeType,
  E2eeEnvelopeStatus,
} from '@prisma/client';

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  creatorUserId: string;
  avatarUrl: string | null;
  version: number;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMemberResponse {
  id: string;
  groupId: string;
  userId: string;
  deviceId: string;
  role: string;
  isActive: boolean;
  joinedAt: Date;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupSessionResponse {
  id: string;
  groupId: string;
  deviceId: string;
  distributionId: string;
  chainId: number;
  iteration: number;
  chainKey: string;
  signingKeyPrivate: string | null;
  signingKeyPublic: string | null;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupEnvelopeResponse {
  id: string;
  groupId: string;
  type: E2eeEnvelopeType;
  ciphertext: string;
  associatedData: string | null;
  senderDeviceId: string;
  status: E2eeEnvelopeStatus;
  attempts: number;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeGroup(group: E2eeGroup): GroupResponse {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    creatorUserId: group.creatorUserId,
    avatarUrl: group.avatarUrl,
    version: group.version,
    isActive: group.isActive,
    archivedAt: group.archivedAt,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function serializeGroupMember(
  member: E2eeGroupMember,
): GroupMemberResponse {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    deviceId: member.deviceId,
    role: member.role,
    isActive: member.isActive,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export function serializeGroupSession(
  session: E2eeGroupSession,
): GroupSessionResponse {
  return {
    id: session.id,
    groupId: session.groupId,
    deviceId: session.deviceId,
    distributionId: session.distributionId,
    chainId: session.chainId,
    iteration: session.iteration,
    chainKey: session.chainKey,
    signingKeyPrivate: session.signingKeyPrivate,
    signingKeyPublic: session.signingKeyPublic,
    isActive: session.isActive,
    archivedAt: session.archivedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function serializeGroupEnvelope(
  envelope: E2eeGroupEnvelope,
): GroupEnvelopeResponse {
  return {
    id: envelope.id,
    groupId: envelope.groupId,
    type: envelope.type,
    ciphertext: envelope.ciphertext,
    associatedData: envelope.associatedData,
    senderDeviceId: envelope.senderDeviceId,
    status: envelope.status,
    attempts: envelope.attempts,
    lastError: envelope.lastError,
    deliveredAt: envelope.deliveredAt,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
  };
}

export function serializeGroupEnvelopeList(
  envelopes: E2eeGroupEnvelope[],
): GroupEnvelopeResponse[] {
  return envelopes.map(serializeGroupEnvelope);
}
