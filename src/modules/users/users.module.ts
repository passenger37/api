import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UserValidationService } from './services/user-validation.service';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { SecurityModule } from '../security/security.module';
import { UserFactory } from './factories/user.factory';
import { UserProfileService } from '../users/services/user-profile.service';

@Module({
  imports: [SecurityModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserValidationService,
    UsersRepository,
    UserFactory,
    UserProfileService,
  ],
  exports: [UsersService, UsersRepository, UserValidationService, UserFactory],
})
export class UsersModule {}
