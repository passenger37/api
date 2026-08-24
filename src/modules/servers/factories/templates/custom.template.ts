import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class CustomTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'General',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Important updates and announcements',
            },
            {
              name: 'general',
              type: 'TEXT',
              topic: 'General discussion',
            },
          ],
        },
        {
          name: 'Voice Channels',
          channels: [
            {
              name: 'General Voice',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
