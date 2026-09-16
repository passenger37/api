import { DmReport, User } from '@prisma/client';

import { serializeUserSummary } from './dm.serializer';

export interface DmReportItem {
  id: string;
  channelId: string;
  messageId: string;
  reason: string;
  reportPackage?: string | null;
  status: string;
  createdAt: Date;
  handledAt?: Date | null;
  reporter?: { id: string; username: string; displayName: string | null };
  target?: { id: string; username: string; displayName: string | null };
}

export interface SerializableDmReport extends DmReport {
  reporter?: DmReportItem['reporter'];
  target?: DmReportItem['target'];
  handledBy?: DmReportItem['reporter'];
}

export function serializeDmReport(
  report: SerializableDmReport,
): Record<string, unknown> {
  return {
    id: report.id,
    channelId: report.channelId,
    messageId: report.messageId,
    reason: report.reason,
    status: report.status,
    hasReportPackage: Boolean(report.reportPackage),
    createdAt: report.createdAt.toISOString(),
    handledAt: report.handledAt?.toISOString() ?? null,
    reporter: report.reporter
      ? serializeUserSummary({ ...report.reporter } as never)
      : null,
    target: report.target
      ? serializeUserSummary({ ...report.target } as never)
      : null,
  };
}

export function serializeDmReportList(
  reports: SerializableDmReport[],
): Record<string, unknown>[] {
  return reports.map(serializeDmReport);
}
