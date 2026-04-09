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
import { ActiveFiltersSummary } from '../../components/shared/ActiveFiltersSummary'
import { CopyToClipboard } from '../../components/shared/CopyToClipboard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { useAuth } from '../../hooks/useAuth'
import { usePermissao } from '../../hooks/usePermissao'
import { movimentacaoService } from '../../services/movimentacao.service'
import { Perfil, StatusMovimentacao } from '../../types/enums'
import type { MovimentacaoItem } from '../../types/movimentacao.types'
import { formatDateTime, formatMovimentacaoStatus } from '../../utils/formatters'
import {
  getMovimentacaoNextStepInfo,
  getMovimentacaoStatusColor,
  getMovimentacaoViewerActionInfo,
} from '../../utils/movimentacao-ui'

export function MovimentacaoListPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { hasPerfil } = usePermissao()
  const canCreate = hasPerfil(
    Perfil.ADMINISTRADOR,
    Perfil.TECNICO_PATRIMONIO,
    Perfil.CHEFE_SETOR,
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusMovimentacao | undefined>(undefined)
  const [secretariaId, setSecretariaId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const optionsQuery = useQuery({
    queryKey: ['movimentacoes-options'],
    queryFn: movimentacaoService.findOptions,
  })

  const movimentacoesQuery = useQuery({
    queryKey: ['movimentacoes-list', page, pageSize, deferredSearch, status, secretariaId],
    queryFn: () =>
      movimentacaoService.list({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        status,
        secretariaId,
      }),
  })

  const clearFilters = () => {
    setSearch('')
    setStatus(undefined)
    setSecretariaId(undefined)
    setPage(1)
  }

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []

    if (search.trim()) {
      filters.push({
        key: 'search',
        label: 'Busca',
        value: search.trim(),
      })
    }

    if (status) {
      filters.push({
        key: 'status',
        label: 'Status',
        value: formatMovimentacaoStatus(status),
      })
    }

    if (secretariaId) {
      const secretaria = optionsQuery.data?.secretarias.find((item) => item.id === secretariaId)

      filters.push({
        key: 'secretaria',
        label: 'Secretaria',
        value: secretaria ? secretaria.sigla : secretariaId,
      })
    }

    return filters
  }, [optionsQuery.data?.secretarias, search, secretariaId, status])

  const columns = useMemo(
    () => [
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: MovimentacaoItem) => (
          <CopyToClipboard text={record.patrimonio.tombo} />
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
          <StatusBadge color={getMovimentacaoStatusColor(value)}>
            {formatMovimentacaoStatus(value)}
          </StatusBadge>
        ),
      },
      {
        title: 'Proximo passo',
        key: 'nextStep',
        render: (record: MovimentacaoItem) => {
          const nextStep = getMovimentacaoNextStepInfo({
            status: record.status,
            secretariaOrigemId: record.secretariaOrigemId,
            secretariaOrigemSigla: record.secretariaOrigem.sigla,
            secretariaDestinoId: record.secretariaDestinoId,
            secretariaDestinoSigla: record.secretariaDestino.sigla,
          })
          const viewerAction = getMovimentacaoViewerActionInfo(
            {
              status: record.status,
              secretariaOrigemId: record.secretariaOrigemId,
              secretariaOrigemSigla: record.secretariaOrigem.sigla,
              secretariaDestinoId: record.secretariaDestinoId,
              secretariaDestinoSigla: record.secretariaDestino.sigla,
            },
            session.user,
          )

          return (
            <Space direction="vertical" size={2}>
              <StatusBadge tone={viewerAction.canAct ? viewerAction.tone : nextStep.tone}>
                {viewerAction.canAct ? 'Sua acao' : nextStep.actorLabel}
              </StatusBadge>
              <span>{viewerAction.canAct ? viewerAction.title : nextStep.title}</span>
            </Space>
          )
        },
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
    [navigate, session.user],
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
          description="Fluxo com solicitacao, confirmacoes e validacao final do patrimonio."
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
              onClick={clearFilters}
            >
              Limpar filtros
            </Button>
          </Space>

          <ActiveFiltersSummary
            filters={activeFilters}
            onClear={clearFilters}
            total={movimentacoesQuery.data?.total ?? 0}
          />

          <Table
            rowKey="id"
            loading={{
              spinning: movimentacoesQuery.isLoading,
              delay: 300,
            }}
            dataSource={movimentacoesQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({
              description: 'Nenhuma movimentacao encontrada.',
            })}
            rowClassName={(record: MovimentacaoItem) =>
              getMovimentacaoViewerActionInfo(
                {
                  status: record.status,
                  secretariaOrigemId: record.secretariaOrigemId,
                  secretariaOrigemSigla: record.secretariaOrigem.sigla,
                  secretariaDestinoId: record.secretariaDestinoId,
                  secretariaDestinoSigla: record.secretariaDestino.sigla,
                },
                session.user,
              ).canAct
                ? 'table-row--action-required'
                : ''
            }
            pagination={{
              current: movimentacoesQuery.data?.page ?? page,
              pageSize,
              total: movimentacoesQuery.data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `${total} itens`,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== pageSize) {
                  setPageSize(nextPageSize)
                  setPage(1)
                  return
                }
                setPage(nextPage)
              },
            }}
          />
        </Card>
      </Space>
    </AppLayout>
  )
}
