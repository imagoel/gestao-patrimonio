import type { SecretariaOption } from './secretarias.types'

export interface ResponsavelOption {
  id: string
  nome: string
  setor: string
  secretariaId: string
  secretaria: SecretariaOption
}

export interface ResponsavelItem {
  id: string
  nome: string
  cargo: string | null
  setor: string
  contato: string | null
  ativo: boolean
  secretariaId: string
  createdAt: string
  updatedAt: string
  secretaria: SecretariaOption
}

export interface ResponsavelListResponse {
  items: ResponsavelItem[]
  total: number
  page: number
  limit: number
}

export interface ResponsavelFilters {
  page?: number
  limit?: number
  search?: string
  secretariaId?: string
  ativo?: boolean
}

export interface ResponsavelFormValues {
  nome: string
  cargo?: string | null
  setor: string
  contato?: string | null
  secretariaId: string
  ativo?: boolean
}
