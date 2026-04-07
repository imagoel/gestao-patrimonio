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
import { baixaService } from '../../services/baixa.service'
import { MotivoBaixa, Perfil } from '../../types/enums'
import type { BaixaItem } from '../../types/baixa.types'
import { formatDateTime } from '../../utils/formatters'

export function BaixaListPage() {
  const navigate = useNavigate()
  const { hasPerfil } = usePermissao()
  const canCreate = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [motivo, setMotivo] = useState<MotivoBaixa | undefined>(undefined)
  const [secretariaId, setSecretariaId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const optionsQuery = useQuery({
    queryKey: ['baixas-options'],
    queryFn: baixaService.findOptions,
    enabled: canCreate,
  })

  const baixasQuery = useQuery({
    queryKey: ['baixas-list', page, deferredSearch, motivo, secretariaId],
    queryFn: () =>
      baixaService.list({
        page,
        limit: 10,
        search: deferredSearch || undefined,
        motivo,
        secretariaId,
      }),
  })

  const columns = useMemo(
    () => [
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: BaixaItem) => (
          <StatusBadge tone="danger">{record.patrimonio.tombo}</StatusBadge>
        ),
      },
      {
        title: 'Item',
        key: 'item',
        render: (record: BaixaItem) => record.patrimonio.item,
      },
      {
        title: 'Secretaria',
        key: 'secretaria',
        render: (record: BaixaItem) => record.patrimonio.secretariaAtual.sigla,
      },
      {
        title: 'Motivo',
        dataIndex: 'motivo',
        key: 'motivo',
      },
      {
        title: 'Baixado em',
        dataIndex: 'baixadoEm',
        key: 'baixadoEm',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Registrado por',
        key: 'usuario',
        render: (record: BaixaItem) => record.usuario.nome,
      },
    ],
    [],
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
    <AppLayout label="Modulo de baixa patrimonial">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Baixas patrimoniais"
          description="Registro definitivo de retirada de circulacao com motivo, data, historico e auditoria."
          actions={
            canCreate ? (
              <Button
                type="primary"
                onClick={() => {
                  startTransition(() => {
                    navigate('/baixas/nova')
                  })
                }}
              >
                Nova baixa
              </Button>
            ) : null
          }
        />

        <Card>
          <Space wrap size={[12, 12]} style={{ marginBottom: 16 }}>
            <Input
              allowClear
              placeholder="Buscar por item, tombo ou observacoes"
              style={{ width: 320 }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              allowClear
              placeholder="Motivo"
              style={{ width: 240 }}
              value={motivo}
              onChange={(value) => {
                setMotivo(value)
                setPage(1)
              }}
              options={Object.values(MotivoBaixa).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            {canCreate ? (
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
            ) : null}
            <Button
              onClick={() => {
                setSearch('')
                setMotivo(undefined)
                setSecretariaId(undefined)
                setPage(1)
              }}
            >
              Limpar filtros
            </Button>
          </Space>

          <Table
            rowKey="id"
            loading={baixasQuery.isLoading}
            dataSource={baixasQuery.data?.items ?? []}
            columns={columns}
            pagination={{
              current: baixasQuery.data?.page ?? page,
              pageSize: baixasQuery.data?.limit ?? 10,
              total: baixasQuery.data?.total ?? 0,
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
