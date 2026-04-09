import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Perfil,
  Prisma,
  StatusItem,
  StatusMovimentacao,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  assertCanAccessMovimentacao,
  assertCanConfirmarEntrega,
  assertCanConfirmarRecebimento,
  assertCanCreateMovimentacao,
  assertCanManageMovimentacao,
  buildMovimentacaoScopeWhere,
  canManageMovimentacao,
} from '../common/permissions/movimentacao.permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AnalisarMovimentacaoDto } from './dto/analisar-movimentacao.dto';
import { ConfirmarEntregaDto } from './dto/confirmar-entrega.dto';
import { ConfirmarRecebimentoDto } from './dto/confirmar-recebimento.dto';
import { CreateMovimentacaoDto } from './dto/create-movimentacao.dto';
import { MovimentacaoFilterDto } from './dto/movimentacao-filter.dto';

const OPEN_MOVEMENT_STATUSES = [
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
  StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
] as const;

const patrimonioMovimentacaoSelect = {
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

const movimentacaoSelect = {
  id: true,
  patrimonioId: true,
  secretariaOrigemId: true,
  localizacaoOrigem: true,
  secretariaDestinoId: true,
  localizacaoDestino: true,
  responsavelOrigemId: true,
  responsavelDestinoId: true,
  solicitanteId: true,
  motivo: true,
  observacoes: true,
  status: true,
  solicitadoEm: true,
  confirmadoEntregaPorId: true,
  confirmadoEntregaEm: true,
  confirmadoRecebimentoPorId: true,
  confirmadoRecebimentoEm: true,
  validadoPorId: true,
  validadoEm: true,
  justificativaRejeicao: true,
  createdAt: true,
  updatedAt: true,
  patrimonio: {
    select: patrimonioMovimentacaoSelect,
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
  responsavelOrigem: {
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
  responsavelDestino: {
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
  solicitante: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  confirmadoEntregaPor: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  confirmadoRecebimentoPor: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  validadoPor: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
} satisfies Prisma.MovimentacaoSelect;

type PatrimonioMovimentacaoSelected = Prisma.PatrimonioGetPayload<{
  select: typeof patrimonioMovimentacaoSelect;
}>;

type MovimentacaoSelected = Prisma.MovimentacaoGetPayload<{
  select: typeof movimentacaoSelect;
}>;

@Injectable()
export class MovimentacaoService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions(actor: AuthenticatedUser) {
    const canManage = canManageMovimentacao(actor);
    const patrimonioWhere: Prisma.PatrimonioWhereInput =
      canManage || actor.perfil === Perfil.CHEFE_SETOR
        ? {
            status: StatusItem.ATIVO,
            ...(canManage ? {} : { secretariaAtualId: actor.secretariaId ?? '__none__' }),
          }
        : {
            id: '__none__',
          };

    const [patrimonios, secretarias, responsaveis] =
      await this.prismaService.$transaction([
        this.prismaService.patrimonio.findMany({
          where: patrimonioWhere,
          orderBy: [
            {
              tombo: 'asc',
            },
          ],
          select: patrimonioMovimentacaoSelect,
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
        this.prismaService.responsavel.findMany({
          where: {
            ativo: true,
          },
          orderBy: {
            nome: 'asc',
          },
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
        }),
      ]);

    return {
      patrimonios,
      secretarias,
      responsaveis,
      status: Object.values(StatusMovimentacao),
    };
  }

  async findAll(filters: MovimentacaoFilterDto, actor: AuthenticatedUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';
    const normalizedSearch = filters.search?.trim();

    const where: Prisma.MovimentacaoWhereInput = {
      AND: [
        buildMovimentacaoScopeWhere(actor),
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
                  motivo: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  localizacaoOrigem: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  localizacaoDestino: {
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
        filters.status
          ? {
              status: filters.status,
            }
          : {},
        filters.secretariaId
          ? {
              OR: [
                {
                  secretariaOrigemId: filters.secretariaId,
                },
                {
                  secretariaDestinoId: filters.secretariaId,
                },
              ],
            }
          : {},
      ],
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.movimentacao.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: movimentacaoSelect,
      }),
      this.prismaService.movimentacao.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const movimentacao = await this.prismaService.movimentacao.findUnique({
      where: { id },
      select: movimentacaoSelect,
    });

    if (!movimentacao) {
      throw new NotFoundException('Movimentacao nao encontrada.');
    }

    assertCanAccessMovimentacao(actor, movimentacao);

    return movimentacao;
  }

  async create(dto: CreateMovimentacaoDto, actor: AuthenticatedUser) {
    const patrimonio = await this.prismaService.patrimonio.findUnique({
      where: {
        id: dto.patrimonioId,
      },
      select: patrimonioMovimentacaoSelect,
    });

    if (!patrimonio) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    assertCanCreateMovimentacao(actor, patrimonio);
    this.assertPatrimonioDisponivel(patrimonio);

    const localizacaoDestino = this.normalizeRequiredText(
      dto.localizacaoDestino,
      'Localizacao de destino',
      2,
    );
    const motivo = this.normalizeRequiredText(dto.motivo, 'Motivo', 5);
    const observacoes = this.normalizeOptionalText(dto.observacoes);

    await this.ensureNoOpenMovimentacao(patrimonio.id);
    await this.ensureSecretariaAtiva(dto.secretariaDestinoId);

    const responsavelDestinoId = await this.resolveResponsavelDestinoId({
      secretariaDestinoId: dto.secretariaDestinoId,
      responsavelDestinoId: dto.responsavelDestinoId,
      patrimonio,
    });

    const sameDestination =
      dto.secretariaDestinoId === patrimonio.secretariaAtualId &&
      localizacaoDestino === patrimonio.localizacaoAtual &&
      responsavelDestinoId === patrimonio.responsavelAtualId;

    if (sameDestination) {
      throw new BadRequestException(
        'Origem e destino da movimentacao nao podem ser iguais.',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      const movimentacao = await tx.movimentacao.create({
        data: {
          patrimonioId: patrimonio.id,
          secretariaOrigemId: patrimonio.secretariaAtualId,
          localizacaoOrigem: patrimonio.localizacaoAtual,
          secretariaDestinoId: dto.secretariaDestinoId,
          localizacaoDestino,
          responsavelOrigemId: patrimonio.responsavelAtualId,
          responsavelDestinoId,
          solicitanteId: actor.id,
          motivo,
          observacoes,
          status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
        },
        select: movimentacaoSelect,
      });

      await tx.patrimonio.update({
        where: {
          id: patrimonio.id,
        },
        data: {
          status: StatusItem.EM_MOVIMENTACAO,
          updatedById: actor.id,
        },
      });

      await tx.historicoPatrimonio.create({
        data: {
          patrimonioId: patrimonio.id,
          usuarioId: actor.id,
          movimentacaoId: movimentacao.id,
          evento: 'MOVIMENTACAO_SOLICITADA',
          descricao: `Movimentacao solicitada do tombo ${patrimonio.tombo} para ${movimentacao.secretariaDestino.sigla}.`,
          dadosAnteriores: this.buildPatrimonioSnapshot(patrimonio),
          dadosNovos: this.buildMovimentacaoSnapshot(movimentacao),
        },
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'Movimentacao',
          entidadeId: movimentacao.id,
          acao: 'CRIACAO',
          usuarioId: actor.id,
          dadosNovos: this.buildMovimentacaoSnapshot(movimentacao),
          contexto: {
            solicitanteId: actor.id,
            patrimonioId: patrimonio.id,
            patrimonioTombo: patrimonio.tombo,
          },
        },
        tx,
      );

      return movimentacao;
    });
  }

  async confirmarEntrega(
    id: string,
    dto: ConfirmarEntregaDto,
    actor: AuthenticatedUser,
  ) {
    const movimentacao = await this.getMovimentacaoOrFail(id);

    assertCanConfirmarEntrega(actor, movimentacao);
    this.assertStatusAtual(
      movimentacao,
      StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
      'A entrega so pode ser confirmada quando a movimentacao estiver aguardando confirmacao de entrega.',
    );

    const observacoes = this.normalizeOptionalText(dto.observacoes);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.movimentacao.update({
        where: { id },
        data: {
          status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
          confirmadoEntregaPorId: actor.id,
          confirmadoEntregaEm: new Date(),
        },
        select: movimentacaoSelect,
      });

      await tx.historicoPatrimonio.create({
        data: {
          patrimonioId: updated.patrimonioId,
          usuarioId: actor.id,
          movimentacaoId: updated.id,
          evento: 'MOVIMENTACAO_ENTREGA_CONFIRMADA',
          descricao: `Entrega confirmada para a movimentacao do tombo ${updated.patrimonio.tombo}.`,
          dadosNovos: this.buildMovimentacaoSnapshot(updated),
        },
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'Movimentacao',
          entidadeId: updated.id,
          acao: 'CONFIRMACAO_ENTREGA',
          usuarioId: actor.id,
          dadosAnteriores: this.buildMovimentacaoSnapshot(movimentacao),
          dadosNovos: this.buildMovimentacaoSnapshot(updated),
          contexto: {
            confirmadoEntregaPorId: actor.id,
            observacoes,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async confirmarRecebimento(
    id: string,
    dto: ConfirmarRecebimentoDto,
    actor: AuthenticatedUser,
  ) {
    const movimentacao = await this.getMovimentacaoOrFail(id);

    assertCanConfirmarRecebimento(actor, movimentacao);
    this.assertStatusAtual(
      movimentacao,
      StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
      'O recebimento so pode ser confirmado quando a movimentacao estiver aguardando confirmacao de recebimento.',
    );

    const observacoes = this.normalizeOptionalText(dto.observacoes);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.movimentacao.update({
        where: { id },
        data: {
          status: StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
          confirmadoRecebimentoPorId: actor.id,
          confirmadoRecebimentoEm: new Date(),
        },
        select: movimentacaoSelect,
      });

      await tx.historicoPatrimonio.create({
        data: {
          patrimonioId: updated.patrimonioId,
          usuarioId: actor.id,
          movimentacaoId: updated.id,
          evento: 'MOVIMENTACAO_RECEBIMENTO_CONFIRMADO',
          descricao: `Recebimento confirmado para a movimentacao do tombo ${updated.patrimonio.tombo}.`,
          dadosNovos: this.buildMovimentacaoSnapshot(updated),
        },
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'Movimentacao',
          entidadeId: updated.id,
          acao: 'CONFIRMACAO_RECEBIMENTO',
          usuarioId: actor.id,
          dadosAnteriores: this.buildMovimentacaoSnapshot(movimentacao),
          dadosNovos: this.buildMovimentacaoSnapshot(updated),
          contexto: {
            confirmadoRecebimentoPorId: actor.id,
            observacoes,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async analisar(
    id: string,
    dto: AnalisarMovimentacaoDto,
    actor: AuthenticatedUser,
  ) {
    assertCanManageMovimentacao(actor);

    const movimentacao = await this.getMovimentacaoOrFail(id);

    this.assertStatusAtual(
      movimentacao,
      StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
      'A movimentacao so pode ser analisada quando estiver aguardando aprovacao do patrimonio.',
    );

    const observacoes = this.normalizeOptionalText(dto.observacoes);
    const patrimonioAntes = this.buildPatrimonioSnapshot(movimentacao.patrimonio);

    return this.prismaService.$transaction(async (tx) => {
      if (dto.decisao === 'APROVAR') {
        const updated = await tx.movimentacao.update({
          where: { id },
          data: {
            status: StatusMovimentacao.CONCLUIDA,
            validadoPorId: actor.id,
            validadoEm: new Date(),
            justificativaRejeicao: null,
          },
          select: movimentacaoSelect,
        });

        const patrimonioAtualizado = await tx.patrimonio.update({
          where: {
            id: updated.patrimonioId,
          },
          data: {
            secretariaAtualId: updated.secretariaDestinoId,
            localizacaoAtual: updated.localizacaoDestino,
            responsavelAtualId:
              updated.responsavelDestinoId ?? updated.responsavelOrigemId,
            status: StatusItem.ATIVO,
            updatedById: actor.id,
          },
          select: patrimonioMovimentacaoSelect,
        });

        await tx.historicoPatrimonio.create({
          data: {
            patrimonioId: updated.patrimonioId,
            usuarioId: actor.id,
            movimentacaoId: updated.id,
            evento: 'MOVIMENTACAO_CONCLUIDA',
            descricao: `Movimentacao concluida para o tombo ${updated.patrimonio.tombo}.`,
            dadosAnteriores: patrimonioAntes,
            dadosNovos: this.buildPatrimonioSnapshot(patrimonioAtualizado),
          },
        });

        await this.auditoriaService.registrar(
          {
            entidade: 'Movimentacao',
            entidadeId: updated.id,
            acao: 'APROVACAO',
            usuarioId: actor.id,
            dadosAnteriores: this.buildMovimentacaoSnapshot(movimentacao),
            dadosNovos: this.buildMovimentacaoSnapshot(updated),
            contexto: {
              validadoPorId: actor.id,
              patrimonioId: patrimonioAtualizado.id,
              patrimonioDepois: this.buildPatrimonioSnapshot(patrimonioAtualizado),
              observacoes,
            },
          },
          tx,
        );

        return updated;
      }

      const justificativaRejeicao = this.normalizeRequiredText(
        dto.justificativaRejeicao ?? '',
        'Justificativa da rejeicao',
        5,
      );

      const updated = await tx.movimentacao.update({
        where: { id },
        data: {
          status: StatusMovimentacao.REJEITADA,
          validadoPorId: actor.id,
          validadoEm: new Date(),
          justificativaRejeicao,
        },
        select: movimentacaoSelect,
      });

      const patrimonioAtualizado = await tx.patrimonio.update({
        where: {
          id: updated.patrimonioId,
        },
        data: {
          status: StatusItem.ATIVO,
          updatedById: actor.id,
        },
        select: patrimonioMovimentacaoSelect,
      });

      await tx.historicoPatrimonio.create({
        data: {
          patrimonioId: updated.patrimonioId,
          usuarioId: actor.id,
          movimentacaoId: updated.id,
          evento: 'MOVIMENTACAO_REJEITADA',
          descricao: `Movimentacao rejeitada para o tombo ${updated.patrimonio.tombo}.`,
          dadosAnteriores: patrimonioAntes,
          dadosNovos: this.buildPatrimonioSnapshot(patrimonioAtualizado),
        },
      });

      await this.auditoriaService.registrar(
        {
          entidade: 'Movimentacao',
          entidadeId: updated.id,
          acao: 'REJEICAO',
          usuarioId: actor.id,
          dadosAnteriores: this.buildMovimentacaoSnapshot(movimentacao),
          dadosNovos: this.buildMovimentacaoSnapshot(updated),
          contexto: {
            validadoPorId: actor.id,
            justificativaRejeicao,
            observacoes,
          },
        },
        tx,
      );

      return updated;
    });
  }

  private async getMovimentacaoOrFail(id: string) {
    const movimentacao = await this.prismaService.movimentacao.findUnique({
      where: { id },
      select: movimentacaoSelect,
    });

    if (!movimentacao) {
      throw new NotFoundException('Movimentacao nao encontrada.');
    }

    return movimentacao;
  }

  private buildMovimentacaoSnapshot(movimentacao: MovimentacaoSelected) {
    return this.toJsonValue({
      id: movimentacao.id,
      patrimonioId: movimentacao.patrimonioId,
      secretariaOrigemId: movimentacao.secretariaOrigemId,
      localizacaoOrigem: movimentacao.localizacaoOrigem,
      secretariaDestinoId: movimentacao.secretariaDestinoId,
      localizacaoDestino: movimentacao.localizacaoDestino,
      responsavelOrigemId: movimentacao.responsavelOrigemId,
      responsavelDestinoId: movimentacao.responsavelDestinoId,
      solicitanteId: movimentacao.solicitanteId,
      motivo: movimentacao.motivo,
      observacoes: movimentacao.observacoes,
      status: movimentacao.status,
      solicitadoEm: movimentacao.solicitadoEm,
      confirmadoEntregaPorId: movimentacao.confirmadoEntregaPorId,
      confirmadoEntregaEm: movimentacao.confirmadoEntregaEm,
      confirmadoRecebimentoPorId: movimentacao.confirmadoRecebimentoPorId,
      confirmadoRecebimentoEm: movimentacao.confirmadoRecebimentoEm,
      validadoPorId: movimentacao.validadoPorId,
      validadoEm: movimentacao.validadoEm,
      justificativaRejeicao: movimentacao.justificativaRejeicao,
    });
  }

  private buildPatrimonioSnapshot(patrimonio: PatrimonioMovimentacaoSelected) {
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

  private normalizeRequiredText(
    value: string,
    fieldName: string,
    minLength: number,
  ) {
    const normalizedValue = value.trim();

    if (normalizedValue.length < minLength) {
      throw new BadRequestException(
        `${fieldName} deve ter ao menos ${minLength} caracteres.`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length ? normalizedValue : null;
  }

  private normalizeOptionalId(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length ? normalizedValue : null;
  }

  private assertPatrimonioDisponivel(patrimonio: PatrimonioMovimentacaoSelected) {
    if (patrimonio.status === StatusItem.BAIXADO) {
      throw new BadRequestException(
        'Patrimonio baixado nao pode receber movimentacao.',
      );
    }

    if (patrimonio.status === StatusItem.EM_MOVIMENTACAO) {
      throw new BadRequestException(
        'Patrimonio ja possui movimentacao em andamento.',
      );
    }

    if (patrimonio.status !== StatusItem.ATIVO) {
      throw new BadRequestException(
        'Apenas patrimonios ativos podem iniciar movimentacao.',
      );
    }
  }

  private assertStatusAtual(
    movimentacao: MovimentacaoSelected,
    expectedStatus: StatusMovimentacao,
    message: string,
  ) {
    if (movimentacao.status !== expectedStatus) {
      throw new BadRequestException(message);
    }
  }

  private async ensureNoOpenMovimentacao(patrimonioId: string) {
    const movimentacao = await this.prismaService.movimentacao.findFirst({
      where: {
        patrimonioId,
        status: {
          in: [...OPEN_MOVEMENT_STATUSES],
        },
      },
      select: {
        id: true,
      },
    });

    if (movimentacao) {
      throw new BadRequestException(
        'Este patrimonio ja possui uma movimentacao aberta.',
      );
    }
  }

  private async ensureSecretariaAtiva(secretariaId: string) {
    const secretaria = await this.prismaService.secretaria.findUnique({
      where: { id: secretariaId },
      select: {
        id: true,
        ativo: true,
      },
    });

    if (!secretaria?.ativo) {
      throw new BadRequestException(
        'Secretaria de destino informada nao foi encontrada ou esta inativa.',
      );
    }
  }

  private async resolveResponsavelDestinoId(input: {
    secretariaDestinoId: string;
    responsavelDestinoId?: string | null;
    patrimonio: PatrimonioMovimentacaoSelected;
  }) {
    const responsavelDestinoId = this.normalizeOptionalId(
      input.responsavelDestinoId,
    );

    if (!responsavelDestinoId) {
      if (input.secretariaDestinoId !== input.patrimonio.secretariaAtualId) {
        throw new BadRequestException(
          'Informe o responsavel de destino quando houver mudanca de secretaria.',
        );
      }

      return input.patrimonio.responsavelAtualId;
    }

    const responsavel = await this.prismaService.responsavel.findUnique({
      where: {
        id: responsavelDestinoId,
      },
      select: {
        id: true,
        ativo: true,
        secretariaId: true,
      },
    });

    if (!responsavel?.ativo) {
      throw new BadRequestException(
        'Responsavel de destino nao foi encontrado ou esta inativo.',
      );
    }

    if (responsavel.secretariaId !== input.secretariaDestinoId) {
      throw new BadRequestException(
        'Responsavel de destino deve pertencer a secretaria de destino.',
      );
    }

    return responsavel.id;
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['solicitadoEm', 'updatedAt', 'status'];

    return allowedSortFields.includes(sortBy ?? '')
      ? sortBy ?? 'updatedAt'
      : 'updatedAt';
  }

  private toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
