import type { AuthUser } from '../types/auth.types'
import { Perfil, StatusMovimentacao } from '../types/enums'

interface MovimentacaoUxContext {
  secretariaDestinoId: string
  secretariaDestinoSigla: string
  secretariaOrigemId: string
  secretariaOrigemSigla: string
  status: StatusMovimentacao
}

type BadgeTone = 'danger' | 'default' | 'info' | 'success' | 'warning'

interface MovimentacaoNextStepInfo {
  actorLabel: string
  description: string
  title: string
  tone: BadgeTone
}

interface MovimentacaoViewerActionInfo {
  canAct: boolean
  description: string
  title: string
  tone: BadgeTone
}

export function getMovimentacaoStatusColor(status: StatusMovimentacao) {
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

export function getMovimentacaoNextStepInfo(
  context: MovimentacaoUxContext,
): MovimentacaoNextStepInfo {
  switch (context.status) {
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA:
      return {
        actorLabel: `Origem (${context.secretariaOrigemSigla})`,
        description:
          'A origem precisa registrar a entrega para liberar o recebimento no destino.',
        title: 'Confirmar entrega',
        tone: 'warning',
      }
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO:
      return {
        actorLabel: `Destino (${context.secretariaDestinoSigla})`,
        description:
          'O destino precisa confirmar o recebimento antes da validacao final do patrimonio.',
        title: 'Confirmar recebimento',
        tone: 'warning',
      }
    case StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO:
      return {
        actorLabel: 'Patrimonio',
        description:
          'A equipe de patrimonio precisa validar a movimentacao para atualizar o cadastro do bem.',
        title: 'Validacao final',
        tone: 'info',
      }
    case StatusMovimentacao.REJEITADA:
      return {
        actorLabel: 'Fluxo encerrado',
        description: 'A movimentacao foi rejeitada e nao possui mais acoes pendentes.',
        title: 'Rejeitada',
        tone: 'danger',
      }
    case StatusMovimentacao.CANCELADA:
      return {
        actorLabel: 'Fluxo encerrado',
        description: 'A movimentacao foi cancelada e nao possui mais acoes pendentes.',
        title: 'Cancelada',
        tone: 'default',
      }
    default:
      return {
        actorLabel: 'Fluxo encerrado',
        description: 'A movimentacao ja foi concluida e o cadastro do bem foi atualizado.',
        title: 'Concluida',
        tone: 'success',
      }
  }
}

export function getMovimentacaoViewerActionInfo(
  context: MovimentacaoUxContext,
  user: AuthUser | null,
): MovimentacaoViewerActionInfo {
  if (!user) {
    return {
      canAct: false,
      description: 'Entre com um usuario autenticado para executar acoes operacionais.',
      title: 'Sem acao disponivel',
      tone: 'default',
    }
  }

  const isManager =
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  const isChefeOrigem =
    user.perfil === Perfil.CHEFE_SETOR &&
    user.secretariaId === context.secretariaOrigemId
  const isChefeDestino =
    user.perfil === Perfil.CHEFE_SETOR &&
    user.secretariaId === context.secretariaDestinoId

  switch (context.status) {
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA:
      if (isManager || isChefeOrigem) {
        return {
          canAct: true,
          description:
            'Voce pode confirmar a entrega agora para liberar o recebimento no destino.',
          title: 'Sua acao: confirmar entrega',
          tone: 'warning',
        }
      }
      break
    case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO:
      if (isManager || isChefeDestino) {
        return {
          canAct: true,
          description:
            'Voce pode confirmar o recebimento agora para encaminhar a validacao final.',
          title: 'Sua acao: confirmar recebimento',
          tone: 'warning',
        }
      }
      break
    case StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO:
      if (isManager) {
        return {
          canAct: true,
          description:
            'Voce pode validar a movimentacao agora para atualizar o cadastro do patrimonio.',
          title: 'Sua acao: validar movimentacao',
          tone: 'info',
        }
      }
      break
    default:
      break
  }

  return {
    canAct: false,
    description: 'Esta movimentacao nao exige uma acao sua neste momento.',
    title: 'Sem acao pendente para voce',
    tone: 'default',
  }
}
