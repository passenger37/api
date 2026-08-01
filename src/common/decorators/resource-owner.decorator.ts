import { SetMetadata } from '@nestjs/common';

import { ResourceOwnerOptions } from '../interfaces/resource-owner.interface';

export const RESOURCE_OWNER_KEY = 'resource_owner';

export const ResourceOwner = (options: ResourceOwnerOptions) =>
  SetMetadata(RESOURCE_OWNER_KEY, options);
