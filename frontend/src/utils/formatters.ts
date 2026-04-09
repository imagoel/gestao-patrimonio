import dayjs from 'dayjs'

const dateFormatter = 'DD/MM/YYYY'
const dateTimeFormatter = 'DD/MM/YYYY HH:mm'
const dateTimeWithSecondsFormatter = 'DD/MM/YYYY HH:mm:ss'
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number | string) {
  return currencyFormatter.format(Number(value))
}

export function formatDate(value: string) {
  return dayjs(value).format(dateFormatter)
}

export function formatDateTime(value: string) {
  return dayjs(value).format(dateTimeFormatter)
}

export function formatDateTimeWithSeconds(value: string) {
  return dayjs(value).format(dateTimeWithSecondsFormatter)
}

const movimentacaoStatusLabels: Record<string, string> = {
  AGUARDANDO_CONFIRMACAO_ENTREGA: 'Entrega pendente',
  AGUARDANDO_CONFIRMACAO_RECEBIMENTO: 'Recebimento pendente',
  AGUARDANDO_APROVACAO_PATRIMONIO: 'Validacao pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CONCLUIDA: 'Concluida',
  CANCELADA: 'Cancelada',
}

const motivoBaixaLabels: Record<string, string> = {
  LEILAO: 'Leilao',
  DOACAO: 'Doacao',
  INSERVIVEL: 'Inservivel',
  EXTRAVIO: 'Extravio',
  DESCARTE: 'Descarte',
  TRANSFERENCIA_DEFINITIVA: 'Transferencia def.',
  OUTRO: 'Outro',
}

const tipoEntradaLabels: Record<string, string> = {
  COMPRA: 'Compra',
  DOACAO: 'Doacao',
  CESSAO: 'Cessao',
  TRANSFERENCIA: 'Transferencia',
  PRODUCAO_PROPRIA: 'Producao propria',
  OUTRO: 'Outro',
}

const itemStatusLabels: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  EM_MOVIMENTACAO: 'Em transito',
  BAIXADO: 'Baixado',
  EM_MANUTENCAO: 'Manutencao',
}

const inventarioItemStatusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  LOCALIZADO: 'Localizado',
  NAO_LOCALIZADO: 'Nao localizado',
}

export function formatMovimentacaoStatus(value: string): string {
  return movimentacaoStatusLabels[value] ?? value
}

export function formatMotivoBaixa(value: string): string {
  return motivoBaixaLabels[value] ?? value
}

export function formatTipoEntrada(value: string): string {
  return tipoEntradaLabels[value] ?? value
}

export function formatItemStatus(value: string): string {
  return itemStatusLabels[value] ?? value
}

export function formatInventarioItemStatus(value: string): string {
  return inventarioItemStatusLabels[value] ?? value
}
