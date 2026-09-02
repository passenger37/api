import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class GamingTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'Announcements',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Server news, events, and patch notes',
            },
          ],
        },
        {
          name: 'General',
          channels: [
            {
              name: 'general',
              type: 'TEXT',
              topic: 'General gaming discussion',
            },
            {
              name: 'lfg',
              type: 'TEXT',
              topic: 'Looking for group — find players to queue with',
            },
          ],
        },
        {
          name: 'Guides',
          channels: [
            {
              name: 'game-guides',
              type: 'FORUM',
              topic: 'Community-written guides and builds',
            },
            {
              name: 'patch-notes',
              type: 'FORUM',
              topic: 'Discuss balance changes and patch discussions',
            },
          ],
        },
        {
          name: 'Voice Channels',
          channels: [
            {
              name: 'Game Chat 1',
              type: 'VOICE',
            },
            {
              name: 'Game Chat 2',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
