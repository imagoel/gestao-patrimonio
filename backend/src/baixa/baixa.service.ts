import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MotivoBaixa,
  Prisma,
  StatusItem,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  assertCanAccessBaixa,
  assertCanManageBaixa,
  buildBaixaScopeWhere,
} from '../common/permissions/baixa.permissions';
import { PrismaService } from '../prisma/prisma.service';
import { BaixaFilterDto } from './dto/baixa-filter.dto';
import { CreateBaixaDto } from './dto/create-baixa.dto';

const patrimonioBaixaSelect = {
  id: true,
  item: true,
  tombo: true,
  secretariaAtualId: true,
  localizacaoAtual: true,
  responsavelAtualId: true,
  status: true,
  secretariaAtual: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  responsavelAtual: {
    select: {
      id: true,
      nome: true,
      setor: true,
      secretariaId: true,
      secretaria: {
        select: {
          id: true,
          sigla: true,
          nomeCompleto: true,
        },
      },
    },
  },
} satisfies Prisma.PatrimonioSelect;

const patrimonioBaixaCreateSelect = {
  ...patrimonioBaixaSelect,
  baixa: {
    select: {
      id: true,
    },
  },
} satisfies Prisma.PatrimonioSelect;

const baixaSelect = {
  id: true,
  patrimonioId: true,
  usuarioId: true,
  motivo: true,
  observacoes: true,
  baixadoEm: true,
  patrimonio: {
    select: patrimonioBaixaSelect,
  },
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
} satisfies Prisma.BaixaPatrimonialSelect;

type PatrimonioBaixaSelected = Prisma.PatrimonioGetPayload<{
  select: typeof patrimonioBaixaSelect;
}>;

type PatrimonioBaixaCreateSelected = Prisma.PatrimonioGetPayload<{
  select: typeof patrimonioBaixaCreateSelect;
}>;

type BaixaSelected = Prisma.BaixaPatrimonialGetPayload<{
  select: typeof baixaSelect;
}>;

@Injectable()
export class BaixaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions() {
    const [patrimonios, secretarias] = await this.prismaService.$transaction([
      this.prismaService.patrimonio.findMany({
        where: {
          status: {
            in: [StatusItem.ATIVO, StatusItem.INATIVO, StatusItem.EM_MANUTENCAO],
          },
          baixa: null,
        },
        orderBy: {
          tombo: 'asc',
        },
        select: patrimonioBaixaSelect,
      }),
      this.prismaService.secretaria.findMany({
        where: {
          ativo: true,
        },
        orderBy: {
          sigla: 'asc',
        },
        select: {
          id: true,
          sigla: true,
          nomeCompleto: true,
        },
      }),
    ]);

    return {
      patrimonios,
      secretarias,
      motivos: Object.values(MotivoBaixa),
    };
  }

  async findAll(filters: BaixaFilterDto, actor: AuthenticatedUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';
    const normalizedSearch = filters.search?.trim();

    const where: Prisma.BaixaPatrimonialWhereInput = {
      AND: [
        buildBaixaScopeWhere(actor),
        normalizedSearch
          ? {
              OR: [
                {
                  patrimonio: {
                    item: {
                      contains: normalizedSearch,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  patrimonio: {
                    tombo: {
                      contains: normalizedSearch,
                    },
                  },
                },
                {
                  observacoes: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},
        filters.patrimonioId
          ? {
              patrimonioId: filters.patrimonioId,
            }
          : {},
        filters.secretariaId
          ? {
              patrimonio: {
                secretariaAtualId: filters.secretariaId,
              },
            }
          : {},
        filters.motivo
          ? {
              motivo: filters.motivo,
            }
          : {},
      ],
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.baixaPatrimonial.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: baixaSelect,
      }),
      this.prismaService.baixaPatrimonial.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const baixa = await this.prismaService.baixaPatrimonial.findUnique({
      where: { id },
      select: baixaSelect,
    });

    if (!baixa) {
      throw new NotFoundException('Baixa patrimonial nao encontrada.');
    }

    assertCanAccessBaixa(actor, baixa);

    return baixa;
  }

  async create(dto: CreateBaixaDto, actor: AuthenticatedUser) {
    assertCanManageBaixa(actor);

    const patrimonio = await this.prismaService.patrimonio.findUnique({
      where: {
        id: dto.patrimonioId,
      },
      select: patrimonioBaixaCreateSelect,
    });

    if (!patrimonio) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    this.assertPatrimonioElegivelParaBaixa(patrimonio);
    const observacoes = this.normalizeOptionalText(dto.observacoes);

    return this.prismaService.$transaction(async (tx) => {
      const baixa = await tx.baixaPatrimonial.create({
        data: {
          patrimonioId: patrimonio.id,
          usuarioId: actor.id,
          motivo: dto.motivo,
          observacoes,
        },
        select: {
          id: true,
        },
      });

      const patrimonioAtualizado = await tx.patrimonio.update({
        where: {
          id: patrimonio.id,
        },
        data: {
          status: StatusItem.BAIXADO,
          updatedById: actor.id,
        },
        select: patrimonioBaixaSelect,
      });

      await tx.historicoPatrimonio.create({
        data: {
          patrimonioId: patrimonio.id,
          usuarioId: actor.id,
          baixaPatrimonialId: baixa.id,
          evento: 'BAIXA_PATRIMONIAL',
          descricao: `Baixa patrimonial registrada para o tombo ${patrimonio.tombo}.`,
          dadosAnteriores: this.buildPatrimonioSnapshot(patrimonio),
          dadosNovos: this.buildPatrimonioSnapshot(patrimonioAtualizado),
        },
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'BaixaPatrimonial',
          entidadeId: baixa.id,
          acao: 'CRIACAO',
          usuarioId: actor.id,
          dadosAnteriores: this.buildPatrimonioSnapshot(patrimonio),
          dadosNovos: this.buildBaixaSnapshot({
            id: baixa.id,
            patrimonioId: patrimonio.id,
            usuarioId: actor.id,
            motivo: dto.motivo,
            observacoes,
            baixadoEm: new Date(),
            patrimonio: patrimonioAtualizado,
            usuario: {
              id: actor.id,
              nome: actor.nome,
              email: actor.email,
              perfil: actor.perfil,
              secretariaId: actor.secretariaId,
            },
          }),
          contexto: {
            patrimonioId: patrimonio.id,
            patrimonioTombo: patrimonio.tombo,
            motivo: dto.motivo,
          },
        },
        tx,
      );

      const baixaCompleta = await tx.baixaPatrimonial.findUnique({
        where: {
          id: baixa.id,
        },
        select: baixaSelect,
      });

      if (!baixaCompleta) {
        throw new NotFoundException(
          'Baixa patrimonial nao encontrada apos criacao.',
        );
      }

      return baixaCompleta;
    });
  }

  private assertPatrimonioElegivelParaBaixa(
    patrimonio: PatrimonioBaixaCreateSelected,
  ) {
    if (patrimonio.baixa || patrimonio.status === StatusItem.BAIXADO) {
      throw new BadRequestException(
        'Este patrimonio ja possui baixa registrada.',
      );
    }

    if (patrimonio.status === StatusItem.EM_MOVIMENTACAO) {
      throw new BadRequestException(
        'Patrimonio em movimentacao nao pode ser baixado.',
      );
    }
  }

  private buildPatrimonioSnapshot(patrimonio: PatrimonioBaixaSelected) {
    return this.toJsonValue({
      id: patrimonio.id,
      item: patrimonio.item,
      tombo: patrimonio.tombo,
      secretariaAtualId: patrimonio.secretariaAtualId,
      localizacaoAtual: patrimonio.localizacaoAtual,
      responsavelAtualId: patrimonio.responsavelAtualId,
      status: patrimonio.status,
    });
  }

  private buildBaixaSnapshot(baixa: BaixaSelected) {
    return this.toJsonValue({
      id: baixa.id,
      patrimonioId: baixa.patrimonioId,
      usuarioId: baixa.usuarioId,
      motivo: baixa.motivo,
      observacoes: baixa.observacoes,
      baixadoEm: baixa.baixadoEm,
      patrimonioStatus: baixa.patrimonio.status,
      patrimonioTombo: baixa.patrimonio.tombo,
    });
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length ? normalizedValue : null;
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['baixadoEm', 'createdAt'];

    return allowedSortFields.includes(sortBy ?? '')
      ? sortBy ?? 'baixadoEm'
      : 'baixadoEm';
  }

  private toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
