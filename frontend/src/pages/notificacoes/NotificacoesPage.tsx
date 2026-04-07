import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
} from 'antd'
import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { usePermissao } from '../../hooks/usePermissao'
import { notificacoesService } from '../../services/notificacoes.service'
import { Perfil, StatusMovimentacao } from '../../types/enums'
import type { NotificacaoItem } from '../../types/notificacoes.types'
import { formatDateTime } from '../../utils/formatters'

function getStatusColor(status: StatusMovimentacao) {
  switch (status) {
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA:
      return 'orange'
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO:
      return 'gold'
    case StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO:
      return 'blue'
    case StatusMovimentacao.CONCLUIDA:
      return 'green'
    case StatusMovimentacao.REJEITADA:
      return 'red'
    case StatusMovimentacao.CANCELADA:
      return 'default'
    case StatusMovimentacao.APROVADA:
      return 'cyan'
    default:
      return 'purple'
  }
}

export function NotificacoesPage() {
  const navigate = useNavigate()
  const { hasPerfil } = usePermissao()
  const canAccess = hasPerfil(
    Perfil.ADMINISTRADOR,
    Perfil.TECNICO_PATRIMONIO,
    Perfil.CHEFE_SETOR,
    Perfil.USUARIO_CONSULTA,
  )

  const notificacoesQuery = useQuery({
    queryKey: ['notificacoes-list'],
    queryFn: () => notificacoesService.list(20),
    enabled: canAccess,
    refetchInterval: 60000,
  })

  const columns = useMemo(
    () => [
      {
        title: 'Data',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Prioridade',
        key: 'severidade',
        render: (record: NotificacaoItem) =>
          record.requiresAction ? (
            <Badge status="warning" text="Acao requerida" />
          ) : (
            <Badge status="processing" text="Acompanhamento" />
          ),
      },
      {
        title: 'Notificacao',
        key: 'titulo',
        render: (record: NotificacaoItem) => (
          <Space direction="vertical" size={2}>
            <strong>{record.titulo}</strong>
            <span>{record.descricao}</span>
          </Space>
        ),
      },
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: NotificacaoItem) => (
          <StatusBadge tone="info">{record.patrimonio.tombo}</StatusBadge>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: StatusMovimentacao) => (
          <StatusBadge color={getStatusColor(value)}>{value}</StatusBadge>
        ),
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: NotificacaoItem) => (
          <Button onClick={() => navigate(record.route)}>Abrir movimentacao</Button>
        ),
      },
    ],
    [navigate],
  )

  if (!canAccess) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Notificacoes internas">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Notificacoes operacionais"
          description="Primeiro recorte de notificacoes internas da Fase 3, derivado das movimentacoes abertas e do escopo do usuario logado."
        />

        {notificacoesQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Nao foi possivel carregar as notificacoes."
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={4}>
            <Card loading={notificacoesQuery.isLoading}>
              <Statistic
                title="Total no painel"
                value={notificacoesQuery.data?.summary.total ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card loading={notificacoesQuery.isLoading}>
              <Statistic
                title="Acao requerida"
                value={notificacoesQuery.data?.summary.actionRequired ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card loading={notificacoesQuery.isLoading}>
              <Statistic
                title="Entrega pendente"
                value={notificacoesQuery.data?.summary.pendentesEntrega ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card loading={notificacoesQuery.isLoading}>
              <Statistic
                title="Recebimento pendente"
                value={notificacoesQuery.data?.summary.pendentesRecebimento ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card loading={notificacoesQuery.isLoading}>
              <Statistic
                title="Aprovacao pendente"
                value={notificacoesQuery.data?.summary.pendentesAprovacao ?? 0}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Fila de notificacoes"
          extra={
            <Button onClick={() => void notificacoesQuery.refetch()}>
              Atualizar
            </Button>
          }
        >
          <Table
            rowKey="id"
            loading={notificacoesQuery.isLoading}
            dataSource={notificacoesQuery.data?.items ?? []}
            columns={columns}
            pagination={false}
          />
        </Card>
      </Space>
    </AppLayout>
  )
}
