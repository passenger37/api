import { ServerTemplateType } from '@prisma/client';

import { ServerTemplateFactory } from './server-template.factory';
import { CodingTemplate } from './templates/coding.template';
import { ClassroomTemplate } from './templates/classroom.template';
import { SchoolClubTemplate } from './templates/school-club.template';
import { UniversityTemplate } from './templates/university.template';
import { CompanyTemplate } from './templates/company.template';
import { StudyGroupTemplate } from './templates/study-group.template';
import { GamingTemplate } from './templates/gaming.template';
import { CustomTemplate } from './templates/custom.template';
import { ChannelType } from '../domain/server-structure.interface';

const CHANNEL_TYPES: ChannelType[] = [
  'TEXT',
  'VOICE',
  'ANNOUNCEMENT',
  'FORUM',
  'STAGE',
];

describe('ServerTemplateFactory', () => {
  let factory: ServerTemplateFactory;

  beforeEach(() => {
    factory = new ServerTemplateFactory(
      new CodingTemplate(),
      new ClassroomTemplate(),
      new SchoolClubTemplate(),
      new UniversityTemplate(),
      new CompanyTemplate(),
      new StudyGroupTemplate(),
      new GamingTemplate(),
      new CustomTemplate(),
    );
  });

  it('resolves every declared template type to a distinct template', () => {
    const resolutions = Object.values(ServerTemplateType).map((type) =>
      factory.getTemplate(type),
    );
    // All 8 enum values must resolve; CUSTOM and the unknown default share the
    // fallback, so the distinct classes are 7 dedicated + 1 fallback = 8.
    const unique = new Set(resolutions.map((t) => t.constructor.name));
    expect(unique.size).toBe(8);
  });

  it('maps each template type to its dedicated template', () => {
    expect(factory.getTemplate(ServerTemplateType.CODING)).toBeInstanceOf(
      CodingTemplate,
    );
    expect(factory.getTemplate(ServerTemplateType.CLASSROOM)).toBeInstanceOf(
      ClassroomTemplate,
    );
    expect(factory.getTemplate(ServerTemplateType.SCHOOL_CLUB)).toBeInstanceOf(
      SchoolClubTemplate,
    );
    expect(factory.getTemplate(ServerTemplateType.UNIVERSITY)).toBeInstanceOf(
      UniversityTemplate,
    );
    expect(factory.getTemplate(ServerTemplateType.COMPANY)).toBeInstanceOf(
      CompanyTemplate,
    );
    expect(factory.getTemplate(ServerTemplateType.STUDY_GROUP)).toBeInstanceOf(
      StudyGroupTemplate,
    );
    expect(factory.getTemplate(ServerTemplateType.GAMING)).toBeInstanceOf(
      GamingTemplate,
    );
  });

  it('uses the custom template as the default fallback', () => {
    expect(factory.getTemplate(ServerTemplateType.CUSTOM)).toBeInstanceOf(
      CustomTemplate,
    );
    // Unknown enum values fall back to the custom template too.
    expect(
      factory.getTemplate('UNKNOWN_TYPE' as ServerTemplateType),
    ).toBeInstanceOf(CustomTemplate);
  });

  it.each([
    CodingTemplate,
    ClassroomTemplate,
    SchoolClubTemplate,
    UniversityTemplate,
    CompanyTemplate,
    StudyGroupTemplate,
    GamingTemplate,
    CustomTemplate,
  ])('%s builds a valid server structure', (TemplateClass) => {
    const structure = new TemplateClass().build();

    expect(structure.categories.length).toBeGreaterThan(0);

    for (const category of structure.categories) {
      expect(category.name.trim().length).toBeGreaterThan(0);
      expect(category.channels.length).toBeGreaterThan(0);

      for (const channel of category.channels) {
        expect(channel.name.trim().length).toBeGreaterThan(0);
        expect(CHANNEL_TYPES).toContain(channel.type);
      }
    }
  });
});
