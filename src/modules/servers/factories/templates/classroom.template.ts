import { Injectable } from '@nestjs/common';

import { ServerTemplate } from './server-template.interface';
import { ServerStructure } from '../../domain/server-structure.interface';

@Injectable()
export class ClassroomTemplate implements ServerTemplate {
  build(): ServerStructure {
    return {
      categories: [
        {
          name: 'Announcements',
          channels: [
            {
              name: 'announcements',
              type: 'ANNOUNCEMENT',
              topic: 'Class announcements and notices',
            },
            {
              name: 'syllabus',
              type: 'TEXT',
              topic: 'Course syllabus and reading list',
            },
          ],
        },
        {
          name: 'General',
          channels: [
            {
              name: 'general',
              type: 'TEXT',
              topic: 'General class discussion',
            },
            {
              name: 'homework-help',
              type: 'TEXT',
              topic: 'Ask questions about assignments',
            },
            {
              name: 'study-groups',
              type: 'TEXT',
              topic: 'Form study groups and coordinate',
            },
          ],
        },
        {
          name: 'Voice Channels',
          channels: [
            {
              name: 'Class Voice',
              type: 'VOICE',
            },
            {
              name: 'Office Hours',
              type: 'VOICE',
            },
          ],
        },
      ],
    };
  }
}
