import { api } from './api'
import type {
  ResponsavelFilters,
  ResponsavelFormValues,
  ResponsavelItem,
  ResponsavelListResponse,
  ResponsavelOption,
} from '../types/responsaveis.types'

export const responsaveisService = {
  async list(filters: ResponsavelFilters) {
    const response = await api.get<ResponsavelListResponse>('/responsaveis', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<ResponsavelItem>(`/responsaveis/${id}`)

    return response.data
  },

  async findOptions() {
    const response = await api.get<ResponsavelOption[]>('/responsaveis/options')

    return response.data
  },

  async create(payload: ResponsavelFormValues) {
    const response = await api.post<ResponsavelItem>('/responsaveis', payload)

    return response.data
  },

  async update(id: string, payload: ResponsavelFormValues) {
    const response = await api.patch<ResponsavelItem>(`/responsaveis/${id}`, payload)

    return response.data
  },

  async remove(id: string) {
    const response = await api.delete<ResponsavelItem>(`/responsaveis/${id}`)

    return response.data
  },
}
