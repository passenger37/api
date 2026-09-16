import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { DirectMessageKind } from '@prisma/client';

@Injectable()
export class CallSystemMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async publishMissedCall(
    conversationId: string,
    callerId: string,
    callId: string,
    callType: string,
  ): Promise<void> {
    const content = this.formatMissedCallContent(callType);
    await this.createSystemMessage(conversationId, callerId, content, DirectMessageKind.CALL_MISSED, callId);
  }

  async publishCallEnded(
    conversationId: string,
    callerId: string,
    callId: string,
    callType: string,
    durationSeconds: number,
  ): Promise<void> {
    const content = this.formatCallEndedContent(callType, durationSeconds);
    await this.createSystemMessage(conversationId, callerId, content, DirectMessageKind.CALL_ENDED, callId);
  }

  async publishCallRejected(
    conversationId: string,
    callerId: string,
    callId: string,
    callType: string,
  ): Promise<void> {
    const content = this.formatCallRejectedContent(callType);
    await this.createSystemMessage(conversationId, callerId, content, DirectMessageKind.CALL_REJECTED, callId);
  }

  private async createSystemMessage(
    conversationId: string,
    authorId: string,
    content: string,
    kind: DirectMessageKind,
    callId: string,
  ): Promise<void> {
    const maxSeq = await this.prisma.directMessage.aggregate({
      where: { channelId: conversationId },
      _max: { messageSeq: true },
    });
    const nextSeq = (maxSeq._max.messageSeq ?? 0) + 1;

    await this.prisma.directMessage.create({
      data: {
        channelId: conversationId,
        authorUserId: authorId,
        content,
        messageSeq: nextSeq,
        kind,
        callId,
      },
    });
  }

  private formatMissedCallContent(callType: string): string {
    return `Missed ${callType.toLowerCase()} call`;
  }

  private formatCallEndedContent(callType: string, durationSeconds: number): string {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    if (mins > 0) {
      return `${callType} call ended • ${mins}m ${secs}s`;
    }
    return `${callType} call ended • ${secs}s`;
  }

  private formatCallRejectedContent(callType: string): string {
    return `${callType} call rejected`;
  }
}