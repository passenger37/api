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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MediaProcessingService } from '../services/media-processing.service';
import { MediaQueueService } from '../queues/media-queue.service';
import {
  MediaJobDto,
  ProcessAttachmentDto,
  MediaJobStatusDto,
  MediaConfigDto,
} from '../dto/media.dto';

@ApiTags('Media Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaProcessing: MediaProcessingService,
    private readonly mediaQueue: MediaQueueService,
  ) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Enqueue a media processing job' })
  async enqueueJob(
    @CurrentUser('id') userId: string,
    @Body() dto: MediaJobDto,
  ) {
    // Verify attachment exists and user has access
    // This would be done in the service layer

    let jobId: string;

    switch (dto.type) {
      case 'THUMBNAIL':
        jobId = await this.mediaProcessing.enqueueThumbnailJob(
          dto.attachmentId,
          dto.input,
        );
        break;
      case 'TRANSCODE':
        jobId = await this.mediaProcessing.enqueueTranscodeJob(
          dto.attachmentId,
          dto.input,
        );
        break;
      case 'AV_SCAN':
        jobId = await this.mediaProcessing.enqueueAvScanJob(dto.attachmentId);
        break;
      case 'METADATA_EXTRACTION':
        jobId = await this.mediaProcessing.enqueueMetadataExtractionJob(
          dto.attachmentId,
        );
        break;
      default:
        throw new BadRequestException('Unknown job type');
    }

    return { success: true, jobId };
  }

  @Post('process')
  @ApiOperation({
    summary: 'Process attachment with full pipeline or selected jobs',
  })
  async processAttachment(
    @CurrentUser('id') userId: string,
    @Body() dto: ProcessAttachmentDto,
  ) {
    const jobIds = await this.mediaProcessing.enqueueFullPipeline(
      dto.attachmentId,
    );
    return { success: true, jobIds };
  }

  @Get('jobs/:queueName/:jobId/status')
  @ApiOperation({ summary: 'Get job status' })
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    const status = await this.mediaQueue.getJobStatus(queueName, jobId);
    if (!status) {
      throw new BadRequestException('Job not found');
    }
    return status;
  }

  @Get('attachments/:attachmentId/jobs')
  @ApiOperation({ summary: 'Get all jobs for an attachment' })
  async getAttachmentJobs(@Param('attachmentId') attachmentId: string) {
    return this.mediaProcessing.getAttachmentJobs(attachmentId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get processing statistics' })
  async getStats() {
    return this.mediaProcessing.getProcessingStats();
  }

  @Post('config')
  @ApiOperation({ summary: 'Set media processing config' })
  async setConfig(@Body() dto: MediaConfigDto) {
    await this.mediaProcessing.setConfig(dto.key, dto.value, dto.description);
    return { success: true };
  }

  @Get('config/:key')
  @ApiOperation({ summary: 'Get media processing config' })
  async getConfig(@Param('key') key: string) {
    const value = await this.mediaProcessing.getConfig(key);
    return { key, value };
  }

  @Post('queues/:queueName/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.mediaQueue.pauseQueue(queueName);
    return { success: true, paused: true };
  }

  @Post('queues/:queueName/resume')
  @ApiOperation({ summary: 'Resume a queue' })
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.mediaQueue.resumeQueue(queueName);
    return { success: true, paused: false };
  }

  @Post('queues/:queueName/drain')
  @ApiOperation({ summary: 'Drain a queue (wait for all jobs to complete)' })
  async drainQueue(@Param('queueName') queueName: string) {
    await this.mediaQueue.drainQueue(queueName);
    return { success: true };
  }
}
