import { BadRequestException, Injectable } from '@nestjs/common';

import { CommunityRepository } from '../repositories/community.repository';

const MAX_SLUG_ATTEMPTS = 16;

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

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate =
        attempt === 0 ? fallback : `${fallback}-${attempt + 1}`;

      const exists = await this.repository.existsBySlug(candidate);

      if (!exists) {
        return candidate;
      }
    }

    throw new BadRequestException(
      `Could not generate a unique community slug after ${MAX_SLUG_ATTEMPTS} attempts.`,
    );
  }
}
