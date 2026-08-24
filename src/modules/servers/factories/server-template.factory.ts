import { Injectable } from '@nestjs/common';

import { ServerTemplateType } from '@prisma/client';

import { CodingTemplate } from './templates/coding.template';
import { ClassroomTemplate } from './templates/classroom.template';
import { CustomTemplate } from './templates/custom.template';
import { ServerTemplate } from './templates/server-template.interface';

@Injectable()
export class ServerTemplateFactory {
  constructor(
    private readonly coding: CodingTemplate,
    private readonly classroom: ClassroomTemplate,
    private readonly custom: CustomTemplate,
  ) {}

  getTemplate(type: ServerTemplateType): ServerTemplate {
    switch (type) {
      case ServerTemplateType.CODING:
        return this.coding;

      case ServerTemplateType.CLASSROOM:
        return this.classroom;

      default:
        return this.custom;
    }
  }
}
