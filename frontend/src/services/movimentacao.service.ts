import { api } from './api'
import type {
  AnalisarMovimentacaoValues,
  ConfirmarMovimentacaoValues,
  MovimentacaoFilters,
  MovimentacaoFormValues,
  MovimentacaoItem,
  MovimentacaoListResponse,
  MovimentacaoOptionsResponse,
} from '../types/movimentacao.types'

export const movimentacaoService = {
  async findOptions() {
    const response = await api.get<MovimentacaoOptionsResponse>('/movimentacoes/options')

    return response.data
  },

  async list(filters: MovimentacaoFilters) {
    const response = await api.get<MovimentacaoListResponse>('/movimentacoes', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<MovimentacaoItem>(`/movimentacoes/${id}`)

    return response.data
  },

  async create(payload: MovimentacaoFormValues) {
    const response = await api.post<MovimentacaoItem>('/movimentacoes', payload)

    return response.data
  },

  async confirmarEntrega(id: string, payload: ConfirmarMovimentacaoValues = {}) {
    const response = await api.post<MovimentacaoItem>(
      `/movimentacoes/${id}/confirmar-entrega`,
      payload,
    )

    return response.data
  },

  async confirmarRecebimento(
    id: string,
    payload: ConfirmarMovimentacaoValues = {},
  ) {
    const response = await api.post<MovimentacaoItem>(
      `/movimentacoes/${id}/confirmar-recebimento`,
      payload,
    )

    return response.data
  },

  async analisar(id: string, payload: AnalisarMovimentacaoValues) {
    const response = await api.post<MovimentacaoItem>(
      `/movimentacoes/${id}/analisar`,
      payload,
    )

    return response.data
  },
}
