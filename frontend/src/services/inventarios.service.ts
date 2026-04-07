import { api } from './api'
import type {
  CreateInventarioValues,
  InventarioFilters,
  InventarioItemFilters,
  InventarioItemResumo,
  InventarioItemsResponse,
  InventarioOptionsResponse,
  InventarioListResponse,
  RegistrarInventarioItemValues,
} from '../types/inventarios.types'

export const inventariosService = {
  async findOptions() {
    const response = await api.get<InventarioOptionsResponse>('/inventarios/options')
    return response.data
  },

  async list(filters: InventarioFilters) {
    const response = await api.get<InventarioListResponse>('/inventarios', {
      params: filters,
    })
    return response.data
  },

  async create(payload: CreateInventarioValues) {
    const response = await api.post<InventarioItemResumo>('/inventarios', payload)
    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<InventarioItemResumo>(`/inventarios/${id}`)
    return response.data
  },

  async findItems(id: string, filters: InventarioItemFilters) {
    const response = await api.get<InventarioItemsResponse>(`/inventarios/${id}/itens`, {
      params: filters,
    })
    return response.data
  },

  async registrarItem(
    inventarioId: string,
    itemId: string,
    payload: RegistrarInventarioItemValues,
  ) {
    const response = await api.patch(
      `/inventarios/${inventarioId}/itens/${itemId}`,
      payload,
    )
    return response.data
  },

  async concluir(id: string) {
    const response = await api.post<InventarioItemResumo>(`/inventarios/${id}/concluir`)
    return response.data
  },
}
