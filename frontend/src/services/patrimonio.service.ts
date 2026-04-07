import { api } from './api'
import type {
  PatrimonioAvaliacaoValorAtual,
  PatrimonioFilters,
  PatrimonioFormValues,
  PatrimonioHistoricoItem,
  PatrimonioItem,
  PatrimonioListResponse,
  PatrimonioOptionsResponse,
} from '../types/patrimonio.types'

export const patrimonioService = {
  async findOptions() {
    const response = await api.get<PatrimonioOptionsResponse>('/patrimonios/options')

    return response.data
  },

  async list(filters: PatrimonioFilters) {
    const response = await api.get<PatrimonioListResponse>('/patrimonios', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<PatrimonioItem>(`/patrimonios/${id}`)

    return response.data
  },

  async findHistorico(id: string) {
    const response = await api.get<PatrimonioHistoricoItem[]>(
      `/patrimonios/${id}/historico`,
    )

    return response.data
  },

  async findAvaliacaoValorAtual(id: string) {
    const response = await api.get<PatrimonioAvaliacaoValorAtual>(
      `/patrimonios/${id}/avaliacao-valor-atual`,
    )

    return response.data
  },

  async create(payload: PatrimonioFormValues) {
    const response = await api.post<PatrimonioItem>('/patrimonios', payload)

    return response.data
  },

  async update(id: string, payload: PatrimonioFormValues) {
    const response = await api.patch<PatrimonioItem>(`/patrimonios/${id}`, payload)

    return response.data
  },

  async remove(id: string) {
    const response = await api.delete<PatrimonioItem>(`/patrimonios/${id}`)

    return response.data
  },

  async aplicarValorEstimado(id: string) {
    const response = await api.post<PatrimonioItem>(
      `/patrimonios/${id}/aplicar-valor-estimado`,
    )

    return response.data
  },
}
