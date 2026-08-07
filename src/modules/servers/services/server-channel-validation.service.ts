import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ServerChannelRepository } from '../repositories/server-channel.repository';
import { ServerCategoryRepository } from '../repositories/server-category.repository';

@Injectable()
export class ServerChannelValidationService {
  private static readonly RESERVED_NAMES = [
    'everyone',
    'here',
    'system',
    'admin',
  ];

  private static readonly MAX_CHANNELS = 500;

  constructor(
    private readonly channelRepository: ServerChannelRepository,
    private readonly categoryRepository: ServerCategoryRepository,
  ) {}

  async validateChannelExists(channelId: string) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    return channel;
  }

  async validateUniqueName(serverId: string, name: string) {
    const channel = await this.channelRepository.findByName(serverId, name);

    if (channel) {
      throw new ConflictException('Channel name already exists.');
    }
  }

  async validateCategoryExists(categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  validateReservedName(name: string) {
    if (
      ServerChannelValidationService.RESERVED_NAMES.includes(name.toLowerCase())
    ) {
      throw new BadRequestException('Reserved channel name.');
    }
  }

  async validateChannelLimit(serverId: string) {
    const total = await this.channelRepository.count(serverId);

    if (total >= ServerChannelValidationService.MAX_CHANNELS) {
      throw new BadRequestException('Maximum number of channels reached.');
    }
  }

  validatePosition(position: number) {
    if (position < 0) {
      throw new BadRequestException('Invalid channel position.');
    }
  }
}
