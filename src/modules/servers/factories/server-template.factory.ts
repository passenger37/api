import { Injectable } from '@nestjs/common';

import { ServerTemplateType } from '@prisma/client';

import { CodingTemplate } from './templates/coding.template';
import { ClassroomTemplate } from './templates/classroom.template';
import { SchoolClubTemplate } from './templates/school-club.template';
import { UniversityTemplate } from './templates/university.template';
import { CompanyTemplate } from './templates/company.template';
import { StudyGroupTemplate } from './templates/study-group.template';
import { GamingTemplate } from './templates/gaming.template';
import { CustomTemplate } from './templates/custom.template';
import { ServerTemplate } from './templates/server-template.interface';

@Injectable()
export class ServerTemplateFactory {
  constructor(
    private readonly coding: CodingTemplate,
    private readonly classroom: ClassroomTemplate,
    private readonly schoolClub: SchoolClubTemplate,
    private readonly university: UniversityTemplate,
    private readonly company: CompanyTemplate,
    private readonly studyGroup: StudyGroupTemplate,
    private readonly gaming: GamingTemplate,
    private readonly custom: CustomTemplate,
  ) {}

  getTemplate(type: ServerTemplateType): ServerTemplate {
    switch (type) {
      case ServerTemplateType.CODING:
        return this.coding;

      case ServerTemplateType.CLASSROOM:
        return this.classroom;

      case ServerTemplateType.SCHOOL_CLUB:
        return this.schoolClub;

      case ServerTemplateType.UNIVERSITY:
        return this.university;

      case ServerTemplateType.COMPANY:
        return this.company;

      case ServerTemplateType.STUDY_GROUP:
        return this.studyGroup;

      case ServerTemplateType.GAMING:
        return this.gaming;

      default:
        return this.custom;
    }
  }
}
