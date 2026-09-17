import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JobsService } from '../services/jobs.service';
import { JobsQueueService } from '../queues/jobs-queue.service';
import { EnqueueJobDto, BatchEnqueueDto, GetJobsQueryDto, CreateScheduleDto, UpdateScheduleDto, GetDeadLettersDto, ResolveDeadLetterDto, GetMetricsDto, QueueManagementDto } from '../dto/jobs.dto';

@ApiTags('Background Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly queueService: JobsQueueService,
  ) {}

  // ============ Job Enqueueing ============

  @Post()
  @ApiOperation({ summary: 'Enqueue a background job' })
  async enqueueJob(
    @CurrentUser('id') userId: string,
    @Body() dto: EnqueueJobDto,
  ) {
    return this.jobsService.enqueueJob(userId, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Enqueue multiple jobs in batch' })
  async enqueueBatch(
    @CurrentUser('id') userId: string,
    @Body() dto: BatchEnqueueDto,
  ) {
    return this.jobsService.enqueueBatch(userId, dto.jobs);
  }

  // ============ Job Management ============

  @Get()
  @ApiOperation({ summary: 'List jobs with filters' })
  async getJobs(
    @CurrentUser('id') userId: string,
    @Query() query: GetJobsQueryDto,
  ) {
    return this.jobsService.getJobs(userId, query);
  }

  @Delete('admin/:jobId')
  @ApiOperation({ summary: 'Cancel job by admin (bypasses ownership check)' })
  async cancelJobByAdmin(@Param('jobId') jobId: string) {
    return this.jobsService.cancelJobByAdmin(jobId);
  }

  // ============ Scheduled Jobs ============

  @Post('schedules')
  @ApiOperation({ summary: 'Create a scheduled job' })
  async createSchedule(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.jobsService.createSchedule(userId, dto);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List scheduled jobs' })
  async getSchedules(
    @CurrentUser('id') userId: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.jobsService.getSchedules(userId, {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit: limit ? parseInt(limit) : undefined,
      cursor,
    });
  }

  @Patch('schedules/:scheduleId')
  @ApiOperation({ summary: 'Update a scheduled job' })
  async updateSchedule(
    @CurrentUser('id') userId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.jobsService.updateSchedule(userId, scheduleId, dto);
  }

  @Delete('schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete a scheduled job' })
  async deleteSchedule(
    @CurrentUser('id') userId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.jobsService.deleteSchedule(userId, scheduleId);
  }

  // ============ Dead Letters ============

  @Get('dead-letters')
  @ApiOperation({ summary: 'Get dead letter queue' })
  async getDeadLetters(
    @CurrentUser('id') userId: string,
    @Query() query: GetDeadLettersDto,
  ) {
    return this.jobsService.getDeadLetters(userId, query);
  }

  @Post('dead-letters/:deadLetterId/resolve')
  @ApiOperation({ summary: 'Resolve a dead letter' })
  async resolveDeadLetter(
    @CurrentUser('id') userId: string,
    @Param('deadLetterId') deadLetterId: string,
    @Body() dto: ResolveDeadLetterDto,
  ) {
    return this.jobsService.resolveDeadLetter(userId, deadLetterId, dto.resolutionNotes);
  }

  @Post('dead-letters/:deadLetterId/retry')
  @ApiOperation({ summary: 'Retry a dead letter' })
  async retryDeadLetter(
    @CurrentUser('id') userId: string,
    @Param('deadLetterId') deadLetterId: string,
  ) {
    return this.jobsService.retryDeadLetter(userId, deadLetterId);
  }

  // ============ Metrics ============

  @Get('metrics/:queueName')
  @ApiOperation({ summary: 'Get queue metrics' })
  async getMetrics(
    @Param('queueName') queueName: string,
    @Query('days') days?: string,
  ) {
    return this.jobsService.getMetrics(queueName, days ? parseInt(days) : 30);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get all queue metrics' })
  async getAllMetrics(@Query('days') days?: string) {
    return this.jobsService.getAllQueueMetrics(days ? parseInt(days) : 30);
  }

  // ============ Queue Management ============

  @Post('queues/:queueName/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  async pauseQueue(@Param('queueName') queueName: string) {
    return this.jobsService.pauseQueue(queueName);
  }

  @Post('queues/:queueName/resume')
  @ApiOperation({ summary: 'Resume a queue' })
  async resumeQueue(@Param('queueName') queueName: string) {
    return this.jobsService.resumeQueue(queueName);
  }

  @Post('queues/:queueName/drain')
  @ApiOperation({ summary: 'Drain a queue (wait for all jobs to complete)' })
  async drainQueue(@Param('queueName') queueName: string) {
    return this.jobsService.drainQueue(queueName);
  }

  // ============ Single Job Lookup / Mutation (declared last so static
  // ============ routes like schedules, metrics, dead-letters win) ============

  @Get(':jobId')
  @ApiOperation({ summary: 'Get job status' })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.jobsService.getJobStatus(jobId);
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Cancel a job' })
  async cancelJob(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.cancelJob(userId, jobId);
  }

  @Post(':jobId/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  async retryJob(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.retryJob(userId, jobId);
  }
}