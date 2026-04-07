import { api } from './api'
import type {
  FornecedorFilters,
  FornecedorFormValues,
  FornecedorItem,
  FornecedorListResponse,
  FornecedorOption,
} from '../types/fornecedores.types'

export const fornecedoresService = {
  async list(filters: FornecedorFilters) {
    const response = await api.get<FornecedorListResponse>('/fornecedores', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<FornecedorItem>(`/fornecedores/${id}`)

    return response.data
  },

  async findOptions() {
    const response = await api.get<FornecedorOption[]>('/fornecedores/options')

    return response.data
  },

  async create(payload: FornecedorFormValues) {
    const response = await api.post<FornecedorItem>('/fornecedores', payload)

    return response.data
  },

  async update(id: string, payload: FornecedorFormValues) {
    const response = await api.patch<FornecedorItem>(`/fornecedores/${id}`, payload)

    return response.data
  },

  async remove(id: string) {
    const response = await api.delete<FornecedorItem>(`/fornecedores/${id}`)

    return response.data
  },
}
