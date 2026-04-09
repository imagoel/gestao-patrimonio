import { Button, Empty, Space } from 'antd'

interface TableEmptyProps {
  description?: string
  onCreateClick?: () => void
  createLabel?: string
}

export function TableEmpty({
  description = 'Nenhum registro encontrado.',
  onCreateClick,
  createLabel,
}: TableEmptyProps) {
  return (
    <Empty
      description={
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <span style={{ color: '#48616b' }}>{description}</span>
          {onCreateClick && createLabel ? (
            <Button type="primary" onClick={onCreateClick}>
              {createLabel}
            </Button>
          ) : null}
        </Space>
      }
    />
  )
}

export function createTableLocale(
  opts: Omit<TableEmptyProps, 'description'> & { description?: string },
) {
  return {
    emptyText: <TableEmpty {...opts} />,
  }
}
