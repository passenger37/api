import { ConflictException, Injectable } from '@nestjs/common';

import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UserValidationService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async validateUniqueUser(email: string, username: string): Promise<void> {
    const emailExists = await this.usersRepository.existsByEmail(email);

    if (emailExists) {
      throw new ConflictException('Email already exists.');
    }

    const usernameExists =
      await this.usersRepository.existsByUsername(username);

    if (usernameExists) {
      throw new ConflictException('Username already exists.');
    }
  }
}
