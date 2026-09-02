import { CapacityModelService } from './capacity-model.service';
import {
  buildCapacityModel,
  CAPACITY_ESTIMATES,
  CAPACITY_ASSUMPTIONS,
} from './capacity-model.config';

describe('CapacityModelService', () => {
  let service: CapacityModelService;

  beforeEach(() => {
    service = new CapacityModelService();
  });

  describe('assumptions', () => {
    it('exposes the documented usage assumptions', () => {
      expect(service.getAssumptions().length).toBe(CAPACITY_ASSUMPTIONS.length);
    });

    it('every assumption is established from expected product usage (has a rationale)', () => {
      for (const a of service.getAssumptions()) {
        expect(a.rationale.length).toBeGreaterThan(10);
      }
    });
  });

  describe('model', () => {
    it('produces all nine B2 40.88 estimates in the documented order', () => {
      const ids = service.getModel().estimates.map((e) => e.id);
      expect(ids).toEqual([...CAPACITY_ESTIMATES]);
    });

    it('every estimate carries a non-empty derivation (never guessed)', () => {
      for (const e of service.getModel().estimates) {
        expect(e.derivedFrom.length).toBeGreaterThan(10);
      }
    });

    it('registered users = the 1M target scale', () => {
      const est = service
        .getModel()
        .estimates.find((e) => e.id === 'registeredUsers');
      expect(est?.value).toBe(1_000_000);
    });

    it('derives DAU from registered users x DAU ratio', () => {
      const model = service.getModel();
      const est = model.estimates.find((e) => e.id === 'dailyActiveUsers');
      expect(est?.value).toBeCloseTo(1_000_000 * 0.2, 0);
      expect(model.workload.dailyActiveUsers).toBe(200_000);
    });

    it('peak concurrent users = 20% of DAU = 40k, matching the 40.80 load model', () => {
      const model = service.getModel();
      const est = model.estimates.find((e) => e.id === 'concurrentUsers');
      expect(est?.value).toBeCloseTo(40_000, 0);
      expect(model.workload.concurrentUsers).toBe(40_000);
    });

    it('daily messages = DAU x messages per user per day', () => {
      const model = service.getModel();
      expect(model.workload.dailyMessages).toBe(200_000 * 100);
      expect(model.workload.dailyMessages).toBe(20_000_000);
    });

    it('messages/sec = daily messages / day x peak-to-average factor', () => {
      const model = service.getModel();
      const est = model.estimates.find((e) => e.id === 'messagesPerSec');
      const average = 20_000_000 / 86_400;
      expect(model.workload.averageMessagesPerSec).toBeCloseTo(average, 1);
      expect(model.workload.peakMessagesPerSec).toBeCloseTo(average * 5, 1);
      expect(est?.value).toBeCloseTo(average * 5, 0);
    });

    it('database storage = messages (3yr) + users + memberships', () => {
      const est = service
        .getModel()
        .estimates.find((e) => e.id === 'databaseStorage');
      const messageStore = 20_000_000 * 1_024 * 365 * 3;
      const userStore = 1_000_000 * 4_096;
      const membershipStore = 1_000_000 * 30 * 512;
      const expectedTb = (messageStore + userStore + membershipStore) / 1e12;
      expect(est?.value).toBeCloseTo(expectedTb, 1);
    });

    it('media storage = 2% of messages holding 1MiB files for 2 years', () => {
      const est = service
        .getModel()
        .estimates.find((e) => e.id === 'mediaStorage');
      const dailyMedia = 20_000_000 * 0.02;
      const expectedTb = (dailyMedia * 1_048_576 * 365 * 2) / 1e12;
      expect(est?.value).toBeCloseTo(expectedTb, 1);
    });

    it('redis memory = presence + sessions + transient + queue horizon', () => {
      const est = service
        .getModel()
        .estimates.find((e) => e.id === 'redisMemory');
      const presence = 40_000 * 1_024;
      const sessions = 200_000 * 1_024;
      const transient = 200_000 * 256;
      const queues = (20_000_000 / 86_400) * 5 * 4_096 * 30;
      const expectedMb = (presence + sessions + transient + queues) / 1e6;
      expect(est?.value).toBeCloseTo(expectedMb, 0);
    });

    it('network bandwidth = ws fanout + media + rest at peak', () => {
      const est = service
        .getModel()
        .estimates.find((e) => e.id === 'networkBandwidth');
      const peakMsg = (20_000_000 / 86_400) * 5;
      const ws = peakMsg * 1_024 * 2;
      const media = ((20_000_000 * 0.02 * 1_048_576) / 86_400) * 5;
      const rest = peakMsg * 5 * 1_024;
      const expectedMbps = ((ws + media + rest) * 8) / 1e6;
      expect(est?.value).toBeCloseTo(expectedMbps, 0);
    });
  });

  describe('report / load-model consistency', () => {
    it('the derived message rate fits inside the 40.80 load-model message budget', () => {
      const report = service.report();
      expect(report.loadModelMessageRps).toBe(
        Number((13_333 * 0.2).toFixed(1)),
      );
      expect(report.consistentWithLoadModel).toBe(true);
    });

    it('report carries assumptions, estimates, and workload', () => {
      const report = service.report();
      expect(report.estimates.length).toBe(9);
      expect(report.workload.dailyMessages).toBe(20_000_000);
    });
  });

  describe('env overrides', () => {
    it('CAPACITY_* overrides flow through the derivation', () => {
      const model = buildCapacityModel({
        CAPACITY_DAU_RATIO: '0.5',
        CAPACITY_MESSAGES_PER_USER_PER_DAY: '50',
      });
      expect(model.workload.dailyActiveUsers).toBe(500_000);
      expect(model.workload.concurrentUsers).toBe(100_000);
      expect(model.workload.dailyMessages).toBe(25_000_000);
      const msgs = model.estimates.find((e) => e.id === 'messagesPerSec');
      const peak = (25_000_000 / 86_400) * 5;
      expect(msgs?.value).toBeCloseTo(peak, 0);
    });

    it('invalid overrides fall back to the documented defaults', () => {
      const model = buildCapacityModel({
        CAPACITY_DAU_RATIO: '-1',
        CAPACITY_REGISTERED_USERS: 'abc',
      });
      const dau = model.estimates.find((e) => e.id === 'dailyActiveUsers');
      expect(dau?.value).toBeCloseTo(1_000_000 * 0.2, 0);
    });
  });
});
