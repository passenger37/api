export interface JobInput {
  name: string;
  queueName: string;
  payload: Record<string, any>;
  options?: JobOptions;
}

export interface JobOptions {
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  maxRetries?: number;
  scheduledAt?: Date;
  cronExpression?: string;
  tags?: string[];
  correlationId?: string;
  idempotencyKey?: string;
  userId?: string;
}

export interface ScheduledJobInput {
  name: string;
  cronExpression: string;
  timezone?: string;
  jobName: string;
  payload?: Record<string, any>;
  isActive?: boolean;
}

export interface JobStatusResponse {
  id: string;
  name: string;
  queueName: string;
  status: string;
  priority: string;
  attempts: number;
  maxRetries: number;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  lastError: string | null;
  result: Record<string, any> | null;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleStatusResponse {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  jobName: string;
  payload: Record<string, any> | null;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobMetricsResponse {
  date: Date;
  queueName: string;
  totalProcessed: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  avgProcessingTimeMs: number;
  peakConcurrent: number;
  avgQueueTimeMs: number;
  retryRate: number;
}

export interface DeadLetterResponse {
  id: string;
  jobId: string;
  jobName: string;
  queueName: string;
  payload: Record<string, any>;
  error: string;
  attempts: number;
  lastError: string | null;
  failedAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
}