import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StatusItem,
  StatusMovimentacao,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  assertCanViewDashboard,
  buildDashboardBaixaWhere,
  isDashboardGlobalScope,
} from '../common/permissions/dashboard.permissions';
import { buildMovimentacaoScopeWhere } from '../common/permissions/movimentacao.permissions';
import { buildPatrimonioScopeWhere } from '../common/permissions/patrimonio.permissions';
import { PrismaService } from '../prisma/prisma.service';

const PENDING_MOVIMENTACAO_STATUSES = [
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
  StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
] as const;

const secretariaSelect = {
  id: true,
  sigla: true,
  nomeCompleto: true,
} satisfies Prisma.SecretariaSelect;

const movimentacaoRecenteSelect = {
  id: true,
  status: true,
  solicitadoEm: true,
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
    },
  },
  secretariaOrigem: {
    select: secretariaSelect,
  },
  secretariaDestino: {
    select: secretariaSelect,
  },
} satisfies Prisma.MovimentacaoSelect;

const baixaRecenteSelect = {
  id: true,
  motivo: true,
  baixadoEm: true,
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
      secretariaAtual: {
        select: secretariaSelect,
      },
    },
  },
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
} satisfies Prisma.BaixaPatrimonialSelect;

type PatrimonioStatusBucket = {
  status: StatusItem;
  total: number;
};

type MovimentacaoStatusBucket = {
  status: StatusMovimentacao;
  total: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOverview(actor: AuthenticatedUser) {
    assertCanViewDashboard(actor);

    const patrimonioWhere = buildPatrimonioScopeWhere(actor);
    const movimentacaoWhere = buildMovimentacaoScopeWhere(actor);
    const baixaWhere = buildDashboardBaixaWhere(actor);

    const [
      patrimonioTotal,
      patrimoniosAtivos,
      patrimoniosEmMovimentacao,
      patrimoniosBaixados,
      movimentacoesPendentes,
      movimentacoesConcluidas,
      baixasTotal,
      patrimonioPorStatusRaw,
      movimentacaoPorStatusRaw,
      patrimonioPorSecretariaRaw,
      movimentacoesRecentes,
      baixasRecentes,
      secretariaEscopo,
    ] = await Promise.all([
      this.prismaService.patrimonio.count({
        where: patrimonioWhere,
      }),
      this.prismaService.patrimonio.count({
        where: {
          AND: [patrimonioWhere, { status: StatusItem.ATIVO }],
        },
      }),
      this.prismaService.patrimonio.count({
        where: {
          AND: [patrimonioWhere, { status: StatusItem.EM_MOVIMENTACAO }],
        },
      }),
      this.prismaService.patrimonio.count({
        where: {
          AND: [patrimonioWhere, { status: StatusItem.BAIXADO }],
        },
      }),
      this.prismaService.movimentacao.count({
        where: {
          AND: [
            movimentacaoWhere,
            {
              status: {
                in: [...PENDING_MOVIMENTACAO_STATUSES],
              },
            },
          ],
        },
      }),
      this.prismaService.movimentacao.count({
        where: {
          AND: [movimentacaoWhere, { status: StatusMovimentacao.CONCLUIDA }],
        },
      }),
      this.prismaService.baixaPatrimonial.count({
        where: baixaWhere,
      }),
      this.prismaService.patrimonio.groupBy({
        by: ['status'],
        where: patrimonioWhere,
        _count: {
          _all: true,
        },
      }),
      this.prismaService.movimentacao.groupBy({
        by: ['status'],
        where: movimentacaoWhere,
        _count: {
          _all: true,
        },
      }),
      this.prismaService.patrimonio.groupBy({
        by: ['secretariaAtualId'],
        where: patrimonioWhere,
        _count: {
          _all: true,
        },
      }),
      this.prismaService.movimentacao.findMany({
        where: movimentacaoWhere,
        orderBy: {
          solicitadoEm: 'desc',
        },
        take: 5,
        select: movimentacaoRecenteSelect,
      }),
      this.prismaService.baixaPatrimonial.findMany({
        where: baixaWhere,
        orderBy: {
          baixadoEm: 'desc',
        },
        take: 5,
        select: baixaRecenteSelect,
      }),
      this.resolveSecretariaEscopo(actor),
    ]);

    const patrimonioPorSecretaria =
      await this.buildPatrimonioPorSecretaria(patrimonioPorSecretariaRaw);

    return {
      geradoEm: new Date().toISOString(),
      escopo: {
        tipo: isDashboardGlobalScope(actor) ? 'GLOBAL' : 'SECRETARIA',
        secretaria: secretariaEscopo,
      },
      indicadores: {
        patrimonioTotal,
        patrimoniosAtivos,
        patrimoniosEmMovimentacao,
        patrimoniosBaixados,
        movimentacoesPendentes,
        movimentacoesConcluidas,
        baixasTotal,
      },
      patrimonioPorStatus: this.buildPatrimonioStatusBuckets(
        patrimonioPorStatusRaw,
      ),
      movimentacaoPorStatus: this.buildMovimentacaoStatusBuckets(
        movimentacaoPorStatusRaw,
      ),
      patrimonioPorSecretaria,
      movimentacoesRecentes,
      baixasRecentes,
    };
  }

  private async resolveSecretariaEscopo(actor: AuthenticatedUser) {
    if (isDashboardGlobalScope(actor) || !actor.secretariaId) {
      return null;
    }

    return this.prismaService.secretaria.findUnique({
      where: {
        id: actor.secretariaId,
      },
      select: secretariaSelect,
    });
  }

  private async buildPatrimonioPorSecretaria(
    buckets: Array<{
      secretariaAtualId: string;
      _count: {
        _all: number;
      };
    }>,
  ) {
    const secretariaIds = buckets.map((item) => item.secretariaAtualId);

    if (!secretariaIds.length) {
      return [];
    }

    const secretarias = await this.prismaService.secretaria.findMany({
      where: {
        id: {
          in: secretariaIds,
        },
      },
      select: secretariaSelect,
    });

    const secretariaMap = new Map(secretarias.map((item) => [item.id, item]));

    return buckets
      .map((bucket) => {
        const secretaria = secretariaMap.get(bucket.secretariaAtualId);

        if (!secretaria) {
          return null;
        }

        return {
          ...secretaria,
          total: bucket._count._all,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => {
        if (right.total !== left.total) {
          return right.total - left.total;
        }

        return left.sigla.localeCompare(right.sigla);
      });
  }

  private buildPatrimonioStatusBuckets(
    buckets: Array<{
      status: StatusItem;
      _count: {
        _all: number;
      };
    }>,
  ): PatrimonioStatusBucket[] {
    const totals = new Map(
      buckets.map((item) => [item.status, item._count._all]),
    );

    return Object.values(StatusItem).map((status) => ({
      status,
      total: totals.get(status) ?? 0,
    }));
  }

  private buildMovimentacaoStatusBuckets(
    buckets: Array<{
      status: StatusMovimentacao;
      _count: {
        _all: number;
      };
    }>,
  ): MovimentacaoStatusBucket[] {
    const totals = new Map(
      buckets.map((item) => [item.status, item._count._all]),
    );

    return Object.values(StatusMovimentacao).map((status) => ({
      status,
      total: totals.get(status) ?? 0,
    }));
  }
}
