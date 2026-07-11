import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../src/core/database/prisma.service';

@Controller('test')
export class TestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async test() {
    await this.prisma.$queryRaw`SELECT NOW()`;
    return {
      status: 'Database Connected',
    };
  }
}
