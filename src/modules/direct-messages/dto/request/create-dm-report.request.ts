import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessageReportReason } from '@prisma/client';

/**
 * Submit a report about a direct message. Missing? For STANDARD channels the
 * message is plaintext; for PRIVATE_E2EE channels the client decrypts locally
 * and deliberately includes the decrypted content + the user's report choice as
 * `reportPackage` (spec #38 "Reporting an E2EE Message"). The server stores the
 * package verbatim — it never reads DM plaintext proactively.
 */
export class CreateDmReportRequest {
  @IsNotEmpty()
  @IsString()
  messageId: string;

  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsEnum(MessageReportReason)
  reason: MessageReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  reportPackage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detailText?: string;
}
