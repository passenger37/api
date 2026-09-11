import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MediaQueueService } from '../queues/media-queue.service';
import { MediaJobInput, MediaJobOutput, ThumbnailVariant, TranscodeVariant, AvScanResult } from '../interfaces/media.interface';
import * as crypto from 'crypto';

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  // Default thumbnail sizes
  private readonly thumbnailSizes = [
    { label: 'small', width: 160, height: 160 },
    { label: 'medium', width: 320, height: 320 },
    { label: 'large', width: 640, height: 640 },
  ];

  // Default transcode resolutions
  private readonly transcodeResolutions = [
    { label: '480p', width: 854, height: 480, bitrate: 1000 },
    { label: '720p', width: 1280, height: 720, bitrate: 2500 },
    { label: '1080p', width: 1920, height: 1080, bitrate: 5000 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mediaQueue: MediaQueueService,
  ) {}

  // ============ Job Enqueueing ============

  async enqueueThumbnailJob(attachmentId: string, input?: Record<string, any>): Promise<string> {
    const job = await this.mediaQueue.addJob('media-thumbnail', 'generate-thumbnail', {
      attachmentId,
      type: 'THUMBNAIL',
      input: { sizes: this.thumbnailSizes, ...input },
    });
    return job.id || '';
  }

  async enqueueTranscodeJob(attachmentId: string, input?: Record<string, any>): Promise<string> {
    const job = await this.mediaQueue.addJob('media-transcode', 'transcode-video', {
      attachmentId,
      type: 'TRANSCODE',
      input: { resolutions: this.transcodeResolutions, ...input },
    });
    return job.id || '';
  }

  async enqueueAvScanJob(attachmentId: string): Promise<string> {
    const job = await this.mediaQueue.addJob('media-av-scan', 'scan-file', {
      attachmentId,
      type: 'AV_SCAN',
    });
    return job.id || '';
  }

  async enqueueMetadataExtractionJob(attachmentId: string): Promise<string> {
    const job = await this.mediaQueue.addJob('media-metadata', 'extract-metadata', {
      attachmentId,
      type: 'METADATA_EXTRACTION',
    });
    return job.id || '';
  }

  async enqueueFullPipeline(attachmentId: string): Promise<string[]> {
    const jobIds: string[] = [];
    
    // Always scan for viruses first
    jobIds.push(await this.enqueueAvScanJob(attachmentId));
    
    // Get attachment info to determine what processing is needed
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
    });
    
    if (!attachment) throw new Error('Attachment not found');
    
    // Thumbnails for images
    if (attachment.mimeType.startsWith('image/')) {
      jobIds.push(await this.enqueueThumbnailJob(attachmentId));
    }
    
    // Transcode for videos
    if (attachment.mimeType.startsWith('video/')) {
      jobIds.push(await this.enqueueTranscodeJob(attachmentId));
    }
    
    // Always extract metadata
    jobIds.push(await this.enqueueMetadataExtractionJob(attachmentId));
    
    return jobIds;
  }

  // ============ Job Status ============

  async getJobStatus(queueName: string, jobId: string) {
    return this.mediaQueue.getJobStatus(queueName, jobId);
  }

  async getAttachmentJobs(attachmentId: string) {
    return this.prisma.mediaJob.findMany({
      where: { attachmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Processing Logic ============

  // Thumbnail generation would use sharp or similar
  // This is a placeholder - actual implementation would use sharp
  async generateThumbnails(attachmentId: string, storageKey: string, mimeType: string): Promise<ThumbnailVariant[]> {
    // In production, this would:
    // 1. Download the file from object storage
    // 2. Use sharp to generate thumbnails at configured sizes
    // 3. Upload thumbnails to object storage
    // 4. Save thumbnail records to database
    // 5. Return variant info
    
    // Placeholder implementation
    const variants = this.thumbnailSizes.map(size => ({
      label: size.label,
      width: size.width,
      height: size.height,
      key: `thumbnails/${attachmentId}/${size.label}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 0,
    }));

    // Save thumbnail record
    await this.prisma.mediaThumbnail.upsert({
      where: { attachmentId },
      create: {
        attachmentId,
        variants: variants.map(v => ({
          label: v.label,
          key: v.key,
          width: v.width,
          height: v.height,
          mimeType: v.mimeType,
          sizeBytes: v.sizeBytes,
        })),
      },
      update: {
        variants: variants.map(v => ({
          label: v.label,
          key: v.key,
          width: v.width,
          height: v.height,
          mimeType: v.mimeType,
          sizeBytes: v.sizeBytes,
        })),
      },
    });

    return variants;
  }

  async transcodeVideo(attachmentId: string, storageKey: string, mimeType: string): Promise<TranscodeVariant[]> {
    // In production, this would:
    // 1. Download the video from object storage
    // 2. Use ffmpeg to transcode to multiple resolutions
    // 3. Upload transcoded versions
    // 4. Save transcode records
    
    const variants = this.transcodeResolutions.map(res => ({
      resolution: res.label,
      codec: 'h264',
      bitrate: res.bitrate,
      storageKey: `transcodes/${attachmentId}/${res.label}.mp4`,
      sizeBytes: 0,
      duration: 0,
    }));

    // Save transcode records
    for (const variant of variants) {
      await this.prisma.mediaTranscode.upsert({
        where: { attachmentId_resolution: { attachmentId, resolution: variant.resolution } },
        create: {
          attachmentId,
          resolution: variant.resolution,
          codec: variant.codec,
          bitrate: variant.bitrate,
          storageKey: variant.storageKey,
          sizeBytes: variant.sizeBytes,
          duration: variant.duration,
          status: 'COMPLETED',
        },
        update: {
          storageKey: variant.storageKey,
          sizeBytes: variant.sizeBytes,
          duration: variant.duration,
          status: 'COMPLETED',
        },
      });
    }

    return variants;
  }

  async scanForViruses(attachmentId: string, storageKey: string): Promise<AvScanResult> {
    // In production, this would:
    // 1. Download file from object storage
    // 2. Scan with ClamAV or cloud AV API
    // 3. Record result
    
    // For now, return a clean result
    const result: AvScanResult = {
      result: 'clean',
      engine: 'clamav',
      durationMs: 0,
      rawOutput: { scanned: true },
    };

    // Save scan result
    await this.prisma.mediaAvScan.upsert({
      where: { attachmentId },
      create: {
        attachmentId,
        result: result.result,
        engine: result.engine,
        threatName: result.threatName,
        durationMs: result.durationMs,
        rawOutput: result.rawOutput,
      },
      update: {
        result: result.result,
        engine: result.engine,
        threatName: result.threatName,
        durationMs: result.durationMs,
        rawOutput: result.rawOutput,
      },
    });

    // If infected, mark attachment as failed
    if (result.result === 'infected') {
      await this.prisma.messageAttachment.update({
        where: { id: attachmentId },
        data: { status: 'FAILED' },
      });
    }

    return result;
  }

  async extractMetadata(attachmentId: string, storageKey: string, mimeType: string): Promise<Record<string, any>> {
    // In production, this would extract metadata using:
    // - exiftool for images
    // - ffprobe for videos
    // - PDF libraries for PDFs
    // etc.
    
    const metadata = {
      mimeType,
      extractedAt: new Date().toISOString(),
      // Placeholder for actual metadata
    };

    // Could save to attachment metadata field or separate table
    return metadata;
  }

  // ============ Configuration ============

  async getConfig(key: string): Promise<any> {
    const config = await this.prisma.mediaProcessingConfig.findUnique({ where: { key } });
    return config?.value;
  }

  async setConfig(key: string, value: any, description?: string): Promise<void> {
    await this.prisma.mediaProcessingConfig.upsert({
      where: { key },
      create: { key, value, description },
      update: { value, description },
    });
  }

  // ============ Statistics ============

  async getProcessingStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const [counts, byType] = await Promise.all([
      this.prisma.mediaJob.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.mediaJob.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
    ]);

    const statusCounts = counts.reduce((acc, c) => ({ ...acc, [c.status]: c._count.status }), {} as Record<string, number>);
    const typeCounts = byType.reduce((acc, c) => ({ ...acc, [c.type]: c._count.type }), {} as Record<string, number>);

    return {
      pending: statusCounts.PENDING || 0,
      processing: statusCounts.PROCESSING || 0,
      completed: statusCounts.COMPLETED || 0,
      failed: statusCounts.FAILED || 0,
      byType: typeCounts,
    };
  }
}