import type { StatusMovimentacao } from './enums'
import type { SecretariaOption } from './secretarias.types'

export interface NotificacoesResponse {
  summary: {
    total: number
    actionRequired: number
    pendentesEntrega: number
    pendentesRecebimento: number
    pendentesAprovacao: number
  }
  items: NotificacaoItem[]
}

export interface NotificacaoItem {
  id: string
  tipo: string
  categoria: 'MOVIMENTACAO'
  severidade: 'info' | 'warning'
  requiresAction: boolean
  titulo: string
  descricao: string
  createdAt: string
  route: string
  movimentacaoId: string
  patrimonioId: string
  status: StatusMovimentacao
  patrimonio: {
    id: string
    tombo: string
    item: string
  }
  secretariaOrigem: SecretariaOption
  secretariaDestino: SecretariaOption
}
