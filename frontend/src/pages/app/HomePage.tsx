import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import brandLogo from '../../assets/brand/minha-logo.png'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { CopyToClipboard } from '../../components/shared/CopyToClipboard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { usePermissao } from '../../hooks/usePermissao'
import { dashboardService } from '../../services/dashboard.service'
import { Perfil } from '../../types/enums'
import {
  formatDateTime,
  formatItemStatus,
  formatMovimentacaoStatus,
  formatMotivoBaixa,
} from '../../utils/formatters'
import type {
  DashboardBaixaRecenteItem,
  DashboardMovimentacaoRecenteItem,
  DashboardMovimentacaoStatusItem,
  DashboardPatrimonioPorSecretariaItem,
  DashboardPatrimonioStatusItem,
} from '../../types/dashboard.types'

const { Paragraph, Text, Title } = Typography

function getPatrimonioStatusColor(status: string) {
  switch (status) {
    case 'ATIVO':
      return 'green'
    case 'EM_MOVIMENTACAO':
      return 'blue'
    case 'BAIXADO':
      return 'red'
    case 'EM_MANUTENCAO':
      return 'orange'
    case 'INATIVO':
      return 'default'
    default:
      return 'purple'
  }
}

function getMovimentacaoStatusColor(status: string) {
  switch (status) {
    case 'AGUARDANDO_CONFIRMACAO_ENTREGA':
      return 'orange'
    case 'AGUARDANDO_CONFIRMACAO_RECEBIMENTO':
      return 'gold'
    case 'AGUARDANDO_APROVACAO_PATRIMONIO':
      return 'blue'
    case 'CONCLUIDA':
      return 'green'
    case 'REJEITADA':
      return 'red'
    case 'CANCELADA':
      return 'default'
    case 'APROVADA':
      return 'cyan'
    default:
      return 'purple'
  }
}

export function HomePage() {
  const navigate = useNavigate()
  const { logout, session } = useAuth()
  const { hasPerfil } = usePermissao()
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.findOverview,
  })

  const patrimonioPorSecretariaColumns = useMemo(
    () => [
      {
        title: 'Secretaria',
        key: 'secretaria',
        render: (record: DashboardPatrimonioPorSecretariaItem) =>
          `${record.sigla} - ${record.nomeCompleto}`,
      },
      {
        title: 'Patrimonios',
        dataIndex: 'total',
        key: 'total',
      },
    ],
    [],
  )

  const movimentacoesRecentesColumns = useMemo(
    () => [
      {
        title: 'Data',
        dataIndex: 'solicitadoEm',
        key: 'solicitadoEm',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: DashboardMovimentacaoRecenteItem) => (
          <CopyToClipboard text={record.patrimonio.tombo} />
        ),
      },
      {
        title: 'Item',
        key: 'item',
        render: (record: DashboardMovimentacaoRecenteItem) => record.patrimonio.item,
      },
      {
        title: 'Fluxo',
        key: 'fluxo',
        render: (record: DashboardMovimentacaoRecenteItem) =>
          `${record.secretariaOrigem.sigla} -> ${record.secretariaDestino.sigla}`,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => (
          <StatusBadge color={getMovimentacaoStatusColor(value)}>
            {formatMovimentacaoStatus(value)}
          </StatusBadge>
        ),
      },
    ],
    [],
  )

  const baixasRecentesColumns = useMemo(
    () => [
      {
        title: 'Data',
        dataIndex: 'baixadoEm',
        key: 'baixadoEm',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: DashboardBaixaRecenteItem) => (
          <CopyToClipboard text={record.patrimonio.tombo} />
        ),
      },
      {
        title: 'Item',
        key: 'item',
        render: (record: DashboardBaixaRecenteItem) => record.patrimonio.item,
      },
      {
        title: 'Motivo',
        dataIndex: 'motivo',
        key: 'motivo',
        render: (value: string) => formatMotivoBaixa(value),
      },
      {
        title: 'Registrado por',
        key: 'usuario',
        render: (record: DashboardBaixaRecenteItem) => record.usuario.nome,
      },
    ],
    [],
  )

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppLayout label="Painel inicial">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Painel inicial"
          description="Painel consolidado com indicadores de patrimonio, movimentacoes e baixas do escopo atual."
          actions={
            <Space direction="vertical" size="small">
              <Space wrap>
                <StatusBadge tone="success">Sessao autenticada</StatusBadge>
                <StatusBadge color="geekblue">
                  Escopo{' '}
                  {dashboardQuery.data?.escopo.tipo === 'SECRETARIA'
                    ? 'por secretaria'
                    : 'global'}
                </StatusBadge>
                {dashboardQuery.data?.escopo.secretaria ? (
                  <StatusBadge color="cyan">
                    {dashboardQuery.data.escopo.secretaria.sigla} -{' '}
                    {dashboardQuery.data.escopo.secretaria.nomeCompleto}
                  </StatusBadge>
                ) : null}
              </Space>
              <Text type="secondary">
                Atualizado em{' '}
                {dashboardQuery.data?.geradoEm
                  ? formatDateTime(dashboardQuery.data.geradoEm)
                  : '--'}
              </Text>
            </Space>
          }
        />

        {dashboardQuery.isError ? (
          <Alert
            type="error"
            message="Nao foi possivel carregar o dashboard."
            description="Confira se o backend esta ativo e tente atualizar o painel."
            showIcon
          />
        ) : null}

        <Card className="home-brand-card">
          <div className="home-brand-card__content">
            <div className="home-brand-card__copy">
              <Text type="secondary">Identidade institucional</Text>
              <Title level={3} style={{ marginTop: 8, marginBottom: 8 }}>
                Prefeitura Municipal de Amargosa
              </Title>
              <Paragraph style={{ marginBottom: 0 }}>
                Ambiente interno para acompanhar o patrimonio, as movimentacoes,
                as baixas e os indicadores do seu escopo de trabalho.
              </Paragraph>
            </div>
            <div className="home-brand-card__logo">
              <img src={brandLogo} alt="Logo institucional" />
            </div>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Patrimonios no escopo"
                value={dashboardQuery.data?.indicadores.patrimonioTotal ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Ativos"
                value={dashboardQuery.data?.indicadores.patrimoniosAtivos ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Em movimentacao"
                value={
                  dashboardQuery.data?.indicadores.patrimoniosEmMovimentacao ?? 0
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Baixados"
                value={dashboardQuery.data?.indicadores.patrimoniosBaixados ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={8}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Movimentacoes pendentes"
                value={
                  dashboardQuery.data?.indicadores.movimentacoesPendentes ?? 0
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={8}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Movimentacoes concluidas"
                value={
                  dashboardQuery.data?.indicadores.movimentacoesConcluidas ?? 0
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={8}>
            <Card loading={dashboardQuery.isLoading}>
              <Statistic
                title="Baixas registradas"
                value={dashboardQuery.data?.indicadores.baixasTotal ?? 0}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card
              title="Patrimonio por status"
              loading={dashboardQuery.isLoading}
            >
              <Space wrap size={[8, 8]}>
                {(dashboardQuery.data?.patrimonioPorStatus ?? []).map(
                  (item: DashboardPatrimonioStatusItem) => (
                    <StatusBadge
                      key={item.status}
                      color={getPatrimonioStatusColor(item.status)}
                    >
                      {formatItemStatus(item.status)}: {item.total}
                    </StatusBadge>
                  ),
                )}
              </Space>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              title="Movimentacoes por status"
              loading={dashboardQuery.isLoading}
            >
              <Space wrap size={[8, 8]}>
                {(dashboardQuery.data?.movimentacaoPorStatus ?? []).map(
                  (item: DashboardMovimentacaoStatusItem) => (
                    <StatusBadge
                      key={item.status}
                      color={getMovimentacaoStatusColor(item.status)}
                    >
                      {formatMovimentacaoStatus(item.status)}: {item.total}
                    </StatusBadge>
                  ),
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        <Card title="Patrimonio por secretaria" loading={dashboardQuery.isLoading}>
          <Table
            rowKey="id"
            dataSource={dashboardQuery.data?.patrimonioPorSecretaria ?? []}
            columns={patrimonioPorSecretariaColumns}
            pagination={false}
            size="small"
          />
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card title="Movimentacoes recentes" loading={dashboardQuery.isLoading}>
              <Table
                rowKey="id"
                dataSource={dashboardQuery.data?.movimentacoesRecentes ?? []}
                columns={movimentacoesRecentesColumns}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card title="Baixas recentes" loading={dashboardQuery.isLoading}>
              <Table
                rowKey="id"
                dataSource={dashboardQuery.data?.baixasRecentes ?? []}
                columns={baixasRecentesColumns}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Descriptions title="Usuario autenticado" column={1} bordered>
            <Descriptions.Item label="Nome">
              {session.user?.nome}
            </Descriptions.Item>
            <Descriptions.Item label="E-mail">
              {session.user?.email}
            </Descriptions.Item>
            <Descriptions.Item label="Perfil">
              {session.user?.perfil}
            </Descriptions.Item>
            <Descriptions.Item label="Secretaria vinculada">
              {session.user?.secretariaId ?? 'Nao vinculada'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Acoes rapidas">
          <Space wrap size={[12, 12]}>
            <Button onClick={() => void dashboardQuery.refetch()}>
              Atualizar painel
            </Button>
            {hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO) && (
              <Button type="primary" onClick={() => navigate('/patrimonios/novo')}>
                Novo patrimonio
              </Button>
            )}
            {hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO, Perfil.CHEFE_SETOR) && (
              <Button type="primary" onClick={() => navigate('/movimentacoes/nova')}>
                Nova movimentacao
              </Button>
            )}
            {hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO) && (
              <Button onClick={() => navigate('/baixas/nova')}>
                Nova baixa
              </Button>
            )}
            <Button onClick={() => navigate('/patrimonios')}>
              Consultar patrimonios
            </Button>
            <Button onClick={() => navigate('/movimentacoes')}>
              Consultar movimentacoes
            </Button>
            <Button onClick={() => navigate('/notificacoes')}>
              Notificacoes
            </Button>
            {hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO) && (
              <Button onClick={() => navigate('/relatorios')}>
                Emitir relatorio
              </Button>
            )}
            {hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO) && (
              <Button onClick={() => navigate('/importacoes/patrimonios')}>
                Importar planilha
              </Button>
            )}
            {hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO) && (
              <Button onClick={() => navigate('/auditoria')}>
                Auditoria
              </Button>
            )}
            {hasPerfil(Perfil.ADMINISTRADOR) && (
              <Button onClick={() => navigate('/usuarios')}>
                Gerenciar usuarios
              </Button>
            )}
            <Button onClick={() => navigate('/inventarios')}>
              Inventarios
            </Button>
            <Button danger onClick={handleLogout}>
              Sair
            </Button>
          </Space>
        </Card>
      </Space>
    </AppLayout>
  )
}
