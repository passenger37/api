import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UserValidationService } from './services/user-validation.service';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersDomainService } from './domain/services/users-domain.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UserValidationService,
    UsersRepository,
    UsersDomainService,
  ],
  exports: [UsersService, UsersRepository, UserValidationService],
})
export class UsersModule {}
