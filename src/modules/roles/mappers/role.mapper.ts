import { Role } from '@prisma/client';
import { RoleResponseDto, RoleSummaryResponseDto } from '../dto/response';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleMapper {
  static toResponse(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  static toResponseList(roles: Role[]): RoleResponseDto[] {
    return roles.map(this.toResponse);
  }

  toSummary(entity: Role): RoleSummaryResponseDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  toSummaryList(entities: Role[]): RoleSummaryResponseDto[] {
    return entities.map((entity) => this.toSummary(entity));
  }
}
