import { E2eeEncryptedBackup, E2eeBackupStatus } from '@prisma/client';

export interface BackupResponse {
  id: string;
  userId: string;
  deviceId: string;
  payload: string;
  version: number;
  recoveryPasswordHash: string | null;
  status: E2eeBackupStatus;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export function serializeBackup(backup: E2eeEncryptedBackup): BackupResponse {
  return {
    id: backup.id,
    userId: backup.userId,
    deviceId: backup.deviceId,
    payload: backup.payload,
    version: backup.version,
    recoveryPasswordHash: backup.recoveryPasswordHash,
    status: backup.status,
    error: backup.error,
    createdAt: backup.createdAt,
    completedAt: backup.completedAt,
  };
}

export function serializeBackupList(backups: E2eeEncryptedBackup[]): BackupResponse[] {
  return backups.map(serializeBackup);
}