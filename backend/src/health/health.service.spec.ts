import { HealthService } from './health.service';

describe('HealthService', () => {
  it('should return the technical status payload', () => {
    const service = new HealthService();

    const result = service.getStatus();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('backend');
    expect(typeof result.timestamp).toBe('string');
  });
});
