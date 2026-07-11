import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('test')
  async test() {
    const result = await this.prisma.$queryRaw`SELECT NOW()`;

    return {
      status: 'Database Connected',
      result,
    };
  }
}
