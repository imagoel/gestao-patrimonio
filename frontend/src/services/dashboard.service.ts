import { api } from './api'
import type { DashboardOverviewResponse } from '../types/dashboard.types'

export const dashboardService = {
  async findOverview() {
    const response = await api.get<DashboardOverviewResponse>('/dashboard/overview')

    return response.data
  },
}
