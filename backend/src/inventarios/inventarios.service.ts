import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Perfil,
  Prisma,
  StatusInventario,
  StatusInventarioItem,
  StatusItem,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  assertCanManageInventario,
  assertCanRegisterInventarioItem,
  assertCanViewInventario,
  canManageInventario,
} from '../common/permissions/inventario.permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { InventarioItemFilterDto } from './dto/inventario-item-filter.dto';
import { InventarioFilterDto } from './dto/inventario-filter.dto';
import { RegistrarInventarioItemDto } from './dto/registrar-inventario-item.dto';

const INVENTARIO_ELIGIBLE_PATRIMONIO_STATUSES = [
  StatusItem.ATIVO,
  StatusItem.EM_MANUTENCAO,
] as const;

const inventarioSelect = {
  id: true,
  titulo: true,
  secretariaId: true,
  status: true,
  observacoes: true,
  criadoPorId: true,
  concluidoPorId: true,
  iniciadoEm: true,
  concluidoEm: true,
  createdAt: true,
  updatedAt: true,
  secretaria: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  criadoPor: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  concluidoPor: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  _count: {
    select: {
      itens: true,
    },
  },
} satisfies Prisma.InventarioSelect;

const inventarioItemSelect = {
  id: true,
  inventarioId: true,
  patrimonioId: true,
  tomboSnapshot: true,
  itemSnapshot: true,
  localizacaoSnapshot: true,
  responsavelSnapshotNome: true,
  status: true,
  observacoes: true,
  registradoPorId: true,
  registradoEm: true,
  createdAt: true,
  updatedAt: true,
  registradoPor: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
      status: true,
      secretariaAtualId: true,
      localizacaoAtual: true,
      responsavelAtualId: true,
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
        },
      },
    },
  },
} satisfies Prisma.InventarioItemSelect;

type InventarioSelected = Prisma.InventarioGetPayload<{
  select: typeof inventarioSelect;
}>;

@Injectable()
export class InventariosService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions(actor: AuthenticatedUser) {
    const canManage = canManageInventario(actor);

    if (
      !canManage &&
      actor.perfil !== Perfil.CHEFE_SETOR &&
      actor.perfil !== Perfil.USUARIO_CONSULTA
    ) {
      throw new ForbiddenException(
        'Voce nao possui permissao para acessar inventarios.',
      );
    }

    return {
      secretarias: await this.prismaService.secretaria.findMany({
        where: {
          ativo: true,
          ...(canManage
            ? {}
            : actor.secretariaId
              ? { id: actor.secretariaId }
              : { id: '__none__' }),
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
      status: Object.values(StatusInventario),
      itemStatus: Object.values(StatusInventarioItem),
    };
  }

  async findAll(filters: InventarioFilterDto, actor: AuthenticatedUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';
    const normalizedSearch = filters.search?.trim();
    const canManage = canManageInventario(actor);

    if (
      !canManage &&
      filters.secretariaId &&
      filters.secretariaId !== actor.secretariaId
    ) {
      throw new ForbiddenException(
        'Voce nao pode consultar inventarios fora do seu escopo.',
      );
    }

    const where: Prisma.InventarioWhereInput = {
      ...(canManage
        ? {}
        : actor.secretariaId
          ? { secretariaId: actor.secretariaId }
          : { id: '__none__' }),
      ...(normalizedSearch
        ? {
            OR: [
              {
                titulo: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                secretaria: {
                  is: {
                    sigla: {
                      contains: normalizedSearch,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                secretaria: {
                  is: {
                    nomeCompleto: {
                      contains: normalizedSearch,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(filters.secretariaId ? { secretariaId: filters.secretariaId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.inventario.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: inventarioSelect,
      }),
      this.prismaService.inventario.count({ where }),
    ]);

    const resumoPorInventario = await this.buildResumoPorInventario(items);

    return {
      items: items.map((item) => ({
        ...item,
        resumo: resumoPorInventario[item.id] ?? this.buildEmptyResumo(item),
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const inventario = await this.prismaService.inventario.findUnique({
      where: { id },
      select: inventarioSelect,
    });

    if (!inventario) {
      throw new NotFoundException('Inventario nao encontrado.');
    }

    assertCanViewInventario(actor, inventario);

    const resumoPorInventario = await this.buildResumoPorInventario([inventario]);

    return {
      ...inventario,
      resumo:
        resumoPorInventario[inventario.id] ?? this.buildEmptyResumo(inventario),
    };
  }

  async findItems(
    inventarioId: string,
    filters: InventarioItemFilterDto,
    actor: AuthenticatedUser,
  ) {
    const inventario = await this.prismaService.inventario.findUnique({
      where: { id: inventarioId },
      select: {
        id: true,
        secretariaId: true,
        status: true,
      },
    });

    if (!inventario) {
      throw new NotFoundException('Inventario nao encontrado.');
    }

    assertCanViewInventario(actor, inventario);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = this.resolveItemSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'asc';
    const normalizedSearch = filters.search?.trim();

    const where: Prisma.InventarioItemWhereInput = {
      inventarioId,
      ...(normalizedSearch
        ? {
            OR: [
              {
                tomboSnapshot: {
                  contains: normalizedSearch,
                },
              },
              {
                itemSnapshot: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                localizacaoSnapshot: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                responsavelSnapshotNome: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.inventarioItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: inventarioItemSelect,
      }),
      this.prismaService.inventarioItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      inventarioStatus: inventario.status,
    };
  }

  async create(dto: CreateInventarioDto, actor: AuthenticatedUser) {
    assertCanManageInventario(actor);

    const titulo = dto.titulo.trim();
    const observacoes = this.normalizeOptionalText(dto.observacoes);

    const [secretaria, inventarioAberto, patrimoniosElegiveis] =
      await this.prismaService.$transaction([
        this.prismaService.secretaria.findUnique({
          where: { id: dto.secretariaId },
          select: {
            id: true,
            sigla: true,
            nomeCompleto: true,
            ativo: true,
          },
        }),
        this.prismaService.inventario.findFirst({
          where: {
            secretariaId: dto.secretariaId,
            status: StatusInventario.ABERTO,
          },
          select: {
            id: true,
            titulo: true,
          },
        }),
        this.prismaService.patrimonio.findMany({
          where: {
            secretariaAtualId: dto.secretariaId,
            status: {
              in: [...INVENTARIO_ELIGIBLE_PATRIMONIO_STATUSES],
            },
          },
          orderBy: {
            tombo: 'asc',
          },
          select: {
            id: true,
            tombo: true,
            item: true,
            localizacaoAtual: true,
            responsavelAtual: {
              select: {
                nome: true,
              },
            },
          },
        }),
      ]);

    if (!secretaria?.ativo) {
      throw new NotFoundException('Secretaria ativa nao encontrada.');
    }

    if (inventarioAberto) {
      throw new BadRequestException(
        `Ja existe um inventario aberto para a secretaria ${secretaria.sigla}.`,
      );
    }

    if (!patrimoniosElegiveis.length) {
      throw new BadRequestException(
        'Nao existem patrimonios ativos ou em manutencao para abrir o inventario desta secretaria.',
      );
    }

    const created = await this.prismaService.$transaction(async (prisma) => {
      const inventario = await prisma.inventario.create({
        data: {
          titulo,
          secretariaId: secretaria.id,
          observacoes,
          criadoPorId: actor.id,
        },
        select: inventarioSelect,
      });

      await prisma.inventarioItem.createMany({
        data: patrimoniosElegiveis.map((patrimonio) => ({
          inventarioId: inventario.id,
          patrimonioId: patrimonio.id,
          tomboSnapshot: patrimonio.tombo,
          itemSnapshot: patrimonio.item,
          localizacaoSnapshot: patrimonio.localizacaoAtual,
          responsavelSnapshotNome: patrimonio.responsavelAtual.nome,
        })),
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'Inventario',
          entidadeId: inventario.id,
          acao: 'CRIACAO',
          usuarioId: actor.id,
          dadosNovos: {
            titulo: inventario.titulo,
            secretariaId: inventario.secretariaId,
            totalItens: patrimoniosElegiveis.length,
            status: inventario.status,
          },
          contexto: {
            secretariaSigla: secretaria.sigla,
            secretariaNome: secretaria.nomeCompleto,
            criterioPatrimonios: INVENTARIO_ELIGIBLE_PATRIMONIO_STATUSES,
          },
        },
        prisma,
      );

      return inventario;
    });

    return {
      ...created,
      resumo: {
        totalItens: created._count.itens,
        pendentes: created._count.itens,
        localizados: 0,
        naoLocalizados: 0,
      },
    };
  }

  async registrarItem(
    inventarioId: string,
    itemId: string,
    dto: RegistrarInventarioItemDto,
    actor: AuthenticatedUser,
  ) {
    const inventario = await this.prismaService.inventario.findUnique({
      where: { id: inventarioId },
      select: {
        id: true,
        titulo: true,
        secretariaId: true,
        status: true,
      },
    });

    if (!inventario) {
      throw new NotFoundException('Inventario nao encontrado.');
    }

    assertCanRegisterInventarioItem(actor, inventario);

    if (inventario.status !== StatusInventario.ABERTO) {
      throw new BadRequestException(
        'Somente inventarios abertos permitem registro de itens.',
      );
    }

    const item = await this.prismaService.inventarioItem.findFirst({
      where: {
        id: itemId,
        inventarioId,
      },
      select: inventarioItemSelect,
    });

    if (!item) {
      throw new NotFoundException('Item de inventario nao encontrado.');
    }

    const observacoes = this.normalizeOptionalText(dto.observacoes);

    const updated = await this.prismaService.$transaction(async (prisma) => {
      const nextItem = await prisma.inventarioItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: dto.status,
          observacoes,
          registradoPorId:
            dto.status === StatusInventarioItem.PENDENTE ? null : actor.id,
          registradoEm:
            dto.status === StatusInventarioItem.PENDENTE ? null : new Date(),
        },
        select: inventarioItemSelect,
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'InventarioItem',
          entidadeId: nextItem.id,
          acao: 'REGISTRO_ITEM',
          usuarioId: actor.id,
          dadosAnteriores: {
            status: item.status,
            observacoes: item.observacoes,
            registradoPorId: item.registradoPorId,
            registradoEm: item.registradoEm,
          },
          dadosNovos: {
            status: nextItem.status,
            observacoes: nextItem.observacoes,
            registradoPorId: nextItem.registradoPorId,
            registradoEm: nextItem.registradoEm,
          },
          contexto: {
            inventarioId: inventario.id,
            inventarioTitulo: inventario.titulo,
            patrimonioId: nextItem.patrimonioId,
            tombo: nextItem.tomboSnapshot,
          },
        },
        prisma,
      );

      return nextItem;
    });

    return updated;
  }

  async concluir(id: string, actor: AuthenticatedUser) {
    assertCanManageInventario(actor);

    const inventario = await this.prismaService.inventario.findUnique({
      where: { id },
      select: inventarioSelect,
    });

    if (!inventario) {
      throw new NotFoundException('Inventario nao encontrado.');
    }

    if (inventario.status === StatusInventario.CONCLUIDO) {
      throw new BadRequestException('Este inventario ja esta concluido.');
    }

    const resumo =
      (await this.buildResumoPorInventario([inventario]))[inventario.id] ??
      this.buildEmptyResumo(inventario);

    if (resumo.pendentes > 0) {
      throw new BadRequestException(
        'Nao e possivel concluir o inventario enquanto houver itens pendentes.',
      );
    }

    const updated = await this.prismaService.$transaction(async (prisma) => {
      const inventarioConcluido = await prisma.inventario.update({
        where: { id: inventario.id },
        data: {
          status: StatusInventario.CONCLUIDO,
          concluidoPorId: actor.id,
          concluidoEm: new Date(),
        },
        select: inventarioSelect,
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'Inventario',
          entidadeId: inventarioConcluido.id,
          acao: 'CONCLUSAO',
          usuarioId: actor.id,
          dadosAnteriores: {
            status: inventario.status,
            concluidoEm: inventario.concluidoEm,
            concluidoPorId: inventario.concluidoPorId,
          },
          dadosNovos: {
            status: inventarioConcluido.status,
            concluidoEm: inventarioConcluido.concluidoEm,
            concluidoPorId: inventarioConcluido.concluidoPorId,
          },
          contexto: resumo,
        },
        prisma,
      );

      return inventarioConcluido;
    });

    return {
      ...updated,
      resumo,
    };
  }

  private async buildResumoPorInventario(items: InventarioSelected[]) {
    if (!items.length) {
      return {} as Record<
        string,
        {
          totalItens: number;
          pendentes: number;
          localizados: number;
          naoLocalizados: number;
        }
      >;
    }

    const grouped = await this.prismaService.inventarioItem.groupBy({
      by: ['inventarioId', 'status'],
      where: {
        inventarioId: {
          in: items.map((item) => item.id),
        },
      },
      _count: {
        _all: true,
      },
    });

    const resumoPorInventario = Object.fromEntries(
      items.map((item) => [item.id, this.buildEmptyResumo(item)]),
    ) as Record<
      string,
      {
        totalItens: number;
        pendentes: number;
        localizados: number;
        naoLocalizados: number;
      }
    >;

    for (const group of grouped) {
      const resumo = resumoPorInventario[group.inventarioId];

      if (!resumo) {
        continue;
      }

      if (group.status === StatusInventarioItem.PENDENTE) {
        resumo.pendentes = group._count._all;
      }

      if (group.status === StatusInventarioItem.LOCALIZADO) {
        resumo.localizados = group._count._all;
      }

      if (group.status === StatusInventarioItem.NAO_LOCALIZADO) {
        resumo.naoLocalizados = group._count._all;
      }
    }

    return resumoPorInventario;
  }

  private buildEmptyResumo(inventario: Pick<InventarioSelected, 'id' | '_count'>) {
    return {
      totalItens: inventario._count.itens,
      pendentes: 0,
      localizados: 0,
      naoLocalizados: 0,
    };
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['createdAt', 'updatedAt', 'iniciadoEm', 'titulo'];
    return allowedSortFields.includes(sortBy ?? '')
      ? (sortBy ?? 'updatedAt')
      : 'updatedAt';
  }

  private resolveItemSortBy(sortBy?: string) {
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'tomboSnapshot',
      'itemSnapshot',
      'status',
      'registradoEm',
    ];
    return allowedSortFields.includes(sortBy ?? '')
      ? (sortBy ?? 'tomboSnapshot')
      : 'tomboSnapshot';
  }
}
