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
import { createTableLocale } from '../../components/shared/TableEmpty'
import { usePermissao } from '../../hooks/usePermissao'
import { fornecedoresService } from '../../services/fornecedores.service'
import { Perfil } from '../../types/enums'
import type { FornecedorItem } from '../../types/fornecedores.types'
import { formatDateTime } from '../../utils/formatters'

export function FornecedoresListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [ativo, setAtivo] = useState<boolean | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const fornecedoresQuery = useQuery({
    queryKey: ['fornecedores-list', page, pageSize, deferredSearch, ativo],
    queryFn: () =>
      fornecedoresService.list({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        ativo,
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => fornecedoresService.remove(id),
    onSuccess: () => {
      message.success('Fornecedor desativado com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['fornecedores-list'] })
      void queryClient.invalidateQueries({ queryKey: ['fornecedores-options'] })
    },
    onError: () => {
      message.error('Nao foi possivel desativar o fornecedor.')
    },
  })

  const columns = useMemo(
    () => [
      {
        title: 'Nome',
        dataIndex: 'nome',
        key: 'nome',
      },
      {
        title: 'CPF/CNPJ',
        dataIndex: 'cpfCnpj',
        key: 'cpfCnpj',
        render: (value: string | null) => value ?? 'Nao informado',
      },
      {
        title: 'Telefone',
        dataIndex: 'telefone',
        key: 'telefone',
        render: (value: string | null) => value ?? 'Nao informado',
      },
      {
        title: 'E-mail',
        dataIndex: 'email',
        key: 'email',
        render: (value: string | null) => value ?? 'Nao informado',
      },
      {
        title: 'Status',
        dataIndex: 'ativo',
        key: 'ativo',
        render: (value: boolean) =>
          value ? (
            <StatusBadge tone="success">Ativo</StatusBadge>
          ) : (
            <StatusBadge tone="danger">Inativo</StatusBadge>
          ),
      },
      {
        title: 'Atualizado em',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: Pick<FornecedorItem, 'id' | 'ativo'>) => (
          <TableActions
            actions={[
              {
                key: 'edit',
                label: 'Editar',
                onClick: () => navigate(`/fornecedores/${record.id}/editar`),
              },
              {
                key: 'disable',
                label: 'Desativar',
                danger: true,
                disabled: !record.ativo,
                loading: removeMutation.isPending,
                confirm: {
                  title: 'Desativar fornecedor',
                  description:
                    'Ele deixara de aparecer entre as opcoes ativas.',
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
    <AppLayout label="Modulo de fornecedores">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Fornecedores"
          description="Cadastro base com listagem, filtros simples, criacao, edicao e desativacao logica."
          actions={
            <Button
              type="primary"
              onClick={() => {
                startTransition(() => {
                  navigate('/fornecedores/novo')
                })
              }}
            >
              Novo fornecedor
            </Button>
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone"
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
              style={{ width: 160 }}
              value={ativo}
              onChange={(value) => {
                setAtivo(value)
                setPage(1)
              }}
              options={[
                { label: 'Ativo', value: true },
                { label: 'Inativo', value: false },
              ]}
            />
          </Space>

          <Table
            rowKey="id"
            loading={{ spinning: fornecedoresQuery.isLoading, delay: 300 }}
            dataSource={fornecedoresQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({ description: 'Nenhum fornecedor encontrado.' })}
            pagination={{
              current: fornecedoresQuery.data?.page ?? page,
              pageSize,
              total: fornecedoresQuery.data?.total ?? 0,
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
