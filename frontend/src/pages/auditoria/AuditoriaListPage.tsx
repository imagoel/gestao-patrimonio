import { useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table } from 'antd'
import { useDeferredValue, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { ActiveFiltersSummary } from '../../components/shared/ActiveFiltersSummary'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { usePermissao } from '../../hooks/usePermissao'
import { auditoriaService } from '../../services/auditoria.service'
import { Perfil } from '../../types/enums'
import type { AuditoriaItem } from '../../types/auditoria.types'
import { formatDateTime } from '../../utils/formatters'

function resolvePatrimonioId(record: AuditoriaItem) {
  if (record.entidade === 'Patrimonio') {
    return record.entidadeId
  }

  const contexto = record.contexto

  if (
    contexto &&
    typeof contexto === 'object' &&
    !Array.isArray(contexto) &&
    typeof contexto.patrimonioId === 'string'
  ) {
    return contexto.patrimonioId
  }

  return null
}

function buildResumo(record: AuditoriaItem) {
  const contexto = record.contexto

  if (contexto && typeof contexto === 'object' && !Array.isArray(contexto)) {
    const partes: string[] = []

    if (typeof contexto.patrimonioTombo === 'string') {
      partes.push(`Tombo ${contexto.patrimonioTombo}`)
    }

    if (typeof contexto.motivo === 'string') {
      partes.push(`Motivo ${contexto.motivo}`)
    }

    if (typeof contexto.observacoes === 'string' && contexto.observacoes.trim()) {
      partes.push(contexto.observacoes.trim())
    }

    if (typeof contexto.justificativaRejeicao === 'string') {
      partes.push(`Justificativa: ${contexto.justificativaRejeicao}`)
    }

    if (partes.length) {
      return partes.join(' | ')
    }
  }

  return `Registro ${record.entidadeId}`
}

export function AuditoriaListPage() {
  const navigate = useNavigate()
  const { hasPerfil } = usePermissao()
  const canView = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [entidade, setEntidade] = useState<string | undefined>(undefined)
  const [acao, setAcao] = useState<string | undefined>(undefined)
  const [usuarioId, setUsuarioId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const optionsQuery = useQuery({
    queryKey: ['auditorias-options'],
    queryFn: auditoriaService.findOptions,
    enabled: canView,
  })

  const auditoriasQuery = useQuery({
    queryKey: ['auditorias-list', page, pageSize, deferredSearch, entidade, acao, usuarioId],
    queryFn: () =>
      auditoriaService.list({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        entidade,
        acao,
        usuarioId,
      }),
    enabled: canView,
  })

  const clearFilters = () => {
    setSearch('')
    setEntidade(undefined)
    setAcao(undefined)
    setUsuarioId(undefined)
    setPage(1)
  }

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []

    if (search.trim()) {
      filters.push({ key: 'search', label: 'Busca', value: search.trim() })
    }

    if (entidade) {
      filters.push({ key: 'entidade', label: 'Entidade', value: entidade })
    }

    if (acao) {
      filters.push({ key: 'acao', label: 'Acao', value: acao })
    }

    if (usuarioId) {
      const usuario = optionsQuery.data?.usuarios.find((item) => item.id === usuarioId)

      filters.push({
        key: 'usuario',
        label: 'Usuario',
        value: usuario ? usuario.nome : usuarioId,
      })
    }

    return filters
  }, [acao, entidade, optionsQuery.data?.usuarios, search, usuarioId])

  const columns = useMemo(
    () => [
      {
        title: 'Data e hora',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Entidade',
        dataIndex: 'entidade',
        key: 'entidade',
        render: (value: string) => <StatusBadge tone="info">{value}</StatusBadge>,
      },
      {
        title: 'Acao',
        dataIndex: 'acao',
        key: 'acao',
        render: (value: string) => <StatusBadge color="cyan">{value}</StatusBadge>,
      },
      {
        title: 'Usuario',
        key: 'usuario',
        render: (record: AuditoriaItem) => record.usuario?.nome ?? 'Sistema',
      },
      {
        title: 'Resumo',
        key: 'resumo',
        render: (record: AuditoriaItem) => buildResumo(record),
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: AuditoriaItem) => {
          const patrimonioId = resolvePatrimonioId(record)

          if (!patrimonioId) {
            return 'Sem patrimonio relacionado'
          }

          return (
            <Button onClick={() => navigate(`/patrimonios/${patrimonioId}`)}>
              Abrir patrimonio
            </Button>
          )
        },
      },
    ],
    [navigate],
  )

  if (!canView) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Modulo de auditoria">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Auditoria do sistema"
          description="Consulta centralizada dos eventos auditaveis registrados pelos fluxos criticos do patrimonio, movimentacao e baixa."
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por entidade, acao, usuario ou id do registro"
              style={{ width: 320 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Entidade"
              style={{ width: 220 }}
              value={entidade}
              onChange={(value) => {
                setEntidade(value)
                setPage(1)
              }}
              options={(optionsQuery.data?.entidades ?? []).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Acao"
              style={{ width: 220 }}
              value={acao}
              onChange={(value) => {
                setAcao(value)
                setPage(1)
              }}
              options={(optionsQuery.data?.acoes ?? []).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Usuario"
              style={{ width: 260 }}
              value={usuarioId}
              onChange={(value) => {
                setUsuarioId(value)
                setPage(1)
              }}
              options={(optionsQuery.data?.usuarios ?? []).map((usuario) => ({
                label: `${usuario.nome} - ${usuario.email}`,
                value: usuario.id,
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
            total={auditoriasQuery.data?.total ?? 0}
          />

          <Table
            rowKey="id"
            loading={{
              spinning: auditoriasQuery.isLoading,
              delay: 300,
            }}
            dataSource={auditoriasQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({
              description: 'Nenhum registro de auditoria encontrado.',
            })}
            pagination={{
              current: auditoriasQuery.data?.page ?? page,
              pageSize,
              total: auditoriasQuery.data?.total ?? 0,
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
