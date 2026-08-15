import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class CodingTemplate implements ServerTemplate {
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
              topic: 'General discussion about the project',
            },
            {
              name: 'code-help',
              type: 'TEXT',
              topic: 'Ask for help with your code',
            },
            {
              name: 'showcase',
              type: 'TEXT',
              topic: 'Share what you have built',
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
            {
              name: 'Pair Programming',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
