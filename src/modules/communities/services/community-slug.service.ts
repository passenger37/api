import { Injectable } from '@nestjs/common';

import { CommunityRepository } from '../repositories/community.repository';

@Injectable()
export class CommunitySlugService {
  constructor(private readonly repository: CommunityRepository) {}

  async generate(name: string): Promise<string> {
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    const fallback = baseSlug || 'community';

    let slug = fallback;

    let counter = 2;

    while (await this.repository.existsBySlug(slug)) {
      slug = `${fallback}-${counter}`;

      counter++;
    }

    return slug;
  }
}
