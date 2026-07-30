import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UserValidationService } from './services/user-validation.service';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { SecurityModule } from '../security/security.module';
import { UserFactory } from './factories/user.factory';
import { UserProfileFactory } from './factories';
import { UserProfileService } from '../users/services/user-profile.service';
import { UserQueryService } from './services/user-query.service';
import { UserCommandService } from './services/user-command.service';
import { UserDomainService } from './services/user-domain.service';
import { UserProfileDomainService } from './services/user-profile-domain.service';

@Module({
  imports: [SecurityModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserValidationService,
    UsersRepository,
    UserFactory,
    UserProfileService,
    UserProfileFactory,
    UserQueryService,
    UserCommandService,
    UserDomainService,
    UserProfileDomainService,
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
  ],
})
export class UsersModule {}
