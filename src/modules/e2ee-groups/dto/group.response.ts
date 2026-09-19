import { E2eeEnvelopeType, E2eeEnvelopeStatus } from '@prisma/client';

export class GroupResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  creatorUserId!: string;
  avatarUrl!: string | null;
  version!: number;
  isActive!: boolean;
  archivedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class GroupMemberResponseDto {
  id!: string;
  groupId!: string;
  userId!: string;
  deviceId!: string;
  role!: string;
  isActive!: boolean;
  joinedAt!: Date;
  leftAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class GroupSessionResponseDto {
  id!: string;
  groupId!: string;
  deviceId!: string;
  distributionId!: string;
  chainId!: number;
  iteration!: number;
  chainKey!: string;
  signingKeyPrivate!: string | null;
  signingKeyPublic!: string | null;
  isActive!: boolean;
  archivedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class GroupEnvelopeResponseDto {
  id!: string;
  groupId!: string;
  type!: E2eeEnvelopeType;
  ciphertext!: string;
  associatedData!: string | null;
  senderDeviceId!: string;
  status!: E2eeEnvelopeStatus;
  attempts!: number;
  lastError!: string | null;
  deliveredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CreateGroupResponseDto {
  success!: boolean;
  group!: GroupResponseDto;
}

export class GetGroupResponseDto {
  success!: boolean;
  group!: GroupResponseDto;
}

export class AddMemberResponseDto {
  success!: boolean;
  member!: GroupMemberResponseDto;
}

export class GetMembersResponseDto {
  success!: boolean;
  members!: GroupMemberResponseDto[];
}

export class SendEnvelopeResponseDto {
  success!: boolean;
  envelope!: GroupEnvelopeResponseDto;
}

export class GetEnvelopesResponseDto {
  success!: boolean;
  envelopes!: GroupEnvelopeResponseDto[];
  nextCursor?: string;
  hasMore!: boolean;
}

export class UpdateMemberRoleResponseDto {
  success!: boolean;
  member!: GroupMemberResponseDto;
}

export class RemoveMemberResponseDto {
  success!: boolean;
  removed!: boolean;
}
