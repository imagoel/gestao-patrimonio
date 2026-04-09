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
import { responsaveisService } from '../../services/responsaveis.service'
import { secretariasService } from '../../services/secretarias.service'
import { Perfil } from '../../types/enums'
import type { ResponsavelItem } from '../../types/responsaveis.types'
import { formatDateTime } from '../../utils/formatters'

export function ResponsaveisListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [secretariaId, setSecretariaId] = useState<string | undefined>(undefined)
  const [ativo, setAtivo] = useState<boolean | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const secretariasQuery = useQuery({
    queryKey: ['secretarias-options'],
    queryFn: secretariasService.findOptions,
  })

  const responsaveisQuery = useQuery({
    queryKey: ['responsaveis-list', page, pageSize, deferredSearch, secretariaId, ativo],
    queryFn: () =>
      responsaveisService.list({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        secretariaId,
        ativo,
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => responsaveisService.remove(id),
    onSuccess: () => {
      message.success('Responsavel desativado com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['responsaveis-list'] })
      void queryClient.invalidateQueries({ queryKey: ['responsaveis-options'] })
    },
    onError: () => {
      message.error('Nao foi possivel desativar o responsavel.')
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
        title: 'Cargo',
        dataIndex: 'cargo',
        key: 'cargo',
        render: (value: string | null) => value ?? 'Nao informado',
      },
      {
        title: 'Setor',
        dataIndex: 'setor',
        key: 'setor',
      },
      {
        title: 'Secretaria',
        key: 'secretaria',
        render: (record: Pick<ResponsavelItem, 'secretaria'>) => (
          <StatusBadge tone="info">{record.secretaria.sigla}</StatusBadge>
        ),
      },
      {
        title: 'Contato',
        dataIndex: 'contato',
        key: 'contato',
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
        render: (record: Pick<ResponsavelItem, 'id' | 'ativo'>) => (
          <TableActions
            actions={[
              {
                key: 'edit',
                label: 'Editar',
                onClick: () => navigate(`/responsaveis/${record.id}/editar`),
              },
              {
                key: 'disable',
                label: 'Desativar',
                danger: true,
                disabled: !record.ativo,
                loading: removeMutation.isPending,
                confirm: {
                  title: 'Desativar responsavel',
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
    <AppLayout label="Modulo de responsaveis">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Responsaveis"
          description="Cadastro base com vinculo a secretaria, listagem, filtros simples, criacao, edicao e desativacao logica."
          actions={
            <Button
              type="primary"
              onClick={() => {
                startTransition(() => {
                  navigate('/responsaveis/novo')
                })
              }}
            >
              Novo responsavel
            </Button>
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por nome, cargo, setor ou contato"
              style={{ width: 320 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              loading={secretariasQuery.isLoading}
              placeholder="Secretaria"
              style={{ width: 240 }}
              value={secretariaId}
              onChange={(value) => {
                setSecretariaId(value)
                setPage(1)
              }}
              options={(secretariasQuery.data ?? []).map((secretaria) => ({
                label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                value: secretaria.id,
              }))}
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
            loading={{ spinning: responsaveisQuery.isLoading, delay: 300 }}
            dataSource={responsaveisQuery.data?.items ?? []}
            columns={columns}
            locale={createTableLocale({ description: 'Nenhum responsavel encontrado.' })}
            pagination={{
              current: responsaveisQuery.data?.page ?? page,
              pageSize,
              total: responsaveisQuery.data?.total ?? 0,
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
