import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ResolveDmReportRequest {
  @IsNotEmpty()
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
