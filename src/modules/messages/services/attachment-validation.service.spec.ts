import { BadRequestException } from '@nestjs/common';

import { AttachmentValidationService } from './attachment-validation.service';

describe('AttachmentValidationService', () => {
  let service: AttachmentValidationService;

  beforeEach(() => {
    service = new AttachmentValidationService();
  });

  describe('sanitizeFileName', () => {
    it('should strip path segments', () => {
      expect(service.sanitizeFileName('../../etc/passwd')).toBe('passwd');
      expect(service.sanitizeFileName('a\\b\\c.txt')).toBe('c.txt');
    });

    it('should strip control characters and unsafe symbols', () => {
      expect(service.sanitizeFileName('a\u0000b.txt')).toBe('ab.txt');
      expect(service.sanitizeFileName('a;rm -rf b.jpg')).toBe('a_rm -rf b.jpg');
    });

    it('should cap the length at 255 characters', () => {
      const long = `${'a'.repeat(300)}.png`;
      expect(service.sanitizeFileName(long).length).toBe(255);
    });

    it('should return an empty string when nothing remains', () => {
      expect(service.sanitizeFileName('...')).toBe('...');
    });
  });

  describe('validateUploadPolicy', () => {
    it('should accept an allowed mime with a fitting size', () => {
      const result = service.validateUploadPolicy('cat.png', 'image/png', 1024);
      expect(result).toBe('cat.png');
    });

    it('should reject an unsupported mime type', () => {
      expect(() =>
        service.validateUploadPolicy(
          'virus.exe',
          'application/x-msdownload',
          10,
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject a size over the per-type limit', () => {
      expect(() =>
        service.validateUploadPolicy('big.png', 'image/png', 11 * 1024 * 1024),
      ).toThrow(BadRequestException);
    });

    it('should reject non-positive sizes', () => {
      expect(() =>
        service.validateUploadPolicy('a.png', 'image/png', 0),
      ).toThrow(BadRequestException);
    });
  });
});
