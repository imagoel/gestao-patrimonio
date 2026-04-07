import { api } from './api'
import type { NotificacoesResponse } from '../types/notificacoes.types'

export const notificacoesService = {
  async list(limit?: number) {
    const response = await api.get<NotificacoesResponse>('/notificacoes', {
      params: {
        limit,
      },
    })

    return response.data
  },
}
