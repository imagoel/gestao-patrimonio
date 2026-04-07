import type { AuthUser } from './auth.types'
import type {
  EstadoConservacao,
  MotivoBaixa,
  StatusItem,
  StatusMovimentacao,
  TipoEntrada,
} from './enums'
import type { FornecedorOption } from './fornecedores.types'
import type { ResponsavelOption } from './responsaveis.types'
import type { SecretariaOption } from './secretarias.types'

export interface PatrimonioItem {
  id: string
  item: string
  tombo: string
  secretariaAtualId: string
  localizacaoAtual: string
  responsavelAtualId: string
  estadoConservacao: EstadoConservacao
  status: StatusItem
  fornecedorId: string | null
  tipoEntrada: TipoEntrada
  valorOriginal: string
  valorAtual: string | null
  descricao: string | null
  dataAquisicao: string | null
  observacoes: string | null
  createdById: string | null
  updatedById: string | null
  createdAt: string
  updatedAt: string
  secretariaAtual: SecretariaOption
  responsavelAtual: ResponsavelOption
  fornecedor: FornecedorOption | null
}

export interface PatrimonioListResponse {
  items: PatrimonioItem[]
  total: number
  page: number
  limit: number
}

export interface PatrimonioFilters {
  page?: number
  limit?: number
  search?: string
  tombo?: string
  secretariaAtualId?: string
  responsavelAtualId?: string
  fornecedorId?: string
  status?: StatusItem
  estadoConservacao?: EstadoConservacao
  tipoEntrada?: TipoEntrada
}

export interface PatrimonioFormValues {
  item: string
  tombo: string
  secretariaAtualId: string
  localizacaoAtual: string
  responsavelAtualId: string
  estadoConservacao: EstadoConservacao
  status?: StatusItem
  fornecedorId?: string | null
  tipoEntrada: TipoEntrada
  valorOriginal: number
  valorAtual?: number | null
  descricao?: string | null
  dataAquisicao?: string | null
  observacoes?: string | null
}

export interface PatrimonioOptionsResponse {
  secretarias: SecretariaOption[]
  responsaveis: ResponsavelOption[]
  fornecedores: FornecedorOption[]
  status: StatusItem[]
  estadosConservacao: EstadoConservacao[]
  tiposEntrada: TipoEntrada[]
}

export interface PatrimonioHistoricoItem {
  id: string
  patrimonioId: string
  usuarioId: string | null
  movimentacaoId: string | null
  baixaPatrimonialId: string | null
  evento: string
  descricao: string
  dadosAnteriores: Record<string, unknown> | null
  dadosNovos: Record<string, unknown> | null
  criadoEm: string
  usuario: AuthUser | null
  movimentacao: {
    id: string
    status: StatusMovimentacao
  } | null
  baixaPatrimonial: {
    id: string
    motivo: MotivoBaixa
    baixadoEm: string
  } | null
}

export interface PatrimonioAvaliacaoValorAtual {
  patrimonioId: string
  valorOriginal: string
  valorAtualInformado: string | null
  valorAtualSugerido: string | null
  valorAtualExibicao: string | null
  modoAtual: 'MANUAL' | 'ESTIMADO' | 'INDISPONIVEL'
  idadeMeses: number | null
  fatorConservacao: number
  fatorTempo: number | null
  percentualAplicado: number | null
  taxaDepreciacaoAnualPercentual: number
  valorResidualPercentual: number
  regra: string
  observacao: string
}
