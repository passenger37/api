import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeGroupCommandService } from '../services/e2ee-group-command.service';
import { E2eeGroupQueryService } from '../services/e2ee-group-query.service';
import {
  CreateGroupRequest,
  AddMemberRequest,
  RemoveMemberRequest,
  UpdateMemberRoleRequest,
  SendGroupEnvelopeRequest,
  GetGroupEnvelopesRequest,
  GetGroupMembersRequest,
} from '../dto/group.request';

@ApiTags('E2EE Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/groups')
export class E2eeGroupController {
  constructor(
    private readonly commandService: E2eeGroupCommandService,
    private readonly queryService: E2eeGroupQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new E2EE group' })
  async createGroup(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupRequest,
  ) {
    return this.commandService.createGroup(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get groups created by the current user' })
  async getMyGroups(@CurrentUser('id') userId: string) {
    return this.queryService.getMyGroups(userId);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get a group by ID' })
  async getGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.queryService.getGroup(userId, groupId);
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: 'Add a member to the group' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberRequest,
  ) {
    return this.commandService.addMember(userId, { ...dto, groupId });
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get group members' })
  async getMembers(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.queryService.getMembers(userId, { groupId });
  }

  @Patch(':groupId/members/:deviceId/role')
  @ApiOperation({ summary: 'Update a member role' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('deviceId') deviceId: string,
    @Body('role') role: 'ADMIN' | 'MEMBER',
  ) {
    return this.commandService.updateMemberRole(userId, {
      groupId,
      deviceId,
      role,
    });
  }

  @Delete(':groupId/members/:deviceId')
  @ApiOperation({ summary: 'Remove a member from the group' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.commandService.removeMember(userId, { groupId, deviceId });
  }

  @Post(':groupId/envelopes')
  @ApiOperation({ summary: 'Send an encrypted group envelope' })
  async sendEnvelope(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupEnvelopeRequest,
  ) {
    return this.commandService.sendEnvelope(userId, { ...dto, groupId });
  }

  @Get(':groupId/envelopes')
  @ApiOperation({ summary: 'Get group envelopes' })
  async getEnvelopes(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Query() query: GetGroupEnvelopesRequest,
  ) {
    return this.queryService.getEnvelopes(groupId, { ...query, groupId });
  }

  @Get(':groupId/envelopes/pending')
  @ApiOperation({ summary: 'Get pending envelopes for a group' })
  async getPendingEnvelopes(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.getPendingEnvelopes(
      groupId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':groupId/envelopes/pending/count')
  @ApiOperation({ summary: 'Count pending envelopes for a group' })
  async countPendingEnvelopes(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.queryService.countPending(groupId);
  }

  @Post('envelopes/:envelopeId/delivered')
  @ApiOperation({ summary: 'Mark an envelope as delivered' })
  async markDelivered(
    @CurrentUser('id') userId: string,
    @Param('envelopeId') envelopeId: string,
  ) {
    return this.commandService.markEnvelopeDelivered(envelopeId);
  }

  @Post('envelopes/:envelopeId/failed')
  @ApiOperation({ summary: 'Mark an envelope as failed' })
  async markFailed(
    @CurrentUser('id') userId: string,
    @Param('envelopeId') envelopeId: string,
    @Body('error') error: string,
  ) {
    return this.commandService.markEnvelopeFailed(envelopeId, error);
  }
}
