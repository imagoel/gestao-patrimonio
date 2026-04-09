import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
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
import { TableActions } from '../../components/shared/TableActions'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { usePermissao } from '../../hooks/usePermissao'
import { patrimonioService } from '../../services/patrimonio.service'
import {
  EstadoConservacao,
  Perfil,
  StatusItem,
  TipoEntrada,
} from '../../types/enums'
import type { PatrimonioItem } from '../../types/patrimonio.types'
import {
  formatCurrency,
  formatDateTime,
  formatItemStatus,
  formatTipoEntrada,
} from '../../utils/formatters'
import { normalizeTomboInput } from '../../utils/validators'

function getStatusColor(status: StatusItem) {
  switch (status) {
    case StatusItem.ATIVO:
      return 'green'
    case StatusItem.INATIVO:
      return 'red'
    case StatusItem.EM_MANUTENCAO:
      return 'orange'
    case StatusItem.EM_MOVIMENTACAO:
      return 'gold'
    case StatusItem.BAIXADO:
      return 'default'
    default:
      return 'blue'
  }
}

export function PatrimonioListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const canManage = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [tombo, setTombo] = useState('')
  const [status, setStatus] = useState<StatusItem | undefined>(undefined)
  const [estadoConservacao, setEstadoConservacao] = useState<
    EstadoConservacao | undefined
  >(undefined)
  const [tipoEntrada, setTipoEntrada] = useState<TipoEntrada | undefined>(
    undefined,
  )
  const [secretariaAtualId, setSecretariaAtualId] = useState<string | undefined>(
    undefined,
  )
  const [responsavelAtualId, setResponsavelAtualId] = useState<string | undefined>(
    undefined,
  )
  const [fornecedorId, setFornecedorId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)
  const deferredTombo = useDeferredValue(tombo)

  const patrimonioOptionsQuery = useQuery({
    queryKey: ['patrimonios-options'],
    queryFn: patrimonioService.findOptions,
  })

  const patrimonioQuery = useQuery({
    queryKey: [
      'patrimonios-list',
      page,
      pageSize,
      deferredSearch,
      deferredTombo,
      status,
      estadoConservacao,
      tipoEntrada,
      secretariaAtualId,
      responsavelAtualId,
      fornecedorId,
    ],
    queryFn: () =>
      patrimonioService.list({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        tombo: deferredTombo || undefined,
        status,
        estadoConservacao,
        tipoEntrada,
        secretariaAtualId,
        responsavelAtualId,
        fornecedorId,
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => patrimonioService.remove(id),
    onSuccess: () => {
      message.success('Patrimonio marcado como inativo com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] })
    },
    onError: () => {
      message.error('Nao foi possivel inativar o patrimonio.')
    },
  })

  const clearFilters = () => {
    setSearch('')
    setTombo('')
    setStatus(undefined)
    setEstadoConservacao(undefined)
    setTipoEntrada(undefined)
    setSecretariaAtualId(undefined)
    setResponsavelAtualId(undefined)
    setFornecedorId(undefined)
    setPage(1)
  }

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []

    if (search.trim()) {
      filters.push({ key: 'search', label: 'Busca', value: search.trim() })
    }

    if (tombo) {
      filters.push({ key: 'tombo', label: 'Tombo', value: tombo })
    }

    if (status) {
      filters.push({ key: 'status', label: 'Status', value: formatItemStatus(status) })
    }

    if (estadoConservacao) {
      filters.push({
        key: 'estadoConservacao',
        label: 'Estado',
        value: estadoConservacao,
      })
    }

    if (tipoEntrada) {
      filters.push({
        key: 'tipoEntrada',
        label: 'Entrada',
        value: formatTipoEntrada(tipoEntrada),
      })
    }

    if (secretariaAtualId) {
      const secretaria = patrimonioOptionsQuery.data?.secretarias.find(
        (item) => item.id === secretariaAtualId,
      )

      filters.push({
        key: 'secretaria',
        label: 'Secretaria',
        value: secretaria ? secretaria.sigla : secretariaAtualId,
      })
    }

    if (responsavelAtualId) {
      const responsavel = patrimonioOptionsQuery.data?.responsaveis.find(
        (item) => item.id === responsavelAtualId,
      )

      filters.push({
        key: 'responsavel',
        label: 'Responsavel',
        value: responsavel ? responsavel.nome : responsavelAtualId,
      })
    }

    if (fornecedorId) {
      const fornecedor = patrimonioOptionsQuery.data?.fornecedores.find(
        (item) => item.id === fornecedorId,
      )

      filters.push({
        key: 'fornecedor',
        label: 'Fornecedor',
        value: fornecedor ? fornecedor.nome : fornecedorId,
      })
    }

    return filters
  }, [
    estadoConservacao,
    fornecedorId,
    patrimonioOptionsQuery.data?.fornecedores,
    patrimonioOptionsQuery.data?.responsaveis,
    patrimonioOptionsQuery.data?.secretarias,
    responsavelAtualId,
    search,
    secretariaAtualId,
    status,
    tipoEntrada,
    tombo,
  ])

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Tombo',
        dataIndex: 'tombo',
        key: 'tombo',
        render: (value: string) => <CopyToClipboard text={value} />,
        sorter: (a: PatrimonioItem, b: PatrimonioItem) => a.tombo.localeCompare(b.tombo),
      },
      {
        title: 'Item',
        dataIndex: 'item',
        key: 'item',
      },
      {
        title: 'Secretaria',
        key: 'secretariaAtual',
        render: (record: PatrimonioItem) => record.secretariaAtual.sigla,
      },
      {
        title: 'Responsavel',
        key: 'responsavelAtual',
        render: (record: PatrimonioItem) => record.responsavelAtual.nome,
      },
      {
        title: 'Localizacao',
        dataIndex: 'localizacaoAtual',
        key: 'localizacaoAtual',
      },
      {
        title: 'Estado',
        dataIndex: 'estadoConservacao',
        key: 'estadoConservacao',
        render: (value: EstadoConservacao) => <StatusBadge>{value}</StatusBadge>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: StatusItem) => (
          <StatusBadge color={getStatusColor(value)}>{value}</StatusBadge>
        ),
      },
      {
        title: 'Valor original',
        dataIndex: 'valorOriginal',
        key: 'valorOriginal',
        render: (value: string) => formatCurrency(value),
        sorter: (a: PatrimonioItem, b: PatrimonioItem) =>
          Number(a.valorOriginal) - Number(b.valorOriginal),
      },
      {
        title: 'Atualizado em',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (value: string) => formatDateTime(value),
        sorter: (a: PatrimonioItem, b: PatrimonioItem) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      },
    ]

    return [
      ...baseColumns,
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: PatrimonioItem) => (
          <TableActions
            actions={[
              {
                key: 'details',
                label: 'Detalhes',
                onClick: () => navigate(`/patrimonios/${record.id}`),
              },
              ...(canManage
                ? [
                    {
                      key: 'edit',
                      label: 'Editar',
                      onClick: () => navigate(`/patrimonios/${record.id}/editar`),
                    },
                    {
                      key: 'disable',
                      label: 'Inativar',
                      danger: true,
                      disabled: record.status === StatusItem.INATIVO,
                      loading: removeMutation.isPending,
                      confirm: {
                        title: 'Inativar patrimonio',
                        description:
                          'O item permanecera cadastrado, mas com status inativo.',
                        okText: 'Inativar',
                        onConfirm: () => {
                          void removeMutation.mutateAsync(record.id)
                        },
                      },
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ]
  }, [canManage, navigate, removeMutation])

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
    <AppLayout label="Modulo de patrimonio">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Patrimonio"
          description="Consulte os bens cadastrados com filtros por tombo, status, secretaria, responsavel e fornecedor."
          actions={
            canManage ? (
              <Button
                type="primary"
                onClick={() => {
                  startTransition(() => {
                    navigate('/patrimonios/novo')
                  })
                }}
              >
                Novo patrimonio
              </Button>
            ) : null
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por item, tombo ou localizacao"
              style={{ width: 320 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Input
              allowClear
              placeholder="Tombo exato"
              style={{ width: 180 }}
              value={tombo}
              onChange={(event) => {
                setTombo(normalizeTomboInput(event.target.value))
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
              options={(patrimonioOptionsQuery.data?.status ?? Object.values(StatusItem)).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Select
              allowClear
              placeholder="Estado de conservacao"
              style={{ width: 240 }}
              value={estadoConservacao}
              onChange={(value) => {
                setEstadoConservacao(value)
                setPage(1)
              }}
              options={(
                patrimonioOptionsQuery.data?.estadosConservacao ??
                Object.values(EstadoConservacao)
              ).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Select
              allowClear
              placeholder="Tipo de entrada"
              style={{ width: 220 }}
              value={tipoEntrada}
              onChange={(value) => {
                setTipoEntrada(value)
                setPage(1)
              }}
              options={(
                patrimonioOptionsQuery.data?.tiposEntrada ??
                Object.values(TipoEntrada)
              ).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            {canManage || (patrimonioOptionsQuery.data?.secretarias.length ?? 0) > 1 ? (
              <Select
                allowClear
                loading={patrimonioOptionsQuery.isLoading}
                placeholder="Secretaria"
                style={{ width: 240 }}
                value={secretariaAtualId}
                onChange={(value) => {
                  setSecretariaAtualId(value)
                  setPage(1)
                }}
                options={(patrimonioOptionsQuery.data?.secretarias ?? []).map(
                  (secretaria) => ({
                    label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                    value: secretaria.id,
                  }),
                )}
              />
            ) : null}
            <Select
              allowClear
              loading={patrimonioOptionsQuery.isLoading}
              placeholder="Responsavel"
              style={{ width: 260 }}
              value={responsavelAtualId}
              onChange={(value) => {
                setResponsavelAtualId(value)
                setPage(1)
              }}
              options={(patrimonioOptionsQuery.data?.responsaveis ?? []).map(
                (responsavel) => ({
                  label: `${responsavel.nome} - ${responsavel.setor}`,
                  value: responsavel.id,
                }),
              )}
            />
            <Select
              allowClear
              loading={patrimonioOptionsQuery.isLoading}
              placeholder="Fornecedor"
              style={{ width: 260 }}
              value={fornecedorId}
              onChange={(value) => {
                setFornecedorId(value)
                setPage(1)
              }}
              options={(patrimonioOptionsQuery.data?.fornecedores ?? []).map(
                (fornecedor) => ({
                  label: fornecedor.cpfCnpj
                    ? `${fornecedor.nome} - ${fornecedor.cpfCnpj}`
                    : fornecedor.nome,
                  value: fornecedor.id,
                }),
              )}
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
            total={patrimonioQuery.data?.total ?? 0}
          />

          <Table
            rowKey="id"
            loading={{
              spinning: patrimonioQuery.isLoading,
              delay: 300,
            }}
            dataSource={patrimonioQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({
              description: 'Nenhum patrimonio encontrado com os filtros selecionados.',
              onCreateClick: canManage ? () => navigate('/patrimonios/novo') : undefined,
              createLabel: 'Novo patrimonio',
            })}
            rowClassName={(record: PatrimonioItem) =>
              record.status === StatusItem.EM_MOVIMENTACAO
                ? 'patrimonio-row--em-movimentacao'
                : ''
            }
            pagination={{
              current: patrimonioQuery.data?.page ?? page,
              pageSize,
              total: patrimonioQuery.data?.total ?? 0,
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
