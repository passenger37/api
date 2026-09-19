import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { IdempotencyService } from '../services/idempotency.service';
import { HttpRateLimitService } from '../services/http-rate-limit.service';
import { AuditLogService } from '../services/audit-log.service';
import { RequireIdempotency } from '../guards/idempotency.guard';

@ApiTags('Production Hardening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('production-hardening')
export class ProductionHardeningController {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly httpRateLimitService: HttpRateLimitService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('rate-limit/info')
  @ApiOperation({ summary: 'Get rate limit info for current user' })
  async getRateLimitInfo(@Req() req: any) {
    const userId = req.user?.id;
    const ip = req.ip;
    return { message: 'Rate limit info endpoint', userId, ip };
  }

  @Post('idempotency/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear idempotency key' })
  async clearIdempotencyKey(@Body() body: { key: string }) {
    await this.idempotencyService.remove(body.key);
    return { success: true };
  }

  @Post('audit/log')
  @HttpCode(HttpStatus.OK)
  @RequireIdempotency()
  @ApiOperation({ summary: 'Log audit event' })
  async logAuditEvent(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      action: string;
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      success?: boolean;
      errorMessage?: string;
    },
    @Req() req: any,
  ) {
    await this.auditLogService.log({
      action: body.action,
      userId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      details: body.details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: body.severity ?? 'LOW',
      success: body.success ?? true,
      errorMessage: body.errorMessage,
    });

    return { success: true };
  }

  @Get('audit/logs')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return {
      message: 'Audit logs endpoint',
      params: { userId, action, severity, from, to, limit, offset },
    };
  }

  @Post('rate-limit/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset rate limit for key' })
  async resetRateLimit(@Body() body: { key: string }) {
    await this.httpRateLimitService.reset(body.key);
    return { success: true };
  }
}
