import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { SecurityAuditService } from './security-audit.service';

@ApiTags('Security Audit')
@Controller('security')
export class SecurityAuditController {
  constructor(private readonly audit: SecurityAuditService) {}

  @Public()
  @Get('audit')
  @ApiOperation({
    summary:
      '40.96 Backend Security Audit — per-area posture + failed controls (no raw secrets in the payload)',
  })
  auditReport() {
    const report = this.audit.runAudit();
    return {
      overall: report.overall,
      checkedAt: report.checkedAt,
      areas: report.areas,
      failedControls: report.failedControls,
    };
  }
}
