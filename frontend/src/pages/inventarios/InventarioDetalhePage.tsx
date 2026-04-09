import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Input,
  Select,
  Space,
  Statistic,
  Table,
} from 'antd'
import { useDeferredValue, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { CopyToClipboard } from '../../components/shared/CopyToClipboard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { TableActions } from '../../components/shared/TableActions'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { usePermissao } from '../../hooks/usePermissao'
import { inventariosService } from '../../services/inventarios.service'
import { Perfil, StatusInventario, StatusInventarioItem } from '../../types/enums'
import { formatDateTime, formatInventarioItemStatus } from '../../utils/formatters'
import type { InventarioItemRegistro } from '../../types/inventarios.types'

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

function getInventarioItemStatusColor(status: StatusInventarioItem) {
  switch (status) {
    case StatusInventarioItem.PENDENTE:
      return 'gold'
    case StatusInventarioItem.LOCALIZADO:
      return 'green'
    case StatusInventarioItem.NAO_LOCALIZADO:
      return 'red'
    default:
      return 'blue'
  }
}

export function InventarioDetalhePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { id } = useParams()
  const { hasPerfil } = usePermissao()
  const canAccess = hasPerfil(
    Perfil.ADMINISTRADOR,
    Perfil.TECNICO_PATRIMONIO,
    Perfil.CHEFE_SETOR,
    Perfil.USUARIO_CONSULTA,
  )
  const canManage = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const canRegister = hasPerfil(
    Perfil.ADMINISTRADOR,
    Perfil.TECNICO_PATRIMONIO,
    Perfil.CHEFE_SETOR,
  )
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusInventarioItem | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const inventarioQuery = useQuery({
    queryKey: ['inventario-detail', id],
    queryFn: () => inventariosService.findOne(id as string),
    enabled: canAccess && Boolean(id),
  })

  const itensQuery = useQuery({
    queryKey: ['inventario-items', id, page, deferredSearch, status],
    queryFn: () =>
      inventariosService.findItems(id as string, {
        page,
        limit: 10,
        search: deferredSearch || undefined,
        status,
      }),
    enabled: canAccess && Boolean(id),
  })

  const registrarMutation = useMutation({
    mutationFn: ({
      itemId,
      nextStatus,
    }: {
      itemId: string
      nextStatus: StatusInventarioItem
    }) =>
      inventariosService.registrarItem(id as string, itemId, {
        status: nextStatus,
      }),
    onSuccess: async () => {
      message.success('Item do inventario atualizado com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventario-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['inventario-items', id] }),
        queryClient.invalidateQueries({ queryKey: ['inventarios-list'] }),
      ])
    },
    onError: () => {
      message.error('Nao foi possivel atualizar o item do inventario.')
    },
  })

  const concluirMutation = useMutation({
    mutationFn: () => inventariosService.concluir(id as string),
    onSuccess: async () => {
      message.success('Inventario concluido com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventario-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['inventario-items', id] }),
        queryClient.invalidateQueries({ queryKey: ['inventarios-list'] }),
      ])
    },
    onError: () => {
      message.error('Nao foi possivel concluir o inventario.')
    },
  })

  const columns = useMemo(
    () => [
      {
        title: 'Tombo',
        dataIndex: 'tomboSnapshot',
        key: 'tomboSnapshot',
        render: (value: string) => <CopyToClipboard text={value} />,
      },
      {
        title: 'Item',
        dataIndex: 'itemSnapshot',
        key: 'itemSnapshot',
      },
      {
        title: 'Snapshot esperado',
        key: 'snapshot',
        render: (record: InventarioItemRegistro) => (
          <Space direction="vertical" size={2}>
            <span>{record.localizacaoSnapshot}</span>
            <span>{record.responsavelSnapshotNome}</span>
          </Space>
        ),
      },
      {
        title: 'Cadastro atual',
        key: 'atual',
        render: (record: InventarioItemRegistro) => (
          <Space direction="vertical" size={2}>
            <span>
              {record.patrimonio.secretariaAtual.sigla} -{' '}
              {record.patrimonio.localizacaoAtual}
            </span>
            <span>{record.patrimonio.responsavelAtual.nome}</span>
          </Space>
        ),
      },
      {
        title: 'Status do inventario',
        dataIndex: 'status',
        key: 'status',
        render: (value: StatusInventarioItem) => (
          <StatusBadge color={getInventarioItemStatusColor(value)}>
            {formatInventarioItemStatus(value)}
          </StatusBadge>
        ),
      },
      {
        title: 'Registrado em',
        dataIndex: 'registradoEm',
        key: 'registradoEm',
        render: (value: string | null) =>
          value ? formatDateTime(value) : 'Pendente',
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: InventarioItemRegistro) =>
          canRegister &&
          inventarioQuery.data?.status === StatusInventario.ABERTO ? (
            <TableActions
              actions={[
                ...(record.status !== StatusInventarioItem.LOCALIZADO
                  ? [
                      {
                        key: 'located',
                        label: 'Localizado',
                        loading: registrarMutation.isPending,
                        onClick: () => {
                          void registrarMutation.mutateAsync({
                            itemId: record.id,
                            nextStatus: StatusInventarioItem.LOCALIZADO,
                          })
                        },
                      },
                    ]
                  : []),
                ...(record.status !== StatusInventarioItem.NAO_LOCALIZADO
                  ? [
                      {
                        key: 'not-found',
                        label: 'Nao localizado',
                        danger: true,
                        loading: registrarMutation.isPending,
                        onClick: () => {
                          void registrarMutation.mutateAsync({
                            itemId: record.id,
                            nextStatus: StatusInventarioItem.NAO_LOCALIZADO,
                          })
                        },
                      },
                    ]
                  : []),
                ...(record.status !== StatusInventarioItem.PENDENTE
                  ? [
                      {
                        key: 'reopen',
                        label: 'Reabrir',
                        loading: registrarMutation.isPending,
                        onClick: () => {
                          void registrarMutation.mutateAsync({
                            itemId: record.id,
                            nextStatus: StatusInventarioItem.PENDENTE,
                          })
                        },
                      },
                    ]
                  : []),
              ]}
            />
          ) : (
            'Sem acao'
          ),
      },
    ],
    [canRegister, inventarioQuery.data?.status, registrarMutation],
  )

  if (!canAccess) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Detalhe do inventario">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={inventarioQuery.data?.titulo ?? 'Inventario'}
          description="Inventario periodico por secretaria, com snapshot inicial do patrimonio e registro progressivo da contagem."
          actions={
            <StatusBadge
              color={
                inventarioQuery.data
                  ? getInventarioStatusColor(inventarioQuery.data.status)
                  : 'blue'
              }
            >
              {inventarioQuery.data?.status ?? 'Carregando'}
            </StatusBadge>
          }
        />

        {inventarioQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Nao foi possivel carregar o inventario."
          />
        ) : null}

        {itensQuery.isError ? (
          <Alert
            type="warning"
            showIcon
            message="Os dados principais do inventario foram carregados, mas a lista de itens nao pode ser consultada agora."
          />
        ) : null}

        {inventarioQuery.data ? (
          <>
            <Alert
              showIcon
              type={
                inventarioQuery.data.status === StatusInventario.CONCLUIDO
                  ? 'success'
                  : inventarioQuery.data.resumo.pendentes > 0
                    ? 'info'
                    : 'warning'
              }
              message={
                inventarioQuery.data.status === StatusInventario.CONCLUIDO
                  ? 'Inventario concluido.'
                  : inventarioQuery.data.resumo.pendentes > 0
                    ? 'Contagem em andamento.'
                    : 'Inventario pronto para conclusao.'
              }
              description={
                inventarioQuery.data.status === StatusInventario.CONCLUIDO
                  ? 'Todos os registros deste ciclo ja foram encerrados e podem ser consultados livremente.'
                  : inventarioQuery.data.resumo.pendentes > 0
                    ? `Ainda faltam ${inventarioQuery.data.resumo.pendentes} item(ns) para finalizar a contagem deste ciclo.`
                    : canManage
                      ? 'Todos os itens foram analisados. A equipe de patrimonio ja pode concluir este inventario.'
                      : 'Todos os itens foram analisados. Aguarde a conclusao formal do inventario.'
              }
            />

            <Space wrap>
              <Card>
                <Statistic
                  title="Total de itens"
                  value={inventarioQuery.data.resumo.totalItens}
                />
              </Card>
              <Card>
                <Statistic
                  title="Pendentes"
                  value={inventarioQuery.data.resumo.pendentes}
                />
              </Card>
              <Card>
                <Statistic
                  title="Localizados"
                  value={inventarioQuery.data.resumo.localizados}
                />
              </Card>
              <Card>
                <Statistic
                  title="Nao localizados"
                  value={inventarioQuery.data.resumo.naoLocalizados}
                />
              </Card>
            </Space>

            <Card
              title="Dados do ciclo"
              extra={
                canManage ? (
                  <Button
                    type="primary"
                    disabled={
                      inventarioQuery.data.status !== StatusInventario.ABERTO ||
                      inventarioQuery.data.resumo.pendentes > 0
                    }
                    loading={concluirMutation.isPending}
                    onClick={() => {
                      void concluirMutation.mutateAsync()
                    }}
                  >
                    Concluir inventario
                  </Button>
                ) : null
              }
              >
                <Descriptions column={1} bordered>
                <Descriptions.Item label="Secretaria">
                  {inventarioQuery.data.secretaria.sigla} -{' '}
                  {inventarioQuery.data.secretaria.nomeCompleto}
                </Descriptions.Item>
                <Descriptions.Item label="Criado por">
                  {inventarioQuery.data.criadoPor.nome}
                </Descriptions.Item>
                <Descriptions.Item label="Iniciado em">
                  {formatDateTime(inventarioQuery.data.iniciadoEm)}
                </Descriptions.Item>
                <Descriptions.Item label="Concluido em">
                  {inventarioQuery.data.concluidoEm
                    ? formatDateTime(inventarioQuery.data.concluidoEm)
                    : 'Em aberto'}
                </Descriptions.Item>
                <Descriptions.Item label="Observacoes">
                  {inventarioQuery.data.observacoes ?? 'Nao informadas'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ) : null}

        <Card
          title="Itens do inventario"
          extra={
            <Space wrap>
              <Input
                allowClear
                placeholder="Buscar por tombo, item, local ou responsavel"
                style={{ width: 320 }}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
              <Select
                allowClear
                placeholder="Status do item"
                style={{ width: 220 }}
                value={status}
                onChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
                options={Object.values(StatusInventarioItem).map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
              <Button
                onClick={() => {
                  setSearch('')
                  setStatus(undefined)
                  setPage(1)
                }}
              >
                Limpar filtros
              </Button>
            </Space>
          }
        >
          <Table
            rowKey="id"
            loading={itensQuery.isLoading}
            dataSource={itensQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({
              description: 'Nenhum item encontrado para os filtros informados neste inventario.',
            })}
            pagination={{
              current: itensQuery.data?.page ?? page,
              pageSize: itensQuery.data?.limit ?? 10,
              total: itensQuery.data?.total ?? 0,
              onChange: (nextPage) => {
                setPage(nextPage)
              },
            }}
          />
        </Card>

        <Space>
          <Button onClick={() => navigate('/inventarios')}>Voltar</Button>
          <Button onClick={() => navigate('/patrimonios')}>Abrir patrimonios</Button>
        </Space>
      </Space>
    </AppLayout>
  )
}
