import { Perfil } from './enums'
import type { SecretariaOption } from './secretarias.types'

export interface UsuarioItem {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  secretariaId: string | null
  createdAt: string
  updatedAt: string
  secretaria?: SecretariaOption | null
}

export interface UsuarioListResponse {
  items: UsuarioItem[]
  total: number
  page: number
  limit: number
}

export interface UsuarioOptionsResponse {
  perfis: Perfil[]
  secretarias: SecretariaOption[]
}

export interface UsuarioFilters {
  page?: number
  limit?: number
  search?: string
  perfil?: Perfil
  ativo?: boolean
  secretariaId?: string
}

export interface UsuarioFormValues {
  nome: string
  email: string
  senha?: string
  perfil: Perfil
  secretariaId?: string | null
  ativo?: boolean
}
