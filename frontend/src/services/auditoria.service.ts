import { api } from './api'
import type {
  AuditoriaFilters,
  AuditoriaListResponse,
  AuditoriaOptionsResponse,
} from '../types/auditoria.types'

export const auditoriaService = {
  async findOptions() {
    const response = await api.get<AuditoriaOptionsResponse>('/auditorias/options')

    return response.data
  },

  async list(filters: AuditoriaFilters) {
    const response = await api.get<AuditoriaListResponse>('/auditorias', {
      params: filters,
    })

    return response.data
  },
}
