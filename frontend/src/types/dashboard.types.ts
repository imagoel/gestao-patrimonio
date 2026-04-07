import type { MotivoBaixa, StatusItem, StatusMovimentacao } from './enums'
import type { SecretariaOption } from './secretarias.types'

export interface DashboardOverviewResponse {
  geradoEm: string
  escopo: {
    tipo: 'GLOBAL' | 'SECRETARIA'
    secretaria: SecretariaOption | null
  }
  indicadores: {
    patrimonioTotal: number
    patrimoniosAtivos: number
    patrimoniosEmMovimentacao: number
    patrimoniosBaixados: number
    movimentacoesPendentes: number
    movimentacoesConcluidas: number
    baixasTotal: number
  }
  patrimonioPorStatus: DashboardPatrimonioStatusItem[]
  movimentacaoPorStatus: DashboardMovimentacaoStatusItem[]
  patrimonioPorSecretaria: DashboardPatrimonioPorSecretariaItem[]
  movimentacoesRecentes: DashboardMovimentacaoRecenteItem[]
  baixasRecentes: DashboardBaixaRecenteItem[]
}

export interface DashboardPatrimonioStatusItem {
  status: StatusItem
  total: number
}

export interface DashboardMovimentacaoStatusItem {
  status: StatusMovimentacao
  total: number
}

export interface DashboardPatrimonioPorSecretariaItem extends SecretariaOption {
  total: number
}

export interface DashboardMovimentacaoRecenteItem {
  id: string
  status: StatusMovimentacao
  solicitadoEm: string
  patrimonio: {
    id: string
    tombo: string
    item: string
  }
  secretariaOrigem: SecretariaOption
  secretariaDestino: SecretariaOption
}

export interface DashboardBaixaRecenteItem {
  id: string
  motivo: MotivoBaixa
  baixadoEm: string
  patrimonio: {
    id: string
    tombo: string
    item: string
    secretariaAtual: SecretariaOption
  }
  usuario: {
    id: string
    nome: string
    email: string
  }
}
