import type { AuthUser } from './auth.types'
import type { MotivoBaixa, StatusItem } from './enums'
import type { ResponsavelOption } from './responsaveis.types'
import type { SecretariaOption } from './secretarias.types'

export interface BaixaPatrimonioOption {
  id: string
  item: string
  tombo: string
  secretariaAtualId: string
  localizacaoAtual: string
  responsavelAtualId: string
  status: StatusItem
  secretariaAtual: SecretariaOption
  responsavelAtual: ResponsavelOption
}

export interface BaixaItem {
  id: string
  patrimonioId: string
  usuarioId: string
  motivo: MotivoBaixa
  observacoes: string | null
  baixadoEm: string
  patrimonio: BaixaPatrimonioOption
  usuario: AuthUser
}

export interface BaixaListResponse {
  items: BaixaItem[]
  total: number
  page: number
  limit: number
}

export interface BaixaFilters {
  page?: number
  limit?: number
  search?: string
  patrimonioId?: string
  secretariaId?: string
  motivo?: MotivoBaixa
}

export interface BaixaFormValues {
  patrimonioId: string
  motivo: MotivoBaixa
  observacoes?: string | null
}

export interface BaixaOptionsResponse {
  patrimonios: BaixaPatrimonioOption[]
  secretarias: SecretariaOption[]
  motivos: MotivoBaixa[]
}
