import { E2eeDeliveryQueue, E2eeGroupDeliveryQueue, E2eeDeliveryStatus } from '@prisma/client';

export interface DeliveryQueueResponse {
  id: string;
  envelopeId: string;
  targetDeviceId: string;
  status: E2eeDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupDeliveryQueueResponse {
  id: string;
  envelopeId: string;
  targetDeviceId: string;
  status: E2eeDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeDeliveryQueue(queue: E2eeDeliveryQueue): DeliveryQueueResponse {
  return {
    id: queue.id,
    envelopeId: queue.envelopeId,
    targetDeviceId: queue.targetDeviceId,
    status: queue.status,
    attempts: queue.attempts,
    maxAttempts: queue.maxAttempts,
    lastError: queue.lastError,
    nextRetryAt: queue.nextRetryAt,
    deliveredAt: queue.deliveredAt,
    expiredAt: queue.expiredAt,
    createdAt: queue.createdAt,
    updatedAt: queue.updatedAt,
  };
}

export function serializeGroupDeliveryQueue(queue: E2eeGroupDeliveryQueue): GroupDeliveryQueueResponse {
  return {
    id: queue.id,
    envelopeId: queue.envelopeId,
    targetDeviceId: queue.targetDeviceId,
    status: queue.status,
    attempts: queue.attempts,
    maxAttempts: queue.maxAttempts,
    lastError: queue.lastError,
    nextRetryAt: queue.nextRetryAt,
    deliveredAt: queue.deliveredAt,
    expiredAt: queue.expiredAt,
    createdAt: queue.createdAt,
    updatedAt: queue.updatedAt,
  };
}