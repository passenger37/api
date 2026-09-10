import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { SystemRole } from '../../../common/constants/system-role.enum';
import { CurrentUser, Roles } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SystemDmSendRequest } from '../dto/request/system-dm-send.request';
import { SystemDmService } from '../services/system-dm.service';

@Controller('dm/system')
export class SystemDmController {
  constructor(private readonly systemDmService: SystemDmService) {}

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  async send(
    @CurrentUser('id') senderId: string,
    @Body() request: SystemDmSendRequest,
  ) {
    return this.systemDmService.send(
      senderId,
      request.targetUserId,
      request.content,
      request.clientMessageId,
    );
  }
}
