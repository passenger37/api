import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StorageConfig {
  endpoint?: string;
  port?: number;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
  forcePathStyle?: boolean;
  publicBaseUrl?: string | null;
}

@Injectable()
export class AttachmentStorageService {
  constructor(private readonly configService: ConfigService) {}

  private client?: S3Client;

  private get config(): StorageConfig {
    return this.configService.getOrThrow<StorageConfig>('storage');
  }

  private getClient(): S3Client {
    if (!this.client) {
      const { endpoint, port, accessKey, secretKey } = this.config;

      let resolvedEndpoint: string | undefined;
      if (endpoint) {
        resolvedEndpoint = endpoint.includes('://')
          ? endpoint
          : port
            ? `http://${endpoint}:${port}`
            : `https://${endpoint}`;
      }

      this.client = new S3Client({
        region: this.config.region ?? 'auto',
        forcePathStyle: this.config.forcePathStyle ?? true,
        endpoint: resolvedEndpoint,
        ...(accessKey && secretKey
          ? {
              credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
              },
            }
          : {}),
      });
    }

    return this.client;
  }

  // pnpm resolves duplicate @smithy/* typings across the AWS SDK packages,
  // making the signer's Client type structurally incompatible with S3Client
  // at compile time only; at runtime they are compatible.
  private signable(): Parameters<typeof getSignedUrl>[0] {
    return this.getClient() as unknown as Parameters<typeof getSignedUrl>[0];
  }

  async createPresignedPutUrl(
    objectKey: string,
    mimeType: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ContentType: mimeType,
    });

    return getSignedUrl(this.signable(), command, {
      expiresIn: expiresInSeconds,
    });
  }

  async createPresignedGetUrl(
    objectKey: string,
    mimeType: string,
    fileName: string,
    disposition: 'inline' | 'attachment' = 'attachment',
    expiresInSeconds = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ResponseContentType: mimeType,
      ResponseContentDisposition: `${disposition}; filename="${fileName}"`,
    });

    return getSignedUrl(this.signable(), command, {
      expiresIn: expiresInSeconds,
    });
  }

  async objectSize(objectKey: string): Promise<number | null> {
    try {
      const head = await this.getClient().send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
        }),
      );

      return head.ContentLength ?? null;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;

      if (status === 403 || status === 404) {
        return null;
      }

      throw new ServiceUnavailableException(
        'Object storage is temporarily unavailable.',
      );
    }
  }

  publicUrl(objectKey: string): string | null {
    const base = this.config.publicBaseUrl;

    if (!base) {
      return null;
    }

    return `${base}/${objectKey}`;
  }
}
