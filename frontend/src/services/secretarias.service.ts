import { api } from './api'
import type {
  SecretariaFilters,
  SecretariaFormValues,
  SecretariaItem,
  SecretariaListResponse,
  SecretariaOption,
} from '../types/secretarias.types'

export const secretariasService = {
  async list(filters: SecretariaFilters) {
    const response = await api.get<SecretariaListResponse>('/secretarias', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<SecretariaItem>(`/secretarias/${id}`)

    return response.data
  },

  async findOptions() {
    const response = await api.get<SecretariaOption[]>('/secretarias/options')

    return response.data
  },

  async create(payload: SecretariaFormValues) {
    const response = await api.post<SecretariaItem>('/secretarias', payload)

    return response.data
  },

  async update(id: string, payload: SecretariaFormValues) {
    const response = await api.patch<SecretariaItem>(`/secretarias/${id}`, payload)

    return response.data
  },

  async remove(id: string) {
    const response = await api.delete<SecretariaItem>(`/secretarias/${id}`)

    return response.data
  },
}
