import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
} from 'antd'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { usePermissao } from '../../hooks/usePermissao'
import { movimentacaoService } from '../../services/movimentacao.service'
import { Perfil, StatusMovimentacao } from '../../types/enums'
import type { MovimentacaoItem } from '../../types/movimentacao.types'
import { formatDateTime } from '../../utils/formatters'

function getStatusColor(status: StatusMovimentacao) {
  switch (status) {
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA:
      return 'orange'
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO:
      return 'gold'
    case StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO:
      return 'blue'
    case StatusMovimentacao.CONCLUIDA:
      return 'green'
    case StatusMovimentacao.REJEITADA:
      return 'red'
    case StatusMovimentacao.CANCELADA:
      return 'default'
    case StatusMovimentacao.APROVADA:
      return 'cyan'
    default:
      return 'purple'
  }
}

export function MovimentacaoListPage() {
  const navigate = useNavigate()
  const { hasPerfil } = usePermissao()
  const canCreate = hasPerfil(
    Perfil.ADMINISTRADOR,
    Perfil.TECNICO_PATRIMONIO,
    Perfil.CHEFE_SETOR,
  )
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusMovimentacao | undefined>(undefined)
  const [secretariaId, setSecretariaId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const optionsQuery = useQuery({
    queryKey: ['movimentacoes-options'],
    queryFn: movimentacaoService.findOptions,
  })

  const movimentacoesQuery = useQuery({
    queryKey: ['movimentacoes-list', page, deferredSearch, status, secretariaId],
    queryFn: () =>
      movimentacaoService.list({
        page,
        limit: 10,
        search: deferredSearch || undefined,
        status,
        secretariaId,
      }),
  })

  const columns = useMemo(
    () => [
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: MovimentacaoItem) => (
          <StatusBadge tone="info">{record.patrimonio.tombo}</StatusBadge>
        ),
      },
      {
        title: 'Item',
        key: 'item',
        render: (record: MovimentacaoItem) => record.patrimonio.item,
      },
      {
        title: 'Origem',
        key: 'origem',
        render: (record: MovimentacaoItem) =>
          `${record.secretariaOrigem.sigla} - ${record.localizacaoOrigem}`,
      },
      {
        title: 'Destino',
        key: 'destino',
        render: (record: MovimentacaoItem) =>
          `${record.secretariaDestino.sigla} - ${record.localizacaoDestino}`,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: StatusMovimentacao) => (
          <StatusBadge color={getStatusColor(value)}>{value}</StatusBadge>
        ),
      },
      {
        title: 'Solicitado em',
        dataIndex: 'solicitadoEm',
        key: 'solicitadoEm',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: MovimentacaoItem) => (
          <Button onClick={() => navigate(`/movimentacoes/${record.id}`)}>
            Detalhes
          </Button>
        ),
      },
    ],
    [navigate],
  )

  if (
    !hasPerfil(
      Perfil.ADMINISTRADOR,
      Perfil.TECNICO_PATRIMONIO,
      Perfil.CHEFE_SETOR,
      Perfil.USUARIO_CONSULTA,
    )
  ) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Modulo de movimentacao">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Movimentacoes"
          description="Fluxo inicial da Fase 2 com solicitacao, confirmacoes e validacao final do patrimonio."
          actions={
            canCreate ? (
              <Button
                type="primary"
                onClick={() => {
                  startTransition(() => {
                    navigate('/movimentacoes/nova')
                  })
                }}
              >
                Nova movimentacao
              </Button>
            ) : null
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por item, tombo, motivo ou local"
              style={{ width: 340 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 280 }}
              value={status}
              onChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
              options={(optionsQuery.data?.status ?? Object.values(StatusMovimentacao)).map(
                (item) => ({
                  label: item,
                  value: item,
                }),
              )}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Secretaria envolvida"
              style={{ width: 240 }}
              value={secretariaId}
              onChange={(value) => {
                setSecretariaId(value)
                setPage(1)
              }}
              options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                value: secretaria.id,
              }))}
            />
            <Button
              onClick={() => {
                setSearch('')
                setStatus(undefined)
                setSecretariaId(undefined)
                setPage(1)
              }}
            >
              Limpar filtros
            </Button>
          </Space>

          <Table
            rowKey="id"
            loading={movimentacoesQuery.isLoading}
            dataSource={movimentacoesQuery.data?.items ?? []}
            columns={columns}
            pagination={{
              current: movimentacoesQuery.data?.page ?? page,
              pageSize: movimentacoesQuery.data?.limit ?? 10,
              total: movimentacoesQuery.data?.total ?? 0,
              onChange: (nextPage) => {
                setPage(nextPage)
              },
            }}
          />
        </Card>
      </Space>
    </AppLayout>
  )
}
