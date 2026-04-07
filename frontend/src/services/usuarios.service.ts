import { api } from './api'
import type {
  UsuarioFilters,
  UsuarioFormValues,
  UsuarioItem,
  UsuarioListResponse,
  UsuarioOptionsResponse,
} from '../types/usuarios.types'

export const usuariosService = {
  async list(filters: UsuarioFilters) {
    const response = await api.get<UsuarioListResponse>('/usuarios', {
      params: filters,
    })

    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<UsuarioItem>(`/usuarios/${id}`)

    return response.data
  },

  async findOptions() {
    const response = await api.get<UsuarioOptionsResponse>('/usuarios/options')

    return response.data
  },

  async create(payload: UsuarioFormValues) {
    const response = await api.post<UsuarioItem>('/usuarios', payload)

    return response.data
  },

  async update(id: string, payload: UsuarioFormValues) {
    const response = await api.patch<UsuarioItem>(`/usuarios/${id}`, payload)

    return response.data
  },

  async remove(id: string) {
    const response = await api.delete<UsuarioItem>(`/usuarios/${id}`)

    return response.data
  },
}
