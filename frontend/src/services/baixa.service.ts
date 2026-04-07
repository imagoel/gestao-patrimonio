import { api } from './api'
import type {
  BaixaFilters,
  BaixaFormValues,
  BaixaItem,
  BaixaListResponse,
  BaixaOptionsResponse,
} from '../types/baixa.types'

export const baixaService = {
  async findOptions() {
    const response = await api.get<BaixaOptionsResponse>('/baixas/options')

    return response.data
  },

  async list(filters: BaixaFilters) {
    const response = await api.get<BaixaListResponse>('/baixas', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<BaixaItem>(`/baixas/${id}`)

    return response.data
  },

  async create(payload: BaixaFormValues) {
    const response = await api.post<BaixaItem>('/baixas', payload)

    return response.data
  },
}
