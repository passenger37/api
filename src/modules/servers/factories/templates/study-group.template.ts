import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class StudyGroupTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'Announcements',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Study group announcements and schedules',
            },
          ],
        },
        {
          name: 'Study',
          channels: [
            {
              name: 'general',
              type: 'TEXT',
              topic: 'General study discussion',
            },
            {
              name: 'resources',
              type: 'TEXT',
              topic: 'Share notes, links, and materials',
            },
            {
              name: 'doubts',
              type: 'TEXT',
              topic: 'Ask and answer questions',
            },
          ],
        },
        {
          name: 'Voice Channels',
          channels: [
            {
              name: 'Study Room',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
