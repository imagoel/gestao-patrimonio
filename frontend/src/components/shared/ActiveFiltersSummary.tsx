import { Button, Card, Space, Tag, Typography } from 'antd'

const { Text } = Typography

export interface ActiveFilterItem {
  key: string
  label: string
  value: string
}

interface ActiveFiltersSummaryProps {
  filters: ActiveFilterItem[]
  onClear?: () => void
  total: number
}

export function ActiveFiltersSummary({
  filters,
  onClear,
  total,
}: ActiveFiltersSummaryProps) {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space
        align="start"
        direction="vertical"
        size="small"
        style={{ width: '100%' }}
      >
        <Space wrap size={[8, 8]} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong>{total} resultado(s) no filtro atual</Text>
          {filters.length > 0 && onClear ? (
            <Button onClick={onClear} size="small" type="link">
              Limpar filtros
            </Button>
          ) : null}
        </Space>

        {filters.length ? (
          <Space wrap size={[8, 8]}>
            {filters.map((filter) => (
              <Tag color="blue" key={filter.key}>
                {filter.label}: {filter.value}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">
            Sem filtros ativos. Exibindo a visao geral desta listagem.
          </Text>
        )}
      </Space>
    </Card>
  )
}
