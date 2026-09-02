import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class CompanyTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'Announcements',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Company-wide announcements',
            },
          ],
        },
        {
          name: 'General',
          channels: [
            {
              name: 'general',
              type: 'TEXT',
              topic: 'General team discussion',
            },
            {
              name: 'random',
              type: 'TEXT',
              topic: 'Off-topic and watercooler chat',
            },
          ],
        },
        {
          name: 'Teams',
          channels: [
            {
              name: 'engineering',
              type: 'TEXT',
              topic: 'Engineering and technical discussion',
            },
            {
              name: 'product',
              type: 'TEXT',
              topic: 'Product planning and feedback',
            },
            {
              name: 'design',
              type: 'TEXT',
              topic: 'Design collaboration',
            },
            {
              name: 'support',
              type: 'TEXT',
              topic: 'Customer support coordination',
            },
          ],
        },
        {
          name: 'Voice Channels',
          channels: [
            {
              name: 'All Hands',
              type: 'VOICE',
            },
            {
              name: 'Meeting Room',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
