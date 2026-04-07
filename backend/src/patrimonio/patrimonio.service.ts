import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoConservacao,
  Prisma,
  StatusItem,
  TipoEntrada,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  assertCanAccessPatrimonio,
  assertCanManagePatrimonio,
  buildPatrimonioScopeWhere,
  canManagePatrimonio,
} from '../common/permissions/patrimonio.permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatrimonioDto } from './dto/create-patrimonio.dto';
import { PatrimonioFilterDto } from './dto/patrimonio-filter.dto';
import { UpdatePatrimonioDto } from './dto/update-patrimonio.dto';
import { calcularValorAtualEstimado } from './valor-atual-estimate.util';

const ALLOWED_DIRECT_STATUS = [
  StatusItem.ATIVO,
  StatusItem.INATIVO,
  StatusItem.EM_MANUTENCAO,
] as const;

const patrimonioSelect = {
  id: true,
  item: true,
  tombo: true,
  secretariaAtualId: true,
  localizacaoAtual: true,
  responsavelAtualId: true,
  estadoConservacao: true,
  status: true,
  fornecedorId: true,
  tipoEntrada: true,
  valorOriginal: true,
  valorAtual: true,
  descricao: true,
  dataAquisicao: true,
  observacoes: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
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
  fornecedor: {
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
    },
  },
} satisfies Prisma.PatrimonioSelect;

type PatrimonioSelected = Prisma.PatrimonioGetPayload<{
  select: typeof patrimonioSelect;
}>;

const patrimonioHistoricoSelect = {
  id: true,
  patrimonioId: true,
  usuarioId: true,
  movimentacaoId: true,
  baixaPatrimonialId: true,
  evento: true,
  descricao: true,
  dadosAnteriores: true,
  dadosNovos: true,
  criadoEm: true,
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      secretariaId: true,
    },
  },
  movimentacao: {
    select: {
      id: true,
      status: true,
    },
  },
  baixaPatrimonial: {
    select: {
      id: true,
      motivo: true,
      baixadoEm: true,
    },
  },
} satisfies Prisma.HistoricoPatrimonioSelect;

@Injectable()
export class PatrimonioService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions(actor: AuthenticatedUser) {
    const canManage = canManagePatrimonio(actor);

    const [secretarias, responsaveis, fornecedores] =
      await this.prismaService.$transaction([
        this.prismaService.secretaria.findMany({
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
        this.prismaService.responsavel.findMany({
          where: {
            ativo: true,
            ...(canManage
              ? {}
              : actor.secretariaId
                ? { secretariaId: actor.secretariaId }
                : { id: '__none__' }),
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
        this.prismaService.fornecedor.findMany({
          where: {
            ativo: true,
          },
          orderBy: {
            nome: 'asc',
          },
          select: {
            id: true,
            nome: true,
            cpfCnpj: true,
          },
        }),
      ]);

    return {
      secretarias,
      responsaveis,
      fornecedores,
      status: Object.values(StatusItem),
      estadosConservacao: Object.values(EstadoConservacao),
      tiposEntrada: Object.values(TipoEntrada),
    };
  }

  async findAll(filters: PatrimonioFilterDto, actor: AuthenticatedUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';
    const normalizedSearch = filters.search?.trim();

    if (
      !canManagePatrimonio(actor) &&
      filters.secretariaAtualId &&
      filters.secretariaAtualId !== actor.secretariaId
    ) {
      throw new ForbiddenException(
        'Voce nao pode consultar patrimonio fora do seu escopo.',
      );
    }

    const where: Prisma.PatrimonioWhereInput = {
      ...buildPatrimonioScopeWhere(actor),
      ...(normalizedSearch
        ? {
            OR: [
              {
                item: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                tombo: {
                  contains: normalizedSearch,
                },
              },
              {
                localizacaoAtual: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(filters.tombo ? { tombo: filters.tombo } : {}),
      ...(filters.secretariaAtualId
        ? { secretariaAtualId: filters.secretariaAtualId }
        : {}),
      ...(filters.responsavelAtualId
        ? { responsavelAtualId: filters.responsavelAtualId }
        : {}),
      ...(filters.fornecedorId ? { fornecedorId: filters.fornecedorId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.estadoConservacao
        ? { estadoConservacao: filters.estadoConservacao }
        : {}),
      ...(filters.tipoEntrada ? { tipoEntrada: filters.tipoEntrada } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.patrimonio.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: patrimonioSelect,
      }),
      this.prismaService.patrimonio.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const patrimonio = await this.prismaService.patrimonio.findUnique({
      where: { id },
      select: patrimonioSelect,
    });

    if (!patrimonio) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    assertCanAccessPatrimonio(actor, {
      secretariaAtualId: patrimonio.secretariaAtualId,
    });

    return patrimonio;
  }

  async findHistorico(id: string, actor: AuthenticatedUser) {
    const patrimonio = await this.prismaService.patrimonio.findUnique({
      where: { id },
      select: {
        id: true,
        secretariaAtualId: true,
      },
    });

    if (!patrimonio) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    assertCanAccessPatrimonio(actor, patrimonio);

    return this.prismaService.historicoPatrimonio.findMany({
      where: {
        patrimonioId: id,
      },
      orderBy: {
        criadoEm: 'desc',
      },
      select: patrimonioHistoricoSelect,
    });
  }

  async findAvaliacaoValorAtual(id: string, actor: AuthenticatedUser) {
    const patrimonio = await this.prismaService.patrimonio.findUnique({
      where: { id },
      select: patrimonioSelect,
    });

    if (!patrimonio) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    assertCanAccessPatrimonio(actor, patrimonio);

    const estimativa = calcularValorAtualEstimado({
      valorOriginal: Number(patrimonio.valorOriginal),
      estadoConservacao: patrimonio.estadoConservacao,
      dataAquisicao: patrimonio.dataAquisicao,
    });
    const valorAtualInformado =
      patrimonio.valorAtual === null ? null : Number(patrimonio.valorAtual);

    return {
      patrimonioId: patrimonio.id,
      valorOriginal: Number(patrimonio.valorOriginal).toFixed(2),
      valorAtualInformado:
        valorAtualInformado === null ? null : valorAtualInformado.toFixed(2),
      valorAtualSugerido:
        estimativa.valorSugerido === null
          ? null
          : estimativa.valorSugerido.toFixed(2),
      valorAtualExibicao:
        valorAtualInformado !== null
          ? valorAtualInformado.toFixed(2)
          : estimativa.valorSugerido === null
            ? null
            : estimativa.valorSugerido.toFixed(2),
      modoAtual:
        valorAtualInformado !== null
          ? 'MANUAL'
          : estimativa.disponivel
            ? 'ESTIMADO'
            : 'INDISPONIVEL',
      idadeMeses: estimativa.idadeMeses,
      fatorConservacao: estimativa.fatorConservacao,
      fatorTempo: estimativa.fatorTempo,
      percentualAplicado: estimativa.percentualAplicado,
      taxaDepreciacaoAnualPercentual:
        estimativa.taxaDepreciacaoAnualPercentual,
      valorResidualPercentual: estimativa.valorResidualPercentual,
      regra: estimativa.regra,
      observacao: estimativa.observacao,
    };
  }

  async aplicarValorAtualEstimado(id: string, actor: AuthenticatedUser) {
    assertCanManagePatrimonio(actor);

    const existing = await this.prismaService.patrimonio.findUnique({
      where: { id },
      select: patrimonioSelect,
    });

    if (!existing) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    const estimativa = calcularValorAtualEstimado({
      valorOriginal: Number(existing.valorOriginal),
      estadoConservacao: existing.estadoConservacao,
      dataAquisicao: existing.dataAquisicao,
    });

    if (!estimativa.disponivel || estimativa.valorSugerido === null) {
      throw new BadRequestException(
        'Nao foi possivel calcular a estimativa de valor atual para este patrimonio.',
      );
    }

    const patrimonio = await this.prismaService.patrimonio.update({
      where: { id },
      data: {
        valorAtual: estimativa.valorSugerido,
        updatedById: actor.id,
      },
      select: patrimonioSelect,
    });

    const previousSnapshot = this.buildSnapshot(existing);
    const nextSnapshot = this.buildSnapshot(patrimonio);
    const nextSnapshotWithEstimate = this.toJsonObject({
      ...(nextSnapshot as Record<string, unknown>),
      valorAtualEstimado: estimativa.valorSugerido.toFixed(2),
      percentualAplicado: estimativa.percentualAplicado,
    });

    await this.registrarHistorico({
      patrimonioId: patrimonio.id,
      usuarioId: actor.id,
      evento: 'ATUALIZACAO_VALOR_ATUAL',
      descricao: `Valor atual recalculado e aplicado ao patrimonio ${patrimonio.tombo}.`,
      dadosAnteriores: previousSnapshot,
      dadosNovos: nextSnapshotWithEstimate,
    });

    await this.auditoriaService.registrar({
      entidade: 'Patrimonio',
      entidadeId: patrimonio.id,
      acao: 'APLICACAO_VALOR_ESTIMADO',
      usuarioId: actor.id,
      dadosAnteriores: previousSnapshot,
      dadosNovos: {
        valorAtual: patrimonio.valorAtual?.toString() ?? null,
        valorAtualEstimado: estimativa.valorSugerido.toFixed(2),
        percentualAplicado: estimativa.percentualAplicado,
      },
      contexto: {
        regra: estimativa.regra,
        observacao: estimativa.observacao,
        idadeMeses: estimativa.idadeMeses,
      },
    });

    return patrimonio;
  }

  async create(dto: CreatePatrimonioDto, actor: AuthenticatedUser) {
    assertCanManagePatrimonio(actor);

    const data = await this.resolveCreateOrUpdateData({
      item: dto.item,
      tombo: dto.tombo,
      secretariaAtualId: dto.secretariaAtualId,
      localizacaoAtual: dto.localizacaoAtual,
      responsavelAtualId: dto.responsavelAtualId,
      estadoConservacao: dto.estadoConservacao,
      status: dto.status ?? StatusItem.ATIVO,
      fornecedorId: dto.fornecedorId,
      tipoEntrada: dto.tipoEntrada,
      valorOriginal: dto.valorOriginal,
      valorAtual: dto.valorAtual,
      descricao: dto.descricao,
      dataAquisicao: dto.dataAquisicao,
      observacoes: dto.observacoes,
    });

    await this.ensureTomboAvailable(data.tombo);

    const patrimonio = await this.prismaService.patrimonio.create({
      data: {
        ...data,
        createdById: actor.id,
        updatedById: actor.id,
      },
      select: patrimonioSelect,
    });

    const snapshot = this.buildSnapshot(patrimonio);

    await this.registrarHistorico({
      patrimonioId: patrimonio.id,
      usuarioId: actor.id,
      evento: 'CRIACAO',
      descricao: `Patrimonio cadastrado com tombo ${patrimonio.tombo}.`,
      dadosNovos: snapshot,
    });

    await this.auditoriaService.registrar({
      entidade: 'Patrimonio',
      entidadeId: patrimonio.id,
      acao: 'CRIACAO',
      usuarioId: actor.id,
      dadosNovos: snapshot,
    });

    return patrimonio;
  }

  async update(id: string, dto: UpdatePatrimonioDto, actor: AuthenticatedUser) {
    assertCanManagePatrimonio(actor);

    const existing = await this.prismaService.patrimonio.findUnique({
      where: { id },
      select: patrimonioSelect,
    });

    if (!existing) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    this.assertStatusCanBeEdited(existing.status);

    const data = await this.resolveCreateOrUpdateData({
      item: dto.item ?? existing.item,
      tombo: dto.tombo ?? existing.tombo,
      secretariaAtualId: dto.secretariaAtualId ?? existing.secretariaAtualId,
      localizacaoAtual: dto.localizacaoAtual ?? existing.localizacaoAtual,
      responsavelAtualId: dto.responsavelAtualId ?? existing.responsavelAtualId,
      estadoConservacao:
        dto.estadoConservacao ?? existing.estadoConservacao,
      status: dto.status ?? existing.status,
      fornecedorId:
        dto.fornecedorId !== undefined
          ? dto.fornecedorId
          : (existing.fornecedorId ?? undefined),
      tipoEntrada: dto.tipoEntrada ?? existing.tipoEntrada,
      valorOriginal: dto.valorOriginal ?? Number(existing.valorOriginal),
      valorAtual:
        dto.valorAtual !== undefined
          ? dto.valorAtual
          : existing.valorAtual === null
            ? null
            : Number(existing.valorAtual),
      descricao:
        dto.descricao !== undefined
          ? dto.descricao
          : (existing.descricao ?? undefined),
      dataAquisicao:
        dto.dataAquisicao !== undefined
          ? dto.dataAquisicao
          : existing.dataAquisicao?.toISOString(),
      observacoes:
        dto.observacoes !== undefined
          ? dto.observacoes
          : (existing.observacoes ?? undefined),
    });

    if (data.tombo !== existing.tombo) {
      await this.ensureTomboAvailable(data.tombo, id);
    }

    const patrimonio = await this.prismaService.patrimonio.update({
      where: { id },
      data: {
        ...data,
        updatedById: actor.id,
      },
      select: patrimonioSelect,
    });

    const previousSnapshot = this.buildSnapshot(existing);
    const nextSnapshot = this.buildSnapshot(patrimonio);

    await this.registrarHistorico({
      patrimonioId: patrimonio.id,
      usuarioId: actor.id,
      evento: 'ATUALIZACAO',
      descricao: this.buildUpdateDescription(previousSnapshot, nextSnapshot),
      dadosAnteriores: previousSnapshot,
      dadosNovos: nextSnapshot,
    });

    await this.auditoriaService.registrar({
      entidade: 'Patrimonio',
      entidadeId: patrimonio.id,
      acao: 'ATUALIZACAO',
      usuarioId: actor.id,
      dadosAnteriores: previousSnapshot,
      dadosNovos: nextSnapshot,
    });

    return patrimonio;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    assertCanManagePatrimonio(actor);

    const existing = await this.prismaService.patrimonio.findUnique({
      where: { id },
      select: patrimonioSelect,
    });

    if (!existing) {
      throw new NotFoundException('Patrimonio nao encontrado.');
    }

    if (existing.status === StatusItem.INATIVO) {
      throw new BadRequestException('Patrimonio ja esta inativo.');
    }

    this.assertStatusCanBeEdited(existing.status);

    const patrimonio = await this.prismaService.patrimonio.update({
      where: { id },
      data: {
        status: StatusItem.INATIVO,
        updatedById: actor.id,
      },
      select: patrimonioSelect,
    });

    const previousSnapshot = this.buildSnapshot(existing);
    const nextSnapshot = this.buildSnapshot(patrimonio);

    await this.registrarHistorico({
      patrimonioId: patrimonio.id,
      usuarioId: actor.id,
      evento: 'INATIVACAO',
      descricao: `Patrimonio ${patrimonio.tombo} marcado como inativo.`,
      dadosAnteriores: previousSnapshot,
      dadosNovos: nextSnapshot,
    });

    await this.auditoriaService.registrar({
      entidade: 'Patrimonio',
      entidadeId: patrimonio.id,
      acao: 'INATIVACAO',
      usuarioId: actor.id,
      dadosAnteriores: previousSnapshot,
      dadosNovos: nextSnapshot,
    });

    return patrimonio;
  }

  private async resolveCreateOrUpdateData(input: {
    item: string;
    tombo: string;
    secretariaAtualId: string;
    localizacaoAtual: string;
    responsavelAtualId: string;
    estadoConservacao: EstadoConservacao;
    status: StatusItem;
    fornecedorId?: string | null;
    tipoEntrada: TipoEntrada;
    valorOriginal: number;
    valorAtual?: number | null;
    descricao?: string | null;
    dataAquisicao?: string | null;
    observacoes?: string | null;
  }) {
    const item = this.normalizeRequiredText(input.item, 'Item', 3);
    const tombo = input.tombo.trim();
    const localizacaoAtual = this.normalizeRequiredText(
      input.localizacaoAtual,
      'Localizacao atual',
      2,
    );
    const descricao = this.normalizeOptionalText(input.descricao);
    const observacoes = this.normalizeOptionalText(input.observacoes);
    const fornecedorId = this.normalizeOptionalId(input.fornecedorId);
    const valorAtual = input.valorAtual ?? null;

    this.assertTombo(tombo);
    this.assertDirectStatusAllowed(input.status);

    await this.ensureSecretariaExists(input.secretariaAtualId);
    await this.ensureResponsavelExists(
      input.responsavelAtualId,
      input.secretariaAtualId,
    );
    await this.ensureFornecedorExists(fornecedorId);

    return {
      item,
      tombo,
      secretariaAtualId: input.secretariaAtualId,
      localizacaoAtual,
      responsavelAtualId: input.responsavelAtualId,
      estadoConservacao: input.estadoConservacao,
      status: input.status,
      fornecedorId,
      tipoEntrada: input.tipoEntrada,
      valorOriginal: input.valorOriginal,
      valorAtual,
      descricao,
      dataAquisicao: input.dataAquisicao ? new Date(input.dataAquisicao) : null,
      observacoes,
    };
  }

  private buildSnapshot(patrimonio: PatrimonioSelected): Prisma.InputJsonObject {
    return this.toJsonObject({
      id: patrimonio.id,
      item: patrimonio.item,
      tombo: patrimonio.tombo,
      secretariaAtualId: patrimonio.secretariaAtualId,
      localizacaoAtual: patrimonio.localizacaoAtual,
      responsavelAtualId: patrimonio.responsavelAtualId,
      estadoConservacao: patrimonio.estadoConservacao,
      status: patrimonio.status,
      fornecedorId: patrimonio.fornecedorId,
      tipoEntrada: patrimonio.tipoEntrada,
      valorOriginal: patrimonio.valorOriginal,
      valorAtual: patrimonio.valorAtual,
      descricao: patrimonio.descricao,
      dataAquisicao: patrimonio.dataAquisicao,
      observacoes: patrimonio.observacoes,
      createdById: patrimonio.createdById,
      updatedById: patrimonio.updatedById,
    });
  }

  private buildUpdateDescription(
    previousSnapshot: Prisma.InputJsonValue,
    nextSnapshot: Prisma.InputJsonValue,
  ) {
    const previous =
      (previousSnapshot as Record<string, unknown>) ?? {};
    const next = (nextSnapshot as Record<string, unknown>) ?? {};
    const labels: Record<string, string> = {
      item: 'item',
      tombo: 'tombo',
      secretariaAtualId: 'secretaria atual',
      localizacaoAtual: 'localizacao atual',
      responsavelAtualId: 'responsavel atual',
      estadoConservacao: 'estado de conservacao',
      status: 'status',
      fornecedorId: 'fornecedor',
      tipoEntrada: 'tipo de entrada',
      valorOriginal: 'valor original',
      valorAtual: 'valor atual',
      descricao: 'descricao',
      dataAquisicao: 'data de aquisicao',
      observacoes: 'observacoes',
    };

    const changedFields = Object.keys(labels).filter(
      (field) =>
        JSON.stringify(previous[field] ?? null) !==
        JSON.stringify(next[field] ?? null),
    );

    if (!changedFields.length) {
      return 'Patrimonio atualizado sem alteracoes relevantes de dados.';
    }

    return `Patrimonio atualizado com alteracoes em: ${changedFields
      .map((field) => labels[field])
      .join(', ')}.`;
  }

  private async registrarHistorico(input: {
    patrimonioId: string;
    usuarioId: string;
    evento: string;
    descricao: string;
    dadosAnteriores?: Prisma.InputJsonValue;
    dadosNovos?: Prisma.InputJsonValue;
  }) {
    await this.prismaService.historicoPatrimonio.create({
      data: {
        patrimonioId: input.patrimonioId,
        usuarioId: input.usuarioId,
        evento: input.evento,
        descricao: input.descricao,
        dadosAnteriores: input.dadosAnteriores,
        dadosNovos: input.dadosNovos,
      },
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

  private assertTombo(tombo: string) {
    if (!/^\d{5}$/.test(tombo)) {
      throw new BadRequestException(
        'Tombo deve conter exatamente 5 digitos.',
      );
    }
  }

  private assertDirectStatusAllowed(status: StatusItem) {
    if (!(ALLOWED_DIRECT_STATUS as readonly StatusItem[]).includes(status)) {
      throw new BadRequestException(
        'Este status nao pode ser definido diretamente neste modulo.',
      );
    }
  }

  private assertStatusCanBeEdited(status: StatusItem) {
    if (status === StatusItem.BAIXADO) {
      throw new BadRequestException(
        'Patrimonio baixado deve ser tratado pelo fluxo de baixa.',
      );
    }

    if (status === StatusItem.EM_MOVIMENTACAO) {
      throw new BadRequestException(
        'Patrimonio em movimentacao deve ser tratado pelo fluxo de movimentacao.',
      );
    }
  }

  private async ensureTomboAvailable(tombo: string, ignoreId?: string) {
    const existing = await this.prismaService.patrimonio.findUnique({
      where: { tombo },
      select: { id: true },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe um patrimonio com este tombo.');
    }
  }

  private async ensureSecretariaExists(secretariaId: string) {
    const secretaria = await this.prismaService.secretaria.findUnique({
      where: { id: secretariaId },
      select: { id: true },
    });

    if (!secretaria) {
      throw new BadRequestException('Secretaria informada nao foi encontrada.');
    }
  }

  private async ensureResponsavelExists(
    responsavelId: string,
    secretariaAtualId: string,
  ) {
    const responsavel = await this.prismaService.responsavel.findUnique({
      where: { id: responsavelId },
      select: {
        id: true,
        secretariaId: true,
      },
    });

    if (!responsavel) {
      throw new BadRequestException('Responsavel informado nao foi encontrado.');
    }

    if (responsavel.secretariaId !== secretariaAtualId) {
      throw new BadRequestException(
        'Responsavel deve pertencer a mesma secretaria atual do patrimonio.',
      );
    }
  }

  private async ensureFornecedorExists(fornecedorId?: string | null) {
    if (!fornecedorId) {
      return;
    }

    const fornecedor = await this.prismaService.fornecedor.findUnique({
      where: { id: fornecedorId },
      select: { id: true },
    });

    if (!fornecedor) {
      throw new BadRequestException('Fornecedor informado nao foi encontrado.');
    }
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['item', 'tombo', 'createdAt', 'updatedAt'];

    return allowedSortFields.includes(sortBy ?? '')
      ? sortBy ?? 'updatedAt'
      : 'updatedAt';
  }

  private toJsonObject(value: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}
