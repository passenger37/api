import { Module } from '@nestjs/common';

import { SecurityModule } from '../security/security.module';

import { UsersController } from './controllers/users.controller';

import { UsersService } from './services/users.service';
import { UserValidationService } from './services/user-validation.service';
import { UserQueryService } from './services/user-query.service';
import { UserCommandService } from './services/user-command.service';
import { UserDomainService } from './services/user-domain.service';
import { UserProfileService } from './services/user-profile.service';
import { UserProfileDomainService } from './services/user-profile-domain.service';

import { UsersRepository } from './repositories/users.repository';

import { UserFactory } from './factories/user.factory';
import { UserProfileFactory } from './factories';

import { UserMapper } from './mappers';

@Module({
  imports: [SecurityModule],

  controllers: [UsersController],

  providers: [
    UsersService,
    UserValidationService,
    UsersRepository,
    UserFactory,
    UserProfileFactory,
    UserProfileService,
    UserQueryService,
    UserCommandService,
    UserDomainService,
    UserProfileDomainService,
    UserMapper,
  ],

  exports: [
    UsersService,
    UsersRepository,
    UserValidationService,
    UserFactory,
    UserProfileFactory,
    UserQueryService,
    UserCommandService,
    UserDomainService,
    UserProfileDomainService,
    UserMapper,
  ],
})
export class UsersModule {}
