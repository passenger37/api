import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { MediaProcessingService } from '../services/media-processing.service';
import { MediaQueueService } from './media-queue.service';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class MediaWorkersService implements OnModuleInit {
  private readonly logger = new Logger(MediaWorkersService.name);

  constructor(
    private readonly mediaProcessing: MediaProcessingService,
    private readonly mediaQueue: MediaQueueService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Register workers for each queue type
    this.registerThumbnailWorker();
    this.registerTranscodeWorker();
    this.registerAvScanWorker();
    this.registerMetadataWorker();
  }

  private registerThumbnailWorker() {
    this.mediaQueue.registerWorker(
      'media-thumbnail',
      async (job) => {
        const { attachmentId } = job.data;
        this.logger.log(
          `Processing thumbnail generation for attachment ${attachmentId}`,
        );

        // Update job status to processing
        await this.updateJobProgress(job, 10, 'PROCESSING');

        try {
          const attachment = await this.prisma.messageAttachment.findUnique({
            where: { id: job.data.attachmentId },
          });

          if (!attachment) {
            throw new Error('Attachment not found');
          }

          // Update progress
          await this.updateJobProgress(job, 30);

          // Generate thumbnails
          const variants = await this.generateThumbnails(
            job.data.attachmentId,
            attachment.storageKey,
            attachment.mimeType,
          );

          await this.updateJobProgress(job, 90);

          // Update job with results
          return { variants };
        } catch (error) {
          this.logger.error(
            `Thumbnail generation failed for ${job.data.attachmentId}:`,
            error,
          );
          throw error;
        }
      },
      { concurrency: 2 },
    );
  }

  private registerTranscodeWorker() {
    this.mediaQueue.registerWorker(
      'media-transcode',
      async (job) => {
        const { attachmentId } = job.data;
        this.logger.log(
          `Processing video transcode for attachment ${attachmentId}`,
        );

        await this.updateJobProgress(job, 10, 'PROCESSING');

        try {
          const attachment = await this.prisma.messageAttachment.findUnique({
            where: { id: job.data.attachmentId },
          });

          if (!attachment) {
            throw new Error('Attachment not found');
          }

          if (!attachment.mimeType.startsWith('video/')) {
            throw new Error('Attachment is not a video');
          }

          await this.updateJobProgress(job, 20);

          const variants = await this.transcodeVideo(
            job.data.attachmentId,
            attachment.storageKey,
            attachment.mimeType,
          );

          await this.updateJobProgress(job, 90);

          return { variants };
        } catch (error) {
          this.logger.error(
            `Transcode failed for ${job.data.attachmentId}:`,
            error,
          );
          throw error;
        }
      },
      { concurrency: 1 },
    ); // Limit concurrency for CPU-intensive transcoding
  }

  private registerAvScanWorker() {
    this.mediaQueue.registerWorker(
      'media-av-scan',
      async (job) => {
        const { attachmentId } = job.data;
        this.logger.log(`Processing AV scan for attachment ${attachmentId}`);

        await this.updateJobProgress(job, 10, 'PROCESSING');

        try {
          const attachment = await this.prisma.messageAttachment.findUnique({
            where: { id: job.data.attachmentId },
          });

          if (!attachment) {
            throw new Error('Attachment not found');
          }

          await this.updateJobProgress(job, 50);

          const result = await this.scanForViruses(
            job.data.attachmentId,
            attachment.storageKey,
          );

          await this.updateJobProgress(job, 90);

          // If infected, mark attachment as failed
          if (result.result === 'infected') {
            await this.prisma.messageAttachment.update({
              where: { id: attachment.id },
              data: { status: 'FAILED' },
            });
          }

          return result;
        } catch (error) {
          this.logger.error(
            `AV scan failed for ${job.data.attachmentId}:`,
            error,
          );
          throw error;
        }
      },
      { concurrency: 4 },
    );
  }

  private registerMetadataWorker() {
    this.mediaQueue.registerWorker(
      'media-metadata',
      async (job) => {
        const { attachmentId } = job.data;
        this.logger.log(`Extracting metadata for attachment ${attachmentId}`);

        await this.updateJobProgress(job, 20, 'PROCESSING');

        try {
          const attachment = await this.prisma.messageAttachment.findUnique({
            where: { id: job.data.attachmentId },
          });

          if (!attachment) {
            throw new Error('Attachment not found');
          }

          const metadata = await this.extractMetadata(
            job.data.attachmentId,
            attachment.storageKey,
            attachment.mimeType,
          );

          // Could save metadata to attachment or separate table
          // For now, we'll just log it
          this.logger.log(`Extracted metadata for ${attachmentId}:`, metadata);

          await this.updateJobProgress(job, 100);

          return { metadata };
        } catch (error) {
          this.logger.error(
            `Metadata extraction failed for ${job.data.attachmentId}:`,
            error,
          );
          throw error;
        }
      },
      { concurrency: 4 },
    );
  }

  // Helper methods - these would be implemented with actual processing logic
  private async generateThumbnails(
    attachmentId: string,
    storageKey: string,
    mimeType: string,
  ) {
    // This is a placeholder - actual implementation would use sharp or similar
    // For now, return mock variants
    return [
      {
        label: 'small',
        width: 160,
        height: 160,
        key: `thumbnails/${attachmentId}/small.webp`,
        mimeType: 'image/webp',
        sizeBytes: 0,
      },
      {
        label: 'medium',
        width: 320,
        height: 320,
        key: `thumbnails/${attachmentId}/medium.webp`,
        mimeType: 'image/webp',
        sizeBytes: 0,
      },
      {
        label: 'large',
        width: 640,
        height: 640,
        key: `thumbnails/${attachmentId}/large.webp`,
        mimeType: 'image/webp',
        sizeBytes: 0,
      },
    ];
  }

  private async transcodeVideo(
    attachmentId: string,
    storageKey: string,
    mimeType: string,
  ) {
    // Placeholder - would use ffmpeg in production
    return [
      {
        resolution: '480p',
        codec: 'h264',
        bitrate: 1000,
        storageKey: `transcodes/${attachmentId}/480p.mp4`,
        sizeBytes: 0,
        duration: 0,
      },
      {
        resolution: '720p',
        codec: 'h264',
        bitrate: 2500,
        storageKey: `transcodes/${attachmentId}/720p.mp4`,
        sizeBytes: 0,
        duration: 0,
      },
      {
        resolution: '1080p',
        codec: 'h264',
        bitrate: 5000,
        storageKey: `transcodes/${attachmentId}/1080p.mp4`,
        sizeBytes: 0,
        duration: 0,
      },
    ];
  }

  private async scanForViruses(attachmentId: string, storageKey: string) {
    // Placeholder - would integrate with ClamAV or cloud AV
    return {
      result: 'clean',
      engine: 'clamav',
      durationMs: 100,
    };
  }

  private async extractMetadata(
    attachmentId: string,
    storageKey: string,
    mimeType: string,
  ) {
    return {
      mimeType,
      extractedAt: new Date().toISOString(),
    };
  }

  private async updateJobProgress(
    job: any,
    progress: number,
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  ) {
    await job.updateProgress(progress);
    if (status) {
      // Update job status in database
      await this.prisma.mediaJob
        .update({
          where: { id: job.data.jobId || job.id },
          data: { progress, status: status || 'PROCESSING' },
        })
        .catch(() => {}); // Ignore if job ID not in DB yet
    }
  }
}
