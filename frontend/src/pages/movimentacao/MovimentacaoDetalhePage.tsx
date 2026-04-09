import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Input,
  Space,
  Steps,
  Tag,
} from 'antd'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { usePermissao } from '../../hooks/usePermissao'
import { movimentacaoService } from '../../services/movimentacao.service'
import { Perfil, StatusMovimentacao } from '../../types/enums'
import { formatDateTime, formatMovimentacaoStatus } from '../../utils/formatters'
import { Typography } from 'antd'
import {
  getMovimentacaoNextStepInfo,
  getMovimentacaoStatusColor,
  getMovimentacaoViewerActionInfo,
} from '../../utils/movimentacao-ui'

const { Text } = Typography

function getStepStatus(
  movimentacaoStatus: StatusMovimentacao,
  stepIndex: number,
): 'finish' | 'process' | 'wait' | 'error' {
  const terminalSteps: Record<StatusMovimentacao, number> = {
    [StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA]: 0,
    [StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO]: 1,
    [StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO]: 2,
    [StatusMovimentacao.APROVADA]: 3,
    [StatusMovimentacao.CONCLUIDA]: 3,
    [StatusMovimentacao.REJEITADA]: -1,
    [StatusMovimentacao.CANCELADA]: -1,
  }

  if (
    movimentacaoStatus === StatusMovimentacao.REJEITADA ||
    movimentacaoStatus === StatusMovimentacao.CANCELADA
  ) {
    return stepIndex < 3 ? 'finish' : 'error'
  }

  const currentStep = terminalSteps[movimentacaoStatus] ?? 0

  if (stepIndex < currentStep) return 'finish'
  if (stepIndex === currentStep) return 'process'
  return 'wait'
}

export function MovimentacaoDetalhePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const { message } = AntdApp.useApp()
  const { session } = useAuth()
  const { hasPerfil } = usePermissao()
  const [justificativaRejeicao, setJustificativaRejeicao] = useState('')

  const movimentacaoQuery = useQuery({
    queryKey: ['movimentacao-detail', id],
    queryFn: () => movimentacaoService.findOne(id as string),
    enabled: Boolean(id),
  })

  const refreshAfterAction = async () => {
    await queryClient.invalidateQueries({ queryKey: ['movimentacao-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['movimentacoes-list'] })
    await queryClient.invalidateQueries({ queryKey: ['movimentacoes-options'] })
    await queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] })
    await queryClient.invalidateQueries({ queryKey: ['patrimonios-options'] })
  }

  const confirmarEntregaMutation = useMutation({
    mutationFn: () => movimentacaoService.confirmarEntrega(id as string),
    onSuccess: async () => {
      message.success('Entrega confirmada com sucesso.')
      await refreshAfterAction()
    },
    onError: () => {
      message.error('Nao foi possivel confirmar a entrega.')
    },
  })

  const confirmarRecebimentoMutation = useMutation({
    mutationFn: () => movimentacaoService.confirmarRecebimento(id as string),
    onSuccess: async () => {
      message.success('Recebimento confirmado com sucesso.')
      await refreshAfterAction()
    },
    onError: () => {
      message.error('Nao foi possivel confirmar o recebimento.')
    },
  })

  const aprovarMutation = useMutation({
    mutationFn: () =>
      movimentacaoService.analisar(id as string, {
        decisao: 'APROVAR',
      }),
    onSuccess: async () => {
      message.success('Movimentacao aprovada e concluida com sucesso.')
      await refreshAfterAction()
    },
    onError: () => {
      message.error('Nao foi possivel aprovar a movimentacao.')
    },
  })

  const rejeitarMutation = useMutation({
    mutationFn: () =>
      movimentacaoService.analisar(id as string, {
        decisao: 'REJEITAR',
        justificativaRejeicao,
      }),
    onSuccess: async () => {
      message.success('Movimentacao rejeitada com sucesso.')
      setJustificativaRejeicao('')
      await refreshAfterAction()
    },
    onError: () => {
      message.error('Nao foi possivel rejeitar a movimentacao.')
    },
  })

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

  const movimentacao = movimentacaoQuery.data
  const currentUser = session.user
  const isManager = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const isChefeOrigem =
    hasPerfil(Perfil.CHEFE_SETOR) &&
    currentUser?.secretariaId === movimentacao?.secretariaOrigemId
  const isChefeDestino =
    hasPerfil(Perfil.CHEFE_SETOR) &&
    currentUser?.secretariaId === movimentacao?.secretariaDestinoId

  const canConfirmarEntrega =
    Boolean(movimentacao) &&
    movimentacao?.status === StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA &&
    (isManager || isChefeOrigem)
  const canConfirmarRecebimento =
    Boolean(movimentacao) &&
    movimentacao?.status === StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO &&
    (isManager || isChefeDestino)
  const canAnalisar =
    Boolean(movimentacao) &&
    movimentacao?.status === StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO &&
    isManager

  const nextStepInfo = movimentacao
    ? getMovimentacaoNextStepInfo({
        status: movimentacao.status,
        secretariaOrigemId: movimentacao.secretariaOrigemId,
        secretariaOrigemSigla: movimentacao.secretariaOrigem.sigla,
        secretariaDestinoId: movimentacao.secretariaDestinoId,
        secretariaDestinoSigla: movimentacao.secretariaDestino.sigla,
      })
    : null
  const viewerActionInfo = movimentacao
    ? getMovimentacaoViewerActionInfo(
        {
          status: movimentacao.status,
          secretariaOrigemId: movimentacao.secretariaOrigemId,
          secretariaOrigemSigla: movimentacao.secretariaOrigem.sigla,
          secretariaDestinoId: movimentacao.secretariaDestinoId,
          secretariaDestinoSigla: movimentacao.secretariaDestino.sigla,
        },
        session.user,
      )
    : null

  const timelineItems = useMemo(() => {
    if (!movimentacao) return []

    const isRejected =
      movimentacao.status === StatusMovimentacao.REJEITADA
    const isCancelled =
      movimentacao.status === StatusMovimentacao.CANCELADA

    return [
      {
        title: 'Solicitacao',
        description: (
          <Space direction="vertical" size={2}>
            <Text>
              {movimentacao.solicitante.nome} - {movimentacao.solicitante.perfil}
            </Text>
            <Text type="secondary">
              {formatDateTime(movimentacao.solicitadoEm)}
            </Text>
            {movimentacao.motivo && (
              <Text type="secondary">Motivo: {movimentacao.motivo}</Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Confirmacao de entrega',
        description: movimentacao.confirmadoEntregaPor ? (
          <Space direction="vertical" size={2}>
            <Text>
              {movimentacao.confirmadoEntregaPor.nome} -{' '}
              {movimentacao.confirmadoEntregaPor.perfil}
            </Text>
            <Text type="secondary">
              {formatDateTime(movimentacao.confirmadoEntregaEm as string)}
            </Text>
          </Space>
        ) : (
          <Tag color="orange">Aguardando origem ({movimentacao.secretariaOrigem.sigla})</Tag>
        ),
      },
      {
        title: 'Confirmacao de recebimento',
        description: movimentacao.confirmadoRecebimentoPor ? (
          <Space direction="vertical" size={2}>
            <Text>
              {movimentacao.confirmadoRecebimentoPor.nome} -{' '}
              {movimentacao.confirmadoRecebimentoPor.perfil}
            </Text>
            <Text type="secondary">
              {formatDateTime(movimentacao.confirmadoRecebimentoEm as string)}
            </Text>
          </Space>
        ) : (
          <Tag color="gold">
            Aguardando destino ({movimentacao.secretariaDestino.sigla})
          </Tag>
        ),
      },
      {
        title: 'Validacao final do patrimonio',
        description: movimentacao.validadoPor ? (
          <Space direction="vertical" size={2}>
            <Text>
              {movimentacao.validadoPor.nome} - {movimentacao.validadoPor.perfil}
            </Text>
            <Text type="secondary">
              {formatDateTime(movimentacao.validadoEm as string)}
            </Text>
          </Space>
        ) : movimentacao.justificativaRejeicao ? (
          <Space direction="vertical" size={2}>
            <Tag color="red">Rejeitada</Tag>
            <Text type="danger">
              Justificativa: {movimentacao.justificativaRejeicao}
            </Text>
          </Space>
        ) : isRejected || isCancelled ? (
          <Tag color="default">{isRejected ? 'Rejeitada' : 'Cancelada'}</Tag>
        ) : (
          <Tag color="blue">Aguardando patrimonio</Tag>
        ),
      },
    ]
  }, [movimentacao])

  return (
    <AppLayout label="Detalhe da movimentacao">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={`Movimentacao do tombo ${movimentacao?.patrimonio.tombo ?? '--'}`}
          description="O patrimonio so muda oficialmente de secretaria, localizacao e responsavel depois da validacao final."
          actions={
            <StatusBadge
              color={movimentacao ? getMovimentacaoStatusColor(movimentacao.status) : 'blue'}
            >
              {movimentacao ? formatMovimentacaoStatus(movimentacao.status) : 'Carregando'}
            </StatusBadge>
          }
        />

        {movimentacaoQuery.isError ? (
          <Alert
            showIcon
            type="error"
            message="Nao foi possivel carregar os dados desta movimentacao."
          />
        ) : null}

        {movimentacao ? (
          <Card>
            <Alert
              showIcon
              type={viewerActionInfo?.canAct ? 'warning' : nextStepInfo?.tone === 'danger' ? 'error' : 'info'}
              message={viewerActionInfo?.canAct ? viewerActionInfo.title : nextStepInfo?.title}
              description={
                viewerActionInfo?.canAct
                  ? viewerActionInfo.description
                  : `${nextStepInfo?.description} Responsavel atual: ${nextStepInfo?.actorLabel}.`
              }
            />
          </Card>
        ) : null}

        <Card loading={movimentacaoQuery.isLoading}>
          <Steps
            direction="horizontal"
            current={
              movimentacao
                ? (() => {
                    const s = movimentacao.status
                    if (s === StatusMovimentacao.REJEITADA || s === StatusMovimentacao.CANCELADA) return 3
                    if (s === StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA) return 0
                    if (s === StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO) return 1
                    if (s === StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO) return 2
                    return 3
                  })()
                : 0
            }
            status={
              movimentacao?.status === StatusMovimentacao.REJEITADA ||
              movimentacao?.status === StatusMovimentacao.CANCELADA
                ? 'error'
                : 'process'
            }
            items={timelineItems.map((item) => ({
              title: item.title,
              description: item.description,
              status: movimentacao
                ? getStepStatus(movimentacao.status, timelineItems.indexOf(item))
                : 'wait',
            }))}
            style={{ marginBottom: 24 }}
          />
        </Card>

        <Card loading={movimentacaoQuery.isLoading}>
          {movimentacao ? (
            <Descriptions title="Dados da solicitacao" column={1} bordered>
              <Descriptions.Item label="Item">
                {movimentacao.patrimonio.item}
              </Descriptions.Item>
              <Descriptions.Item label="Motivo">
                {movimentacao.motivo}
              </Descriptions.Item>
              <Descriptions.Item label="Observacoes">
                {movimentacao.observacoes ?? 'Nao informadas'}
              </Descriptions.Item>
              <Descriptions.Item label="Origem">
                {movimentacao.secretariaOrigem.sigla} - {movimentacao.localizacaoOrigem}
              </Descriptions.Item>
              <Descriptions.Item label="Responsavel de origem">
                {movimentacao.responsavelOrigem.nome} -{' '}
                {movimentacao.responsavelOrigem.setor}
              </Descriptions.Item>
              <Descriptions.Item label="Destino">
                {movimentacao.secretariaDestino.sigla} - {movimentacao.localizacaoDestino}
              </Descriptions.Item>
              <Descriptions.Item label="Responsavel de destino">
                {movimentacao.responsavelDestino
                  ? `${movimentacao.responsavelDestino.nome} - ${movimentacao.responsavelDestino.setor}`
                  : 'Mantem o responsavel atual'}
              </Descriptions.Item>
              <Descriptions.Item label="Solicitante">
                {movimentacao.solicitante.nome} - {movimentacao.solicitante.perfil}
              </Descriptions.Item>
              <Descriptions.Item label="Solicitado em">
                {formatDateTime(movimentacao.solicitadoEm)}
              </Descriptions.Item>
              <Descriptions.Item label="Entrega confirmada">
                {movimentacao.confirmadoEntregaPor
                  ? `${movimentacao.confirmadoEntregaPor.nome} em ${formatDateTime(
                      movimentacao.confirmadoEntregaEm as string,
                    )}`
                  : 'Pendente'}
              </Descriptions.Item>
              <Descriptions.Item label="Recebimento confirmado">
                {movimentacao.confirmadoRecebimentoPor
                  ? `${movimentacao.confirmadoRecebimentoPor.nome} em ${formatDateTime(
                      movimentacao.confirmadoRecebimentoEm as string,
                    )}`
                  : 'Pendente'}
              </Descriptions.Item>
              <Descriptions.Item label="Validacao final">
                {movimentacao.validadoPor
                  ? `${movimentacao.validadoPor.nome} em ${formatDateTime(
                      movimentacao.validadoEm as string,
                    )}`
                  : 'Pendente'}
              </Descriptions.Item>
              <Descriptions.Item label="Justificativa da rejeicao">
                {movimentacao.justificativaRejeicao ?? 'Nao se aplica'}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>

        {canConfirmarEntrega ? (
          <Card>
            <Space direction="vertical" size="middle">
              <Text>
                A entrega deve ser confirmada pela origem antes do recebimento
                no destino.
              </Text>
              <Button
                type="primary"
                loading={confirmarEntregaMutation.isPending}
                onClick={() => {
                  void confirmarEntregaMutation.mutateAsync()
                }}
              >
                Confirmar entrega
              </Button>
            </Space>
          </Card>
        ) : null}

        {canConfirmarRecebimento ? (
          <Card>
            <Space direction="vertical" size="middle">
              <Text>
                O destino confirma que recebeu o item antes da validacao final
                do patrimonio.
              </Text>
              <Button
                type="primary"
                loading={confirmarRecebimentoMutation.isPending}
                onClick={() => {
                  void confirmarRecebimentoMutation.mutateAsync()
                }}
              >
                Confirmar recebimento
              </Button>
            </Space>
          </Card>
        ) : null}

        {canAnalisar ? (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Text>
                A aprovacao conclui a movimentacao e atualiza o patrimonio. A
                rejeicao exige justificativa e devolve o item ao estado ativo.
              </Text>
              <Button
                type="primary"
                loading={aprovarMutation.isPending}
                onClick={() => {
                  void aprovarMutation.mutateAsync()
                }}
              >
                Aprovar e concluir
              </Button>
              <Input.TextArea
                rows={4}
                placeholder="Justificativa para rejeicao"
                value={justificativaRejeicao}
                onChange={(event) => {
                  setJustificativaRejeicao(event.target.value)
                }}
              />
              <Button
                danger
                loading={rejeitarMutation.isPending}
                onClick={() => {
                  if (justificativaRejeicao.trim().length < 5) {
                    message.error(
                      'Informe uma justificativa de rejeicao com ao menos 5 caracteres.',
                    )
                    return
                  }

                  void rejeitarMutation.mutateAsync()
                }}
              >
                Rejeitar movimentacao
              </Button>
            </Space>
          </Card>
        ) : null}

        <Space>
          <Button onClick={() => navigate('/movimentacoes')}>Voltar</Button>
        </Space>
      </Space>
    </AppLayout>
  )
}
