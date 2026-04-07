import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getStatus() {
    return {
      status: 'ok' as const,
      service: 'backend',
      timestamp: new Date().toISOString(),
    };
  }
}
