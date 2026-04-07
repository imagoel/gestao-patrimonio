import type { HealthStatusResponse } from '../types/auth.types'
import { api } from './api'

export const healthService = {
  async check() {
    const response = await api.get<HealthStatusResponse>('/health')

    return response.data
  },
}
