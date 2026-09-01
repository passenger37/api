import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeDeliveryCommandService } from '../services/e2ee-delivery-command.service';
import { E2eeDeliveryQueryService } from '../services/e2ee-delivery-query.service';
import { CreateDeliveryRequest, MarkDeliveryDeliveredDto, MarkDeliveryFailedDto, CreateGroupDeliveryRequest } from '../dto/delivery.request';

@ApiTags('E2EE Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/delivery')
export class E2eeDeliveryController {
  constructor(
    private readonly commandService: E2eeDeliveryCommandService,
    private readonly queryService: E2eeDeliveryQueryService,
  ) {}

  // 1:1 Delivery
  @Post('enqueue')
  @ApiOperation({ summary: 'Enqueue an envelope for delivery to a device' })
  async enqueueDelivery(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDeliveryRequest,
  ) {
    return this.commandService.enqueueDelivery(userId, dto);
  }

  @Post('queue/:queueId/delivered')
  @ApiOperation({ summary: 'Mark a delivery queue entry as delivered' })
  async markDelivered(
    @CurrentUser('id') userId: string,
    @Param('queueId') queueId: string,
  ) {
    return this.commandService.markDelivered({ queueId });
  }

  @Post('queue/:queueId/failed')
  @ApiOperation({ summary: 'Mark a delivery queue entry as failed' })
  async markFailed(
    @CurrentUser('id') userId: string,
    @Param('queueId') queueId: string,
    @Body('error') error?: string,
  ) {
    return this.commandService.markFailed({ queueId, error });
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending deliveries for a device' })
  async getPendingDeliveries(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.getPendingDeliveries(deviceId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('pending/count')
  @ApiOperation({ summary: 'Count pending deliveries for a device' })
  async countPendingDeliveries(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.queryService.countPendingDeliveries(deviceId);
  }

  // Group Delivery
  @Post('group/enqueue')
  @ApiOperation({ summary: 'Enqueue a group envelope for delivery to a device' })
  async enqueueGroupDelivery(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupDeliveryRequest,
  ) {
    return this.commandService.enqueueGroupDelivery(userId, dto);
  }

  @Post('group/queue/:queueId/delivered')
  @ApiOperation({ summary: 'Mark a group delivery queue entry as delivered' })
  async markGroupDelivered(
    @CurrentUser('id') userId: string,
    @Param('queueId') queueId: string,
  ) {
    return this.commandService.markGroupDelivered(queueId);
  }

  @Post('group/queue/:queueId/failed')
  @ApiOperation({ summary: 'Mark a group delivery queue entry as failed' })
  async markGroupFailed(
    @CurrentUser('id') userId: string,
    @Param('queueId') queueId: string,
    @Body('error') error?: string,
  ) {
    return this.commandService.markGroupFailed(queueId, error);
  }

  @Get('group/pending')
  @ApiOperation({ summary: 'Get pending group deliveries for a device' })
  async getPendingGroupDeliveries(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.getPendingGroupDeliveries(deviceId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('group/pending/count')
  @ApiOperation({ summary: 'Count pending group deliveries for a device' })
  async countPendingGroupDeliveries(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.queryService.countPendingGroupDeliveries(deviceId);
  }
}