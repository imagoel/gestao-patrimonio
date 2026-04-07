import type { AuthUser } from './auth.types'

export interface AuditoriaItem {
  id: string
  entidade: string
  entidadeId: string
  acao: string
  usuarioId: string | null
  dadosAnteriores: Record<string, unknown> | null
  dadosNovos: Record<string, unknown> | null
  contexto: Record<string, unknown> | null
  createdAt: string
  usuario: AuthUser | null
}

export interface AuditoriaListResponse {
  items: AuditoriaItem[]
  total: number
  page: number
  limit: number
}

export interface AuditoriaFilters {
  page?: number
  limit?: number
  search?: string
  entidade?: string
  acao?: string
  usuarioId?: string
}

export interface AuditoriaOptionsResponse {
  entidades: string[]
  acoes: string[]
  usuarios: AuthUser[]
}
