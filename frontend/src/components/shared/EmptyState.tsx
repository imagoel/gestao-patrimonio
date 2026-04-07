import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Paragraph, Title } = Typography

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="empty-state">
      <Title level={2}>{title}</Title>
      <Paragraph type="secondary">{description}</Paragraph>
      {action}
    </Card>
  )
}
