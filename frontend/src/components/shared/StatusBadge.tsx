import { Tag, Tooltip } from 'antd'
import type { PropsWithChildren } from 'react'

const toneColors = {
  danger: 'red',
  default: 'default',
  info: 'blue',
  success: 'green',
  warning: 'orange',
} as const

const statusTooltips: Record<string, string> = {
  Ativo: 'Item ativo e disponivel para uso.',
  Inativo: 'Item inativo, nao esta em circulacao.',
  'Em transito': 'Item em processo de mudanca entre setores.',
  Baixado: 'Item baixado, removido definitivamente do patrimonio.',
  Manutencao: 'Item em manutencao, temporariamente fora de circulacao.',
  'Entrega pendente': 'Aguardando que a origem confirme a entrega.',
  'Recebimento pendente': 'Aguardando que o destino confirme o recebimento.',
  'Validacao pendente': 'Aguardando validacao final do patrimonio.',
  Aprovada: 'Movimentacao aprovada pelo patrimonio.',
  Rejeitada: 'Movimentacao rejeitada pelo patrimonio.',
  Concluida: 'Movimentacao concluida com sucesso.',
  Cancelada: 'Movimentacao cancelada.',
}

interface StatusBadgeProps extends PropsWithChildren {
  color?: string
  showTooltip?: boolean
  tone?: keyof typeof toneColors
}

export function StatusBadge({
  children,
  color,
  showTooltip = true,
  tone = 'default',
}: StatusBadgeProps) {
  const tag = <Tag color={color ?? toneColors[tone]}>{children}</Tag>
  const textContent = typeof children === 'string' ? children : ''
  const tooltipText = showTooltip && textContent && statusTooltips[textContent]
    ? statusTooltips[textContent]
    : null

  if (tooltipText) {
    return <Tooltip title={tooltipText}>{tag}</Tooltip>
  }

  return tag
}
