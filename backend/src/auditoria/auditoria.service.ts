import { Injectable } from '@nestjs/common';
import { Prisma, Auditoria } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { assertCanViewAuditoria } from '../common/permissions/auditoria.permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaFilterDto } from './dto/auditoria-filter.dto';

export interface RegistrarAuditoriaInput {
  entidade: string;
  entidadeId: string;
  acao: string;
  usuarioId?: string | null;
  dadosAnteriores?: Prisma.InputJsonValue;
  dadosNovos?: Prisma.InputJsonValue;
  contexto?: Prisma.InputJsonValue;
}

const auditoriaSelect = {
  id: true,
  entidade: true,
  entidadeId: true,
  acao: true,
  usuarioId: true,
  dadosAnteriores: true,
  dadosNovos: true,
  contexto: true,
  createdAt: true,
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
} satisfies Prisma.AuditoriaSelect;

@Injectable()
export class AuditoriaService {
  constructor(private readonly prismaService: PrismaService) {}

  async registrar(
    data: RegistrarAuditoriaInput,
    prismaClient:
      | PrismaService
      | Prisma.TransactionClient = this.prismaService,
  ): Promise<Auditoria> {
    return prismaClient.auditoria.create({
      data: {
        entidade: data.entidade,
        entidadeId: data.entidadeId,
        acao: data.acao,
        usuarioId: data.usuarioId ?? null,
        dadosAnteriores: data.dadosAnteriores,
        dadosNovos: data.dadosNovos,
        contexto: data.contexto,
      },
    });
  }

  async findOptions(actor: AuthenticatedUser) {
    assertCanViewAuditoria(actor);

    const [entidades, acoes, usuarios] = await this.prismaService.$transaction([
      this.prismaService.auditoria.findMany({
        distinct: ['entidade'],
        orderBy: {
          entidade: 'asc',
        },
        select: {
          entidade: true,
        },
      }),
      this.prismaService.auditoria.findMany({
        distinct: ['acao'],
        orderBy: {
          acao: 'asc',
        },
        select: {
          acao: true,
        },
      }),
      this.prismaService.usuario.findMany({
        where: {
          auditorias: {
            some: {},
          },
        },
        orderBy: {
          nome: 'asc',
        },
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
          secretariaId: true,
        },
      }),
    ]);

    return {
      entidades: entidades.map((item) => item.entidade),
      acoes: acoes.map((item) => item.acao),
      usuarios,
    };
  }

  async findAll(filters: AuditoriaFilterDto, actor: AuthenticatedUser) {
    assertCanViewAuditoria(actor);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';
    const normalizedSearch = filters.search?.trim();

    const where: Prisma.AuditoriaWhereInput = {
      AND: [
        normalizedSearch
          ? {
              OR: [
                {
                  entidade: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  entidadeId: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  acao: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  usuario: {
                    is: {
                      nome: {
                        contains: normalizedSearch,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
                {
                  usuario: {
                    is: {
                      email: {
                        contains: normalizedSearch,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {},
        filters.entidade
          ? {
              entidade: filters.entidade,
            }
          : {},
        filters.acao
          ? {
              acao: filters.acao,
            }
          : {},
        filters.usuarioId
          ? {
              usuarioId: filters.usuarioId,
            }
          : {},
      ],
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.auditoria.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: auditoriaSelect,
      }),
      this.prismaService.auditoria.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['createdAt', 'entidade', 'acao'];

    return allowedSortFields.includes(sortBy ?? '')
      ? sortBy ?? 'createdAt'
      : 'createdAt';
  }
}
