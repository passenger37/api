import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CommentNotFoundException } from '../exceptions/comment.exceptions';
import { CommentReportReason, CommentReport } from '@prisma/client';

@Injectable()
export class CommentReportService {
  private readonly logger = new Logger(CommentReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    commentId: string,
    reporterId: string,
    reason: CommentReportReason,
    description?: string,
  ): Promise<CommentReport> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new CommentNotFoundException(commentId);

    const report = await this.prisma.commentReport.create({
      data: {
        commentId,
        reporterId,
        reason,
        description,
      },
    });

    this.logger.log(`Comment report created: ${report.id} on comment ${commentId}`);
    return report;
  }
}
