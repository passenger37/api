import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeBackupCommandService } from '../services/e2ee-backup-command.service';
import { E2eeBackupQueryService } from '../services/e2ee-backup-query.service';
import { CreateBackupRequest, GetBackupsRequest } from '../dto/backup.request';

@ApiTags('E2EE Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/backup')
export class E2eeBackupController {
  constructor(
    private readonly commandService: E2eeBackupCommandService,
    private readonly queryService: E2eeBackupQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an encrypted backup' })
  async createBackup(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBackupRequest,
  ) {
    return this.commandService.createBackup(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get backups for user or device' })
  async getBackups(
    @CurrentUser('id') userId: string,
    @Query() query: GetBackupsRequest,
  ) {
    return this.queryService.getBackups(userId, query);
  }

  @Get(':backupId')
  @ApiOperation({ summary: 'Get backup by ID' })
  async getBackup(
    @CurrentUser('id') userId: string,
    @Param('backupId') backupId: string,
  ) {
    return this.queryService.getBackupById(userId, backupId);
  }

  @Delete(':backupId')
  @ApiOperation({ summary: 'Delete a backup' })
  async deleteBackup(
    @CurrentUser('id') userId: string,
    @Param('backupId') backupId: string,
  ) {
    return this.commandService.deleteBackup(userId, backupId);
  }
}