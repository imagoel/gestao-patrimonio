import { Tag } from 'antd'
import type { PropsWithChildren } from 'react'

const toneColors = {
  danger: 'red',
  default: 'default',
  info: 'blue',
  success: 'green',
  warning: 'orange',
} as const

interface StatusBadgeProps extends PropsWithChildren {
  color?: string
  tone?: keyof typeof toneColors
}

export function StatusBadge({
  children,
  color,
  tone = 'default',
}: StatusBadgeProps) {
  return <Tag color={color ?? toneColors[tone]}>{children}</Tag>
}
