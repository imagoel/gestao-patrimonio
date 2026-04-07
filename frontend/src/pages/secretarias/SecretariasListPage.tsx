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
import { StatusBadge } from '../../components/shared/StatusBadge'
import { TableActions } from '../../components/shared/TableActions'
import { usePermissao } from '../../hooks/usePermissao'
import { secretariasService } from '../../services/secretarias.service'
import { Perfil } from '../../types/enums'
import type { SecretariaItem } from '../../types/secretarias.types'
import { formatDateTime } from '../../utils/formatters'

export function SecretariasListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [ativo, setAtivo] = useState<boolean | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const secretariasQuery = useQuery({
    queryKey: ['secretarias-list', page, deferredSearch, ativo],
    queryFn: () =>
      secretariasService.list({
        page,
        limit: 10,
        search: deferredSearch || undefined,
        ativo,
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => secretariasService.remove(id),
    onSuccess: () => {
      message.success('Secretaria desativada com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['secretarias-list'] })
      void queryClient.invalidateQueries({ queryKey: ['secretarias-options'] })
      void queryClient.invalidateQueries({ queryKey: ['usuarios-options'] })
    },
    onError: () => {
      message.error('Nao foi possivel desativar a secretaria.')
    },
  })

  const columns = useMemo(
    () => [
      {
        title: 'Sigla',
        dataIndex: 'sigla',
        key: 'sigla',
        render: (value: string) => <StatusBadge tone="info">{value}</StatusBadge>,
      },
      {
        title: 'Nome completo',
        dataIndex: 'nomeCompleto',
        key: 'nomeCompleto',
      },
      {
        title: 'Status',
        dataIndex: 'ativo',
        key: 'ativo',
        render: (value: boolean) =>
          value ? (
            <StatusBadge tone="success">Ativa</StatusBadge>
          ) : (
            <StatusBadge tone="danger">Inativa</StatusBadge>
          ),
      },
      {
        title: 'Atualizada em',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: Pick<SecretariaItem, 'id' | 'ativo'>) => (
          <TableActions
            actions={[
              {
                key: 'edit',
                label: 'Editar',
                onClick: () => navigate(`/secretarias/${record.id}/editar`),
              },
              {
                key: 'disable',
                label: 'Desativar',
                danger: true,
                disabled: !record.ativo,
                loading: removeMutation.isPending,
                confirm: {
                  title: 'Desativar secretaria',
                  description: 'Ela deixara de aparecer nas opcoes ativas.',
                  okText: 'Desativar',
                  onConfirm: () => {
                    void removeMutation.mutateAsync(record.id)
                  },
                },
              },
            ]}
          />
        ),
      },
    ],
    [navigate, removeMutation],
  )

  if (!hasPerfil(Perfil.ADMINISTRADOR)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Modulo de secretarias">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Secretarias"
          description="Cadastro base com listagem, filtros simples, criacao, edicao e desativacao logica."
          actions={
            <Button
              type="primary"
              onClick={() => {
                startTransition(() => {
                  navigate('/secretarias/nova')
                })
              }}
            >
              Nova secretaria
            </Button>
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por sigla ou nome"
              style={{ width: 280 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 160 }}
              value={ativo}
              onChange={(value) => {
                setAtivo(value)
                setPage(1)
              }}
              options={[
                { label: 'Ativa', value: true },
                { label: 'Inativa', value: false },
              ]}
            />
          </Space>

          <Table
            rowKey="id"
            loading={secretariasQuery.isLoading}
            dataSource={secretariasQuery.data?.items ?? []}
            columns={columns}
            pagination={{
              current: secretariasQuery.data?.page ?? page,
              pageSize: secretariasQuery.data?.limit ?? 10,
              total: secretariasQuery.data?.total ?? 0,
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
