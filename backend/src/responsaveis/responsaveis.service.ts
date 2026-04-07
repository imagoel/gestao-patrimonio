import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResponsavelDto } from './dto/create-responsavel.dto';
import { ResponsavelFilterDto } from './dto/responsavel-filter.dto';
import { UpdateResponsavelDto } from './dto/update-responsavel.dto';

const responsavelSelect = {
  id: true,
  nome: true,
  cargo: true,
  setor: true,
  contato: true,
  ativo: true,
  secretariaId: true,
  createdAt: true,
  updatedAt: true,
  secretaria: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
} satisfies Prisma.ResponsavelSelect;

@Injectable()
export class ResponsaveisService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions() {
    return this.prismaService.responsavel.findMany({
      where: {
        ativo: true,
      },
      orderBy: [
        {
          nome: 'asc',
        },
      ],
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
    });
  }

  async findAll(filters: ResponsavelFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ResponsavelWhereInput = {
      ...(filters.search
        ? {
            OR: [
              {
                nome: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                cargo: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                setor: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                contato: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(filters.secretariaId ? { secretariaId: filters.secretariaId } : {}),
      ...(typeof filters.ativo === 'boolean' ? { ativo: filters.ativo } : {}),
    };

    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.responsavel.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: responsavelSelect,
      }),
      this.prismaService.responsavel.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const responsavel = await this.prismaService.responsavel.findUnique({
      where: { id },
      select: responsavelSelect,
    });

    if (!responsavel) {
      throw new NotFoundException('Responsavel nao encontrado.');
    }

    return responsavel;
  }

  async create(dto: CreateResponsavelDto, actor: AuthenticatedUser) {
    const data = await this.resolveCreateOrUpdateData(dto);

    const responsavel = await this.prismaService.responsavel.create({
      data: {
        ...data,
        ativo: dto.ativo ?? true,
      },
      select: responsavelSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Responsavel',
      entidadeId: responsavel.id,
      acao: 'CRIACAO',
      usuarioId: actor.id,
      dadosNovos: {
        nome: responsavel.nome,
        cargo: responsavel.cargo,
        setor: responsavel.setor,
        contato: responsavel.contato,
        ativo: responsavel.ativo,
        secretariaId: responsavel.secretariaId,
      },
    });

    return responsavel;
  }

  async update(id: string, dto: UpdateResponsavelDto, actor: AuthenticatedUser) {
    const existing = await this.prismaService.responsavel.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cargo: true,
        setor: true,
        contato: true,
        ativo: true,
        secretariaId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Responsavel nao encontrado.');
    }

    const data = await this.resolveCreateOrUpdateData({
      nome: dto.nome ?? existing.nome,
      cargo: dto.cargo ?? existing.cargo,
      setor: dto.setor ?? existing.setor,
      contato: dto.contato ?? existing.contato,
      secretariaId: dto.secretariaId ?? existing.secretariaId,
    });

    const responsavel = await this.prismaService.responsavel.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: data.nome } : {}),
        ...(dto.cargo !== undefined ? { cargo: data.cargo } : {}),
        ...(dto.setor !== undefined ? { setor: data.setor } : {}),
        ...(dto.contato !== undefined ? { contato: data.contato } : {}),
        ...(dto.secretariaId !== undefined
          ? { secretariaId: data.secretariaId }
          : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
      select: responsavelSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Responsavel',
      entidadeId: responsavel.id,
      acao: 'ATUALIZACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        nome: responsavel.nome,
        cargo: responsavel.cargo,
        setor: responsavel.setor,
        contato: responsavel.contato,
        ativo: responsavel.ativo,
        secretariaId: responsavel.secretariaId,
      },
    });

    return responsavel;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prismaService.responsavel.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cargo: true,
        setor: true,
        contato: true,
        ativo: true,
        secretariaId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Responsavel nao encontrado.');
    }

    if (!existing.ativo) {
      throw new BadRequestException('Responsavel ja esta inativo.');
    }

    const responsavel = await this.prismaService.responsavel.update({
      where: { id },
      data: {
        ativo: false,
      },
      select: responsavelSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Responsavel',
      entidadeId: responsavel.id,
      acao: 'DESATIVACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        ativo: false,
      },
    });

    return responsavel;
  }

  private async resolveCreateOrUpdateData(input: {
    nome: string;
    cargo?: string | null;
    setor: string;
    contato?: string | null;
    secretariaId: string;
  }) {
    const nome = this.normalizeRequiredText(input.nome, 'Nome');
    const setor = this.normalizeRequiredText(input.setor, 'Setor');
    const cargo = this.normalizeOptionalText(input.cargo);
    const contato = this.normalizeOptionalText(input.contato);

    await this.ensureSecretariaExists(input.secretariaId);

    return {
      nome,
      cargo,
      setor,
      contato,
      secretariaId: input.secretariaId,
    };
  }

  private normalizeRequiredText(value: string, fieldName: string) {
    const normalizedValue = value.trim();

    if (normalizedValue.length < 2) {
      throw new BadRequestException(
        `${fieldName} deve ter ao menos 2 caracteres.`,
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

  private async ensureSecretariaExists(secretariaId: string) {
    const secretaria = await this.prismaService.secretaria.findUnique({
      where: { id: secretariaId },
      select: { id: true },
    });

    if (!secretaria) {
      throw new BadRequestException('Secretaria informada nao foi encontrada.');
    }
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['nome', 'setor', 'createdAt', 'updatedAt'];

    return allowedSortFields.includes(sortBy ?? '')
      ? sortBy ?? 'updatedAt'
      : 'updatedAt';
  }
}
