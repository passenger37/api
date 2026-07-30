import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { UpdateUserMapper } from '../mappers';

@Injectable()
export class UserProfileFactory {
  createUpdateInput(dto: UpdateUserProfileDto): Prisma.UserUpdateInput {
    return UpdateUserMapper.toPrismaUpdate(dto);
  }
}
