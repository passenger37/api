import { Controller, Get ,Post,Body, BadRequestException} from '@nestjs/common';
// import { PrismaService } from '../../core/database';
import {LoginDto} from '../../commons/dto/temp.dto';
import { ConfigService } from '@nestjs/config/dist/config.service';

@Controller('test')
export class TestController {
    constructor(private readonly config: ConfigService) {}

  @Get()
  test() {
    // const result = await this.prisma.$queryRaw`SELECT NOW()`;
 return {
      app: this.config.get('app.name'),
      port: this.config.get('app.port'),
      jwt: this.config.get('jwt.expiresIn'),
    };
  }

}
