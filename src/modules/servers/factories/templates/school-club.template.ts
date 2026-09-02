import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class SchoolClubTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'Announcements',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Club announcements and event notices',
            },
          ],
        },
        {
          name: 'General',
          channels: [
            {
              name: 'general',
              type: 'TEXT',
              topic: 'General club discussion',
            },
            {
              name: 'introductions',
              type: 'TEXT',
              topic: 'Welcome new members and introduce yourself',
            },
            {
              name: 'events',
              type: 'TEXT',
              topic: 'Plan meetings and club activities',
            },
          ],
        },
        {
          name: 'Voice Channels',
          channels: [
            {
              name: 'Club Voice',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
