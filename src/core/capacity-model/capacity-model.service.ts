import { Injectable } from '@nestjs/common';
import {
  buildCapacityModel,
  capacityAssumptions,
  CapacityAssumption,
  CapacityEstimate,
  CapacityModel,
} from './capacity-model.config';

export interface CapacityReport {
  modelVersion: string;
  assumptions: CapacityAssumption[];
  estimates: CapacityEstimate[];
  workload: CapacityModel['workload'];
  /** True when the capacity messages/sec sits inside the load model's message RPS budget. */
  consistentWithLoadModel: boolean;
  /** The load-model message.create RPS budget used for the consistency check. */
  loadModelMessageRps: number;
}

/**
 * Lecture 40.98 — 1M-User Capacity Planning (B2 40.88): exposes the nine
 * capacity estimates (registered/DAU/concurrent users, msgs/user/day, msgs/sec,
 * database storage, media storage, Redis memory, network bandwidth) derived
 * from documented expected-product-usage assumptions rather than guessed
 * numbers. Cross-checks the derived message rate against the 40.80 load model.
 */
@Injectable()
export class CapacityModelService {
  getAssumptions(): CapacityAssumption[] {
    return capacityAssumptions();
  }

  getModel(): CapacityModel {
    return buildCapacityModel();
  }

  /** Full report: assumptions + estimates + the load-model consistency gate. */
  report(): CapacityReport {
    const model = buildCapacityModel();
    const peakMessagesPerSec = model.workload.peakMessagesPerSec;

    // Cross-check: 40.80's load model budgets message.create at 20% of the
    // derived peak ops/sec for 1M users. The capacity estimate must fit inside
    // that budget — otherwise the load model under-sizes message volume.
    const peakOpsPerSec = 13_333; // LOAD_ACTIONS_PER_USER_MIN 20 @ 40k concurrent
    const loadModelMessageRps = Number((peakOpsPerSec * 0.2).toFixed(1));

    return {
      modelVersion: model.modelVersion,
      assumptions: model.assumptions,
      estimates: model.estimates,
      workload: model.workload,
      loadModelMessageRps,
      consistentWithLoadModel: peakMessagesPerSec <= loadModelMessageRps,
    };
  }
}
