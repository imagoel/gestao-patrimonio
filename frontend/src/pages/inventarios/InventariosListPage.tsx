import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Statistic,
  Table,
} from 'antd'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { ActiveFiltersSummary } from '../../components/shared/ActiveFiltersSummary'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { TableActions } from '../../components/shared/TableActions'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { usePermissao } from '../../hooks/usePermissao'
import { inventariosService } from '../../services/inventarios.service'
import { Perfil, StatusInventario } from '../../types/enums'
import { formatDateTime } from '../../utils/formatters'
import type { InventarioItemResumo } from '../../types/inventarios.types'

function getInventarioStatusColor(status: StatusInventario) {
  switch (status) {
    case StatusInventario.ABERTO:
      return 'orange'
    case StatusInventario.CONCLUIDO:
      return 'green'
    default:
      return 'blue'
  }
}

export function InventariosListPage() {
  const navigate = useNavigate()
  const { hasPerfil } = usePermissao()
  const canAccess = hasPerfil(
    Perfil.ADMINISTRADOR,
    Perfil.TECNICO_PATRIMONIO,
    Perfil.CHEFE_SETOR,
    Perfil.USUARIO_CONSULTA,
  )
  const canManage = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusInventario | undefined>(undefined)
  const [secretariaId, setSecretariaId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const optionsQuery = useQuery({
    queryKey: ['inventarios-options'],
    queryFn: inventariosService.findOptions,
    enabled: canAccess,
  })

  const inventariosQuery = useQuery({
    queryKey: ['inventarios-list', page, pageSize, deferredSearch, status, secretariaId],
    queryFn: () =>
      inventariosService.list({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        status,
        secretariaId,
      }),
    enabled: canAccess,
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
      filters.push({ key: 'search', label: 'Busca', value: search.trim() })
    }

    if (status) {
      filters.push({ key: 'status', label: 'Status', value: status })
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
        title: 'Inventario',
        key: 'titulo',
        render: (record: InventarioItemResumo) => (
          <Space direction="vertical" size={2}>
            <strong>{record.titulo}</strong>
            <span>
              {record.secretaria.sigla} - {record.secretaria.nomeCompleto}
            </span>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: StatusInventario) => (
          <StatusBadge color={getInventarioStatusColor(value)}>{value}</StatusBadge>
        ),
      },
      {
        title: 'Resumo',
        key: 'resumo',
        render: (record: InventarioItemResumo) => (
          <Space wrap size={[8, 8]}>
            <StatusBadge color="blue">Itens: {record.resumo.totalItens}</StatusBadge>
            <StatusBadge color="gold">Pendentes: {record.resumo.pendentes}</StatusBadge>
            <StatusBadge color="green">Localizados: {record.resumo.localizados}</StatusBadge>
            <StatusBadge color="red">
              Nao localizados: {record.resumo.naoLocalizados}
            </StatusBadge>
          </Space>
        ),
      },
      {
        title: 'Iniciado em',
        dataIndex: 'iniciadoEm',
        key: 'iniciadoEm',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Concluido em',
        dataIndex: 'concluidoEm',
        key: 'concluidoEm',
        render: (value: string | null) =>
          value ? formatDateTime(value) : 'Em aberto',
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: InventarioItemResumo) => (
          <TableActions
            actions={[
              {
                key: 'details',
                label: 'Detalhes',
                onClick: () => navigate(`/inventarios/${record.id}`),
              },
            ]}
          />
        ),
      },
    ],
    [navigate],
  )

  if (!canAccess) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Inventario periodico">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Inventarios periodicos"
          description="Inventario por secretaria com ciclo aberto, registro item a item e conclusao controlada."
          actions={
            canManage ? (
              <Button
                type="primary"
                onClick={() => {
                  startTransition(() => {
                    navigate('/inventarios/novo')
                  })
                }}
              >
                Novo inventario
              </Button>
            ) : null
          }
        />

        <Space wrap>
          <Card loading={inventariosQuery.isLoading}>
            <Statistic
              title="Inventarios no filtro"
              value={inventariosQuery.data?.total ?? 0}
            />
          </Card>
          <Card loading={inventariosQuery.isLoading}>
            <Statistic
              title="Abertos nesta pagina"
              value={
                inventariosQuery.data?.items.filter(
                  (item) => item.status === StatusInventario.ABERTO,
                ).length ?? 0
              }
            />
          </Card>
          <Card loading={inventariosQuery.isLoading}>
            <Statistic
              title="Concluidos nesta pagina"
              value={
                inventariosQuery.data?.items.filter(
                  (item) => item.status === StatusInventario.CONCLUIDO,
                ).length ?? 0
              }
            />
          </Card>
        </Space>

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por titulo ou secretaria"
              style={{ width: 320 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 220 }}
              value={status}
              onChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
              options={(optionsQuery.data?.status ?? Object.values(StatusInventario)).map(
                (item) => ({
                  label: item,
                  value: item,
                }),
              )}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Secretaria"
              style={{ width: 260 }}
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
            total={inventariosQuery.data?.total ?? 0}
          />

          <Table
            rowKey="id"
            loading={{
              spinning: inventariosQuery.isLoading,
              delay: 300,
            }}
            dataSource={inventariosQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({
              description: 'Nenhum inventario encontrado.',
            })}
            pagination={{
              current: inventariosQuery.data?.page ?? page,
              pageSize,
              total: inventariosQuery.data?.total ?? 0,
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
