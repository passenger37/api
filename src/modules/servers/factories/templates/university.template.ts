import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class UniversityTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'Announcements',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Official announcements and deadlines',
            },
          ],
        },
        {
          name: 'Academics',
          channels: [
            {
              name: 'lectures',
              type: 'TEXT',
              topic: 'Discuss lecture material and notes',
            },
            {
              name: 'assignments',
              type: 'TEXT',
              topic: 'Assignment clarifications and due dates',
            },
            {
              name: 'exams',
              type: 'TEXT',
              topic: 'Exam prep and past papers',
            },
          ],
        },
        {
          name: 'Social',
          channels: [
            {
              name: 'general',
              type: 'TEXT',
              topic: 'Campus and general discussion',
            },
            {
              name: 'off-topic',
              type: 'TEXT',
              topic: 'Anything else',
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
            {
              name: 'Group Project',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
