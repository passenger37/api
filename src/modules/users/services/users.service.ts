import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { UsersRepository } from '../repositories';

import { CreateUserInput } from '../types/create-user.input';

@Injectable()
export class UsersService {
constructor(
    private readonly usersRepository: UsersRepository,
) {}

async create(data: Prisma.UserCreateInput) {
  return this.usersRepository.create(data);
}


  async findByIdentifier(identifier: string) {
  return this.usersRepository.findByEmailOrUsername(
    identifier,
  );
  }

async findById(id: string) {
  return this.usersRepository.findById(id);
}

async findByUsername(username: string) {
  return this.usersRepository.findByUsername(username);
}

async findByEmail(email: string) {
  return this.usersRepository.findByEmail(email);
}

}