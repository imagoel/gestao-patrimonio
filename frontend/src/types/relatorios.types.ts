import type { AuthUser } from './auth.types'
import type { MotivoBaixa, StatusItem, StatusMovimentacao } from './enums'
import type { ResponsavelOption } from './responsaveis.types'
import type { SecretariaOption } from './secretarias.types'

export interface RelatorioPatrimonioFilters {
  secretariaAtualId?: string
  responsavelAtualId?: string
  status?: StatusItem
  localizacaoAtual?: string
}

export interface RelatorioMovimentacaoFilters {
  secretariaId?: string
  status?: StatusMovimentacao
}

export interface RelatorioBaixaFilters {
  secretariaId?: string
  motivo?: MotivoBaixa
}

export interface RelatorioAuditoriaMovimentacaoFilters {
  acao?: string
  usuarioId?: string
  patrimonioId?: string
}

export interface RelatorioPatrimonioHistoricoOption {
  id: string
  tombo: string
  item: string
  status: StatusItem
}

export interface RelatoriosOptionsResponse {
  secretarias: SecretariaOption[]
  responsaveis: ResponsavelOption[]
  patrimonios: RelatorioPatrimonioHistoricoOption[]
  statusPatrimonio: StatusItem[]
  statusMovimentacao: StatusMovimentacao[]
  motivosBaixa: MotivoBaixa[]
  acoesAuditoriaMovimentacao: string[]
  usuariosAuditoriaMovimentacao: AuthUser[]
}
