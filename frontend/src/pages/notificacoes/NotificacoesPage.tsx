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
import { CopyToClipboard } from '../../components/shared/CopyToClipboard'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { useAuth } from '../../hooks/useAuth'
import { usePermissao } from '../../hooks/usePermissao'
import { notificacoesService } from '../../services/notificacoes.service'
import { Perfil, StatusMovimentacao } from '../../types/enums'
import type { NotificacaoItem } from '../../types/notificacoes.types'
import { formatDateTime, formatMovimentacaoStatus } from '../../utils/formatters'
import {
  getMovimentacaoNextStepInfo,
  getMovimentacaoStatusColor,
  getMovimentacaoViewerActionInfo,
} from '../../utils/movimentacao-ui'

export function NotificacoesPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
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

  const orderedItems = useMemo(() => {
    const items = [...(notificacoesQuery.data?.items ?? [])]

    return items.sort((left, right) => {
      if (left.requiresAction !== right.requiresAction) {
        return left.requiresAction ? -1 : 1
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  }, [notificacoesQuery.data?.items])

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
        render: (record: NotificacaoItem) => {
          const viewerAction = getMovimentacaoViewerActionInfo(
            {
              status: record.status,
              secretariaOrigemId: record.secretariaOrigem.id,
              secretariaOrigemSigla: record.secretariaOrigem.sigla,
              secretariaDestinoId: record.secretariaDestino.id,
              secretariaDestinoSigla: record.secretariaDestino.sigla,
            },
            session.user,
          )

          return viewerAction.canAct ? (
            <Badge status="warning" text="Sua acao" />
          ) : record.requiresAction ? (
            <Badge status="processing" text="Acao requerida" />
          ) : (
            <Badge status="default" text="Acompanhamento" />
          )
        },
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
          <CopyToClipboard text={record.patrimonio.tombo} />
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: StatusMovimentacao) => (
          <StatusBadge color={getMovimentacaoStatusColor(value)}>
            {formatMovimentacaoStatus(value)}
          </StatusBadge>
        ),
      },
      {
        title: 'Proximo passo',
        key: 'nextStep',
        render: (record: NotificacaoItem) => {
          const nextStep = getMovimentacaoNextStepInfo({
            status: record.status,
            secretariaOrigemId: record.secretariaOrigem.id,
            secretariaOrigemSigla: record.secretariaOrigem.sigla,
            secretariaDestinoId: record.secretariaDestino.id,
            secretariaDestinoSigla: record.secretariaDestino.sigla,
          })
          const viewerAction = getMovimentacaoViewerActionInfo(
            {
              status: record.status,
              secretariaOrigemId: record.secretariaOrigem.id,
              secretariaOrigemSigla: record.secretariaOrigem.sigla,
              secretariaDestinoId: record.secretariaDestino.id,
              secretariaDestinoSigla: record.secretariaDestino.sigla,
            },
            session.user,
          )

          return (
            <Space direction="vertical" size={2}>
              <StatusBadge tone={viewerAction.canAct ? viewerAction.tone : nextStep.tone}>
                {viewerAction.canAct ? 'Sua acao' : nextStep.actorLabel}
              </StatusBadge>
              <span>{viewerAction.canAct ? viewerAction.title : nextStep.title}</span>
            </Space>
          )
        },
      },
      {
        title: 'Acoes',
        key: 'actions',
        render: (record: NotificacaoItem) => (
          <Button onClick={() => navigate(record.route)}>Abrir movimentacao</Button>
        ),
      },
    ],
    [navigate, session.user],
  )

  if (!canAccess) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Notificacoes internas">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Notificacoes operacionais"
          description="Painel de notificacoes internas derivado das movimentacoes abertas e do escopo do usuario logado."
        />

        {notificacoesQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Nao foi possivel carregar as notificacoes."
          />
        ) : null}

        {(notificacoesQuery.data?.summary.actionRequired ?? 0) > 0 ? (
          <Alert
            showIcon
            type="warning"
            message="Ha movimentacoes aguardando uma acao operacional."
            description="Os itens marcados como 'Sua acao' estao prontos para voce confirmar ou validar agora."
          />
        ) : (
          <Alert
            showIcon
            type="info"
            message="Painel em dia"
            description="Nao ha acao operacional pendente para o seu perfil neste momento."
          />
        )}

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
            dataSource={orderedItems}
            columns={columns}
            locale={createTableLocale({
              description: 'Nenhuma notificacao encontrada para o seu escopo atual.',
            })}
            rowClassName={(record: NotificacaoItem) =>
              getMovimentacaoViewerActionInfo(
                {
                  status: record.status,
                  secretariaOrigemId: record.secretariaOrigem.id,
                  secretariaOrigemSigla: record.secretariaOrigem.sigla,
                  secretariaDestinoId: record.secretariaDestino.id,
                  secretariaDestinoSigla: record.secretariaDestino.sigla,
                },
                session.user,
              ).canAct
                ? 'table-row--action-required'
                : ''
            }
            pagination={false}
          />
        </Card>
      </Space>
    </AppLayout>
  )
}
