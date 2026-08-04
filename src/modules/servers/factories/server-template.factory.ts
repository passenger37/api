import { Injectable } from '@nestjs/common';

import { ServerTemplateType } from '@prisma/client';

import { CodingTemplate } from './templates/coding.template';
import { ClassroomTemplate } from './templates/classroom.template';
import { ServerTemplate } from './templates/server-template.interface';

@Injectable()
export class ServerTemplateFactory {
  constructor(
    private readonly coding: CodingTemplate,
    private readonly classroom: ClassroomTemplate,
  ) {}

  getTemplate(type: ServerTemplateType): ServerTemplate {
    switch (type) {
      case ServerTemplateType.CODING:
        return this.coding;

      case ServerTemplateType.CLASSROOM:
        return this.classroom;

      default:
        throw new Error(`Unsupported template: ${type}`);
    }
  }
}