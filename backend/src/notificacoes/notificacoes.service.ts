import { Injectable } from '@nestjs/common';
import { Perfil, Prisma, StatusMovimentacao } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { assertCanViewNotificacoes } from '../common/permissions/notificacoes.permissions';
import { buildMovimentacaoScopeWhere } from '../common/permissions/movimentacao.permissions';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacaoFilterDto } from './dto/notificacao-filter.dto';

const OPEN_MOVIMENTACAO_STATUSES = [
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
  StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
] as const;

const movimentacaoNotificacaoSelect = {
  id: true,
  status: true,
  solicitadoEm: true,
  confirmadoEntregaEm: true,
  confirmadoRecebimentoEm: true,
  updatedAt: true,
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
    },
  },
  secretariaOrigem: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  secretariaDestino: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
} satisfies Prisma.MovimentacaoSelect;

type MovimentacaoNotificacao = Prisma.MovimentacaoGetPayload<{
  select: typeof movimentacaoNotificacaoSelect;
}>;

@Injectable()
export class NotificacoesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(filters: NotificacaoFilterDto, actor: AuthenticatedUser) {
    assertCanViewNotificacoes(actor);

    const limit = filters.limit ?? 12;
    const where: Prisma.MovimentacaoWhereInput = {
      AND: [
        buildMovimentacaoScopeWhere(actor),
        {
          status: {
            in: [...OPEN_MOVIMENTACAO_STATUSES],
          },
        },
      ],
    };

    const [
      movimentacoes,
      pendentesEntrega,
      pendentesRecebimento,
      pendentesAprovacao,
      acoesRequeridas,
    ] = await Promise.all([
      this.prismaService.movimentacao.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        select: movimentacaoNotificacaoSelect,
      }),
      this.prismaService.movimentacao.count({
        where: {
          AND: [where, { status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA }],
        },
      }),
      this.prismaService.movimentacao.count({
        where: {
          AND: [
            where,
            { status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO },
          ],
        },
      }),
      this.prismaService.movimentacao.count({
        where: {
          AND: [
            where,
            { status: StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO },
          ],
        },
      }),
      this.countActionRequired(actor),
    ]);

    return {
      summary: {
        total: pendentesEntrega + pendentesRecebimento + pendentesAprovacao,
        actionRequired: acoesRequeridas,
        pendentesEntrega,
        pendentesRecebimento,
        pendentesAprovacao,
      },
      items: movimentacoes.map((movimentacao) =>
        this.mapMovimentacaoToNotification(movimentacao, actor),
      ),
    };
  }

  private async countActionRequired(actor: AuthenticatedUser) {
    if (
      actor.perfil === Perfil.ADMINISTRADOR ||
      actor.perfil === Perfil.TECNICO_PATRIMONIO
    ) {
      return this.prismaService.movimentacao.count({
        where: {
          status: StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
        },
      });
    }

    if (actor.perfil === Perfil.CHEFE_SETOR && actor.secretariaId) {
      return this.prismaService.movimentacao.count({
        where: {
          OR: [
            {
              secretariaOrigemId: actor.secretariaId,
              status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
            },
            {
              secretariaDestinoId: actor.secretariaId,
              status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
            },
          ],
        },
      });
    }

    return 0;
  }

  private mapMovimentacaoToNotification(
    movimentacao: MovimentacaoNotificacao,
    actor: AuthenticatedUser,
  ) {
    const secretariaAtualId = actor.secretariaId;
    const isManageUser =
      actor.perfil === Perfil.ADMINISTRADOR ||
      actor.perfil === Perfil.TECNICO_PATRIMONIO;
    const isOrigem = secretariaAtualId === movimentacao.secretariaOrigem.id;
    const isDestino = secretariaAtualId === movimentacao.secretariaDestino.id;

    if (isManageUser) {
      return this.mapManageNotification(movimentacao);
    }

    return this.mapScopedNotification(movimentacao, actor.perfil, {
      isOrigem,
      isDestino,
    });
  }

  private mapManageNotification(movimentacao: MovimentacaoNotificacao) {
    switch (movimentacao.status) {
      case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA:
        return this.buildNotificationBase(movimentacao, {
          tipo: 'ENTREGA_PENDENTE',
          severidade: 'info',
          requiresAction: false,
          titulo: 'Entrega pendente na origem',
          descricao: `O item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item} ainda aguarda confirmacao de entrega pela secretaria ${movimentacao.secretariaOrigem.sigla}.`,
          createdAt: movimentacao.solicitadoEm,
        });
      case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO:
        return this.buildNotificationBase(movimentacao, {
          tipo: 'RECEBIMENTO_PENDENTE',
          severidade: 'info',
          requiresAction: false,
          titulo: 'Recebimento pendente no destino',
          descricao: `O item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item} aguarda confirmacao de recebimento pela secretaria ${movimentacao.secretariaDestino.sigla}.`,
          createdAt:
            movimentacao.confirmadoEntregaEm ??
            movimentacao.updatedAt ??
            movimentacao.solicitadoEm,
        });
      case StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO:
      default:
        return this.buildNotificationBase(movimentacao, {
          tipo: 'ANALISE_PENDENTE',
          severidade: 'warning',
          requiresAction: true,
          titulo: 'Analise patrimonial pendente',
          descricao: `A movimentacao do item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item} aguarda validacao final do patrimonio.`,
          createdAt:
            movimentacao.confirmadoRecebimentoEm ??
            movimentacao.updatedAt ??
            movimentacao.solicitadoEm,
        });
    }
  }

  private mapScopedNotification(
    movimentacao: MovimentacaoNotificacao,
    perfil: Perfil,
    scope: {
      isOrigem: boolean;
      isDestino: boolean;
    },
  ) {
    const canAct = perfil === Perfil.CHEFE_SETOR;

    switch (movimentacao.status) {
      case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA:
        return this.buildNotificationBase(movimentacao, {
          tipo: 'ENTREGA_PENDENTE',
          severidade: scope.isOrigem && canAct ? 'warning' : 'info',
          requiresAction: scope.isOrigem && canAct,
          titulo:
            scope.isOrigem && canAct
              ? 'Confirme a entrega do item'
              : 'Movimentacao aguardando envio da origem',
          descricao:
            scope.isOrigem
              ? `O item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item} esta pronto para saida em direcao a ${movimentacao.secretariaDestino.sigla}.`
              : `A secretaria ${movimentacao.secretariaOrigem.sigla} ainda nao confirmou a entrega do item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item}.`,
          createdAt: movimentacao.solicitadoEm,
        });
      case StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO:
        return this.buildNotificationBase(movimentacao, {
          tipo: 'RECEBIMENTO_PENDENTE',
          severidade: scope.isDestino && canAct ? 'warning' : 'info',
          requiresAction: scope.isDestino && canAct,
          titulo:
            scope.isDestino && canAct
              ? 'Confirme o recebimento do item'
              : 'Movimentacao aguardando recebimento no destino',
          descricao:
            scope.isDestino
              ? `O item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item} aguarda recebimento em ${movimentacao.secretariaDestino.sigla}.`
              : `A secretaria ${movimentacao.secretariaDestino.sigla} ainda nao confirmou o recebimento do item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item}.`,
          createdAt:
            movimentacao.confirmadoEntregaEm ??
            movimentacao.updatedAt ??
            movimentacao.solicitadoEm,
        });
      case StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO:
      default:
        return this.buildNotificationBase(movimentacao, {
          tipo: 'ANALISE_PENDENTE',
          severidade: 'info',
          requiresAction: false,
          titulo: 'Movimentacao aguardando analise do patrimonio',
          descricao: `O item ${movimentacao.patrimonio.tombo} - ${movimentacao.patrimonio.item} ja passou pelas confirmacoes setoriais e aguarda validacao final.`,
          createdAt:
            movimentacao.confirmadoRecebimentoEm ??
            movimentacao.updatedAt ??
            movimentacao.solicitadoEm,
        });
    }
  }

  private buildNotificationBase(
    movimentacao: MovimentacaoNotificacao,
    payload: {
      tipo: string;
      severidade: 'info' | 'warning';
      requiresAction: boolean;
      titulo: string;
      descricao: string;
      createdAt: Date;
    },
  ) {
    return {
      id: `${movimentacao.id}:${payload.tipo}`,
      tipo: payload.tipo,
      categoria: 'MOVIMENTACAO',
      severidade: payload.severidade,
      requiresAction: payload.requiresAction,
      titulo: payload.titulo,
      descricao: payload.descricao,
      createdAt: payload.createdAt.toISOString(),
      route: `/movimentacoes/${movimentacao.id}`,
      movimentacaoId: movimentacao.id,
      patrimonioId: movimentacao.patrimonio.id,
      status: movimentacao.status,
      patrimonio: {
        id: movimentacao.patrimonio.id,
        tombo: movimentacao.patrimonio.tombo,
        item: movimentacao.patrimonio.item,
      },
      secretariaOrigem: movimentacao.secretariaOrigem,
      secretariaDestino: movimentacao.secretariaDestino,
    };
  }
}
