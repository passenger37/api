import { ApiVersionControlService } from './api-version-control.service';

describe('ApiVersionControlService', () => {
  const service = new ApiVersionControlService();

  describe('catalog / co-existence', () => {
    it('serves more than one version at once; v2 is current', () => {
      const catalog = service.catalog();
      expect(catalog.supported.map((v) => v.major).sort()).toEqual([1, 2]);
      expect(catalog.current).toBe(2);
      expect(catalog.oldest).toBe(1);
    });

    it('marks v1 deprecated and v2 current', () => {
      expect(service.isDeprecated(1)).toBe(true);
      expect(service.isDeprecated(2)).toBe(false);
    });

    it('exposes the v1 sunset date and successor', () => {
      expect(service.sunsetDate(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(service.successors(1)).toEqual([2]);
    });
  });

  describe('selectVersion', () => {
    it('returns the requested version when supported', () => {
      expect(service.selectVersion(2)).toBe(2);
    });

    it('clamps an unknown major to a supported one', () => {
      expect(service.selectVersion(5)).toBe(2);
      expect(service.selectVersion(0)).toBe(1);
    });
  });

  describe('buildDeprecationHeaders', () => {
    it('emits Deprecation/Sunset/Link for a deprecated version', () => {
      const headers = service.buildDeprecationHeaders(1);
      expect(headers['Deprecation']).toBe('true');
      expect(headers['Sunset']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(headers['Link']).toContain('rel="successor-version"');
      expect(headers['Link']).toContain('title="v2"');
    });

    it('emits no deprecation headers for the current version', () => {
      expect(service.buildDeprecationHeaders(2)).toEqual({});
    });
  });
});
