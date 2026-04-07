import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Input,
  Space,
} from 'antd'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { usePermissao } from '../../hooks/usePermissao'
import { movimentacaoService } from '../../services/movimentacao.service'
import { Perfil, StatusMovimentacao } from '../../types/enums'
import { formatDateTime } from '../../utils/formatters'
import { Typography } from 'antd'

const { Text } = Typography

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

  return (
    <AppLayout label="Detalhe da movimentacao">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={`Movimentacao do tombo ${movimentacao?.patrimonio.tombo ?? '--'}`}
          description="O patrimonio so muda oficialmente de secretaria, localizacao e responsavel depois da validacao final."
          actions={
            <StatusBadge color={movimentacao ? getStatusColor(movimentacao.status) : 'blue'}>
              {movimentacao?.status ?? 'Carregando'}
            </StatusBadge>
          }
        />

        <Card loading={movimentacaoQuery.isLoading}>
          {movimentacao ? (
            <Descriptions title="Resumo da movimentacao" column={1} bordered>
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
