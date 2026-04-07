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
import { usuariosService } from '../../services/usuarios.service'
import { Perfil } from '../../types/enums'
import { formatDateTime } from '../../utils/formatters'

export function UsuariosListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [perfil, setPerfil] = useState<Perfil | undefined>(undefined)
  const [ativo, setAtivo] = useState<boolean | undefined>(undefined)
  const [secretariaId, setSecretariaId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const optionsQuery = useQuery({
    queryKey: ['usuarios-options'],
    queryFn: usuariosService.findOptions,
  })

  const usuariosQuery = useQuery({
    queryKey: ['usuarios-list', page, deferredSearch, perfil, ativo, secretariaId],
    queryFn: () =>
      usuariosService.list({
        page,
        limit: 10,
        search: deferredSearch || undefined,
        perfil,
        ativo,
        secretariaId,
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => usuariosService.remove(id),
    onSuccess: () => {
      message.success('Usuario desativado com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['usuarios-list'] })
    },
    onError: () => {
      message.error('Nao foi possivel desativar o usuario.')
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
        title: 'E-mail',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: 'Perfil',
        dataIndex: 'perfil',
        key: 'perfil',
        render: (value: string) => <StatusBadge tone="info">{value}</StatusBadge>,
      },
      {
        title: 'Secretaria',
        key: 'secretaria',
        render: (record: { secretaria?: { sigla: string } | null }) =>
          record.secretaria?.sigla ?? 'Nao vinculada',
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
        render: (record: { id: string; ativo: boolean }) => (
          <TableActions
            actions={[
              {
                key: 'edit',
                label: 'Editar',
                onClick: () => navigate(`/usuarios/${record.id}/editar`),
              },
              {
                key: 'disable',
                label: 'Desativar',
                danger: true,
                disabled: !record.ativo,
                loading: removeMutation.isPending,
                confirm: {
                  title: 'Desativar usuario',
                  description: 'O usuario perdera acesso ao sistema.',
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
    <AppLayout label="Modulo de usuarios">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Usuarios do sistema"
          description="Cadastro inicial com listagem, filtros, criacao, edicao e desativacao logica."
          actions={
            <Button
              type="primary"
              onClick={() => {
                startTransition(() => {
                  navigate('/usuarios/novo')
                })
              }}
            >
              Novo usuario
            </Button>
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por nome ou e-mail"
              style={{ width: 260 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              placeholder="Perfil"
              style={{ width: 220 }}
              value={perfil}
              onChange={(value) => {
                setPerfil(value)
                setPage(1)
              }}
              options={Object.values(Perfil).map((item) => ({
                label: item,
                value: item,
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
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Secretaria"
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
          </Space>

          <Table
            rowKey="id"
            loading={usuariosQuery.isLoading}
            dataSource={usuariosQuery.data?.items ?? []}
            columns={columns}
            pagination={{
              current: usuariosQuery.data?.page ?? page,
              pageSize: usuariosQuery.data?.limit ?? 10,
              total: usuariosQuery.data?.total ?? 0,
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
