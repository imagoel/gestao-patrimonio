import { Card, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Paragraph, Title } = Typography

interface PageHeaderProps {
  actions?: ReactNode
  description?: ReactNode
  title: string
}

export function PageHeader({
  actions,
  description,
  title,
}: PageHeaderProps) {
  return (
    <Card className="login-card">
      <Space
        align="start"
        direction="vertical"
        size="middle"
        style={{ width: '100%' }}
      >
        <Title level={2} style={{ margin: 0 }}>
          {title}
        </Title>
        {description ? (
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {description}
          </Paragraph>
        ) : null}
        {actions}
      </Space>
    </Card>
  )
}
