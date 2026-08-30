export type MessageReportRow = {
  id: string;
  serverId: string;
  channelId: string;
  messageId: string;
  reporterMemberId: string;
  reason: string;
  detailText: string | null;
  status: string;
  handledByMemberId: string | null;
  handledAt: Date | null;
  createdAt: Date;
  message?: {
    id: string;
    content?: string;
    authorMemberId?: string;
    createdAt?: Date;
  } | null;
  reporter?: {
    user?: { id: string; username: string; displayName: string } | null;
  } | null;
  handledBy?: {
    user?: { id: string; username: string; displayName: string } | null;
  } | null;
};

export type UserReportRow = {
  id: string;
  serverId: string;
  reporterMemberId: string;
  targetUserId: string;
  reason: string;
  detailText: string | null;
  status: string;
  handledByMemberId: string | null;
  handledAt: Date | null;
  createdAt: Date;
  target?: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  } | null;
  reporter?: {
    user?: { id: string; username: string; displayName: string } | null;
  } | null;
  handledBy?: {
    user?: { id: string; username: string; displayName: string } | null;
  } | null;
};

export function serializeMessageReport(report: MessageReportRow) {
  return {
    id: report.id,
    serverId: report.serverId,
    channelId: report.channelId,
    messageId: report.messageId,
    reporterMemberId: report.reporterMemberId,
    reason: report.reason,
    detailText: report.detailText,
    status: report.status,
    handledByMemberId: report.handledByMemberId,
    handledAt: report.handledAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    message: report.message
      ? {
          id: report.message.id,
          content: report.message.content,
          authorMemberId: report.message.authorMemberId,
          createdAt: report.message.createdAt?.toISOString() ?? null,
        }
      : undefined,
    reporterUser: report.reporter?.user
      ? {
          id: report.reporter.user.id,
          username: report.reporter.user.username,
          displayName: report.reporter.user.displayName,
        }
      : undefined,
  };
}

export function serializeUserReport(report: UserReportRow) {
  return {
    id: report.id,
    serverId: report.serverId,
    reporterMemberId: report.reporterMemberId,
    targetUserId: report.targetUserId,
    reason: report.reason,
    detailText: report.detailText,
    status: report.status,
    handledByMemberId: report.handledByMemberId,
    handledAt: report.handledAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    targetUser: report.target
      ? {
          id: report.target.id,
          username: report.target.username,
          displayName: report.target.displayName,
          avatarUrl: report.target.avatarUrl,
        }
      : undefined,
    reporterUser: report.reporter?.user
      ? {
          id: report.reporter.user.id,
          username: report.reporter.user.username,
          displayName: report.reporter.user.displayName,
        }
      : undefined,
  };
}
