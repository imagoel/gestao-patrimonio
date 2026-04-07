import type { AuthUser } from './auth.types'
import type { ResponsavelOption } from './responsaveis.types'
import type { SecretariaOption } from './secretarias.types'
import type { StatusItem, StatusMovimentacao } from './enums'

export interface MovimentacaoPatrimonioOption {
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

export interface MovimentacaoItem {
  id: string
  patrimonioId: string
  secretariaOrigemId: string
  localizacaoOrigem: string
  secretariaDestinoId: string
  localizacaoDestino: string
  responsavelOrigemId: string
  responsavelDestinoId: string | null
  solicitanteId: string
  motivo: string
  observacoes: string | null
  status: StatusMovimentacao
  solicitadoEm: string
  confirmadoEntregaPorId: string | null
  confirmadoEntregaEm: string | null
  confirmadoRecebimentoPorId: string | null
  confirmadoRecebimentoEm: string | null
  validadoPorId: string | null
  validadoEm: string | null
  justificativaRejeicao: string | null
  createdAt: string
  updatedAt: string
  patrimonio: MovimentacaoPatrimonioOption
  secretariaOrigem: SecretariaOption
  secretariaDestino: SecretariaOption
  responsavelOrigem: ResponsavelOption
  responsavelDestino: ResponsavelOption | null
  solicitante: AuthUser
  confirmadoEntregaPor: AuthUser | null
  confirmadoRecebimentoPor: AuthUser | null
  validadoPor: AuthUser | null
}

export interface MovimentacaoListResponse {
  items: MovimentacaoItem[]
  total: number
  page: number
  limit: number
}

export interface MovimentacaoFilters {
  page?: number
  limit?: number
  search?: string
  patrimonioId?: string
  secretariaId?: string
  status?: StatusMovimentacao
}

export interface MovimentacaoFormValues {
  patrimonioId: string
  secretariaDestinoId: string
  responsavelDestinoId?: string | null
  localizacaoDestino: string
  motivo: string
  observacoes?: string | null
}

export interface ConfirmarMovimentacaoValues {
  observacoes?: string | null
}

export interface AnalisarMovimentacaoValues {
  decisao: 'APROVAR' | 'REJEITAR'
  justificativaRejeicao?: string | null
  observacoes?: string | null
}

export interface MovimentacaoOptionsResponse {
  patrimonios: MovimentacaoPatrimonioOption[]
  secretarias: SecretariaOption[]
  responsaveis: ResponsavelOption[]
  status: StatusMovimentacao[]
}
