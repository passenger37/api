import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AttachmentValidationService {
  static readonly MAX_FILE_NAME_LENGTH = 255;

  static readonly MAX_PENDING_ATTACHMENTS_PER_CHANNEL = 10;

  // mimeType -> max size in bytes. Part 1 ships a conservative allowlist;
  // advanced sniffing/scanning arrives with the Media Pipeline (Part 2).
  static readonly ALLOWED_MIME_TYPES: Readonly<Record<string, number>> = {
    // Images
    'image/jpeg': 10 * 1024 * 1024,
    'image/png': 10 * 1024 * 1024,
    'image/webp': 10 * 1024 * 1024,
    'image/gif': 15 * 1024 * 1024,
    // Video
    'video/mp4': 100 * 1024 * 1024,
    'video/webm': 100 * 1024 * 1024,
    // Audio
    'audio/mpeg': 25 * 1024 * 1024,
    'audio/ogg': 25 * 1024 * 1024,
    'audio/wav': 25 * 1024 * 1024,
    // Text / documents
    'text/plain': 1024 * 1024,
    'text/markdown': 1024 * 1024,
    'text/csv': 1024 * 1024,
    'application/pdf': 10 * 1024 * 1024,
    'application/json': 1024 * 1024,
    // Archives
    'application/zip': 50 * 1024 * 1024,
    'application/gzip': 50 * 1024 * 1024,
  };

  sanitizeFileName(fileName: string): string {
    const base = fileName.replace(/\\/g, '/').split('/').pop() ?? '';

    const clean = base
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[^\w.\-\s]+/g, '_')
      .trim();

    return clean.slice(0, AttachmentValidationService.MAX_FILE_NAME_LENGTH);
  }

  validateUploadPolicy(fileName: string, mimeType: string, sizeBytes: number) {
    const sanitized = this.sanitizeFileName(fileName);

    if (!sanitized.length) {
      throw new BadRequestException('File name is invalid.');
    }

    const maxSize = AttachmentValidationService.ALLOWED_MIME_TYPES[mimeType];

    if (!maxSize) {
      throw new BadRequestException('Unsupported file type.');
    }

    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestException('File size must be a positive integer.');
    }

    if (sizeBytes > maxSize) {
      throw new BadRequestException(
        `File exceeds the ${mimeType} size limit of ${Math.floor(maxSize / 1024 / 1024)} MB.`,
      );
    }

    return sanitized;
  }
}
