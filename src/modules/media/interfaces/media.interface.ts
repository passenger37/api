export interface MediaJobInput {
  attachmentId: string;
  type: 'THUMBNAIL' | 'TRANSCODE' | 'AV_SCAN' | 'WATERMARK' | 'METADATA_EXTRACTION';
  input?: Record<string, any>;
  priority?: number;
}

export interface MediaJobOutput {
  jobId: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
}

export interface ThumbnailVariant {
  key: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
}

export interface TranscodeVariant {
  resolution: string;
  codec: string;
  bitrate?: number;
  storageKey: string;
  sizeBytes?: number;
  duration?: number;
}

export interface AvScanResult {
  result: 'clean' | 'infected' | 'suspicious' | 'error';
  engine: string;
  threatName?: string;
  durationMs?: number;
  rawOutput?: Record<string, any>;
}