import { IsString, IsUUID, IsOptional, IsNumber, Min, Max, MaxLength, IsEnum } from 'class-validator';
import { E2eeEnvelopeType } from '@prisma/client';

export class CreateGroupRequest {
  @IsString()
  @Min(1)
  @Max(100)
  name!: string;

  @IsOptional()
  @IsString()
  @Max(500)
  description?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  avatarUrl?: string;

  @IsUUID()
  creatorDeviceId!: string;
}

export class AddMemberRequest {
  @IsUUID()
  groupId!: string;

  @IsUUID()
  deviceId!: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'MEMBER'])
  role?: 'ADMIN' | 'MEMBER';
}

export class RemoveMemberRequest {
  @IsUUID()
  groupId!: string;

  @IsUUID()
  deviceId!: string;
}

export class UpdateMemberRoleRequest {
  @IsUUID()
  groupId!: string;

  @IsUUID()
  deviceId!: string;

  @IsEnum(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}

export class SendGroupEnvelopeRequest {
  @IsUUID()
  groupId!: string;

  @IsEnum(E2eeEnvelopeType)
  type!: E2eeEnvelopeType;

  @IsString()
  @Min(1)
  @Max(50000)
  ciphertext!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  associatedData?: string;

  @IsUUID()
  senderDeviceId!: string;
}

export class GetGroupEnvelopesRequest {
  @IsUUID()
  groupId!: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GetGroupMembersRequest {
  @IsUUID()
  groupId!: string;
}

export class GroupIdParam {
  @IsUUID()
  groupId!: string;
}

export class MemberIdParam {
  @IsUUID()
  groupId!: string;

  @IsUUID()
  deviceId!: string;
}