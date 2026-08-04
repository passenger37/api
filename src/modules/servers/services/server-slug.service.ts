import { Injectable } from '@nestjs/common';

import { ServerRepository } from '../repositories/server.repository';

@Injectable()
export class ServerSlugService {
  constructor(
    private readonly repository: ServerRepository,
  ) {}

  async generate(
    name: string,
  ): Promise<string> {
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    let slug = baseSlug;

    let counter = 2;

    while (
      await this.repository.existsBySlug(slug)
    ) {
      slug = `${baseSlug}-${counter}`;

      counter++;
    }

    return slug;
  }
}