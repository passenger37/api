import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class CodingTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [],
    };
  }
}