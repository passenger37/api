import { Injectable } from '@nestjs/common';
import {
  evaluateProductionReadiness,
  ProductionReadinessReport,
  PRODUCTION_READINESS_CHECKS,
} from './production-readiness.config';

@Injectable()
export class ProductionReadinessService {
  private readonly root: string;

  constructor() {
    this.root = process.cwd();
  }

  /** Run the full checklist against the project and return the report. */
  evaluate(): ProductionReadinessReport {
    return evaluateProductionReadiness(this.root);
  }

  /** Expose the raw checklist for documentation/tests. */
  getChecks() {
    return PRODUCTION_READINESS_CHECKS;
  }
}
