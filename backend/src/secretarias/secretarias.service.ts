import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretariaDto } from './dto/create-secretaria.dto';
import { SecretariaFilterDto } from './dto/secretaria-filter.dto';
import { UpdateSecretariaDto } from './dto/update-secretaria.dto';

const secretariaSelect = {
  id: true,
  sigla: true,
  nomeCompleto: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SecretariaSelect;

@Injectable()
export class SecretariasService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions() {
    return this.prismaService.secretaria.findMany({
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
    });
  }

  async findAll(filters: SecretariaFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SecretariaWhereInput = {
      ...(filters.search
        ? {
            OR: [
              {
                sigla: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                nomeCompleto: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(typeof filters.ativo === 'boolean' ? { ativo: filters.ativo } : {}),
    };

    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.secretaria.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: secretariaSelect,
      }),
      this.prismaService.secretaria.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const secretaria = await this.prismaService.secretaria.findUnique({
      where: { id },
      select: secretariaSelect,
    });

    if (!secretaria) {
      throw new NotFoundException('Secretaria nao encontrada.');
    }

    return secretaria;
  }

  async create(dto: CreateSecretariaDto, actor: AuthenticatedUser) {
    const sigla = this.normalizeSigla(dto.sigla);
    const nomeCompleto = this.normalizeNomeCompleto(dto.nomeCompleto);

    this.validateSigla(sigla);
    this.validateNomeCompleto(nomeCompleto);
    await this.ensureSiglaAvailable(sigla);

    const secretaria = await this.prismaService.secretaria.create({
      data: {
        sigla,
        nomeCompleto,
        ativo: dto.ativo ?? true,
      },
      select: secretariaSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Secretaria',
      entidadeId: secretaria.id,
      acao: 'CRIACAO',
      usuarioId: actor.id,
      dadosNovos: {
        sigla: secretaria.sigla,
        nomeCompleto: secretaria.nomeCompleto,
        ativo: secretaria.ativo,
      },
    });

    return secretaria;
  }

  async update(id: string, dto: UpdateSecretariaDto, actor: AuthenticatedUser) {
    const existing = await this.prismaService.secretaria.findUnique({
      where: { id },
      select: {
        id: true,
        sigla: true,
        nomeCompleto: true,
        ativo: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Secretaria nao encontrada.');
    }

    const sigla =
      dto.sigla !== undefined ? this.normalizeSigla(dto.sigla) : existing.sigla;
    const nomeCompleto =
      dto.nomeCompleto !== undefined
        ? this.normalizeNomeCompleto(dto.nomeCompleto)
        : existing.nomeCompleto;

    this.validateSigla(sigla);
    this.validateNomeCompleto(nomeCompleto);

    if (sigla !== existing.sigla) {
      await this.ensureSiglaAvailable(sigla, id);
    }

    const secretaria = await this.prismaService.secretaria.update({
      where: { id },
      data: {
        ...(dto.sigla !== undefined ? { sigla } : {}),
        ...(dto.nomeCompleto !== undefined ? { nomeCompleto } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
      select: secretariaSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Secretaria',
      entidadeId: secretaria.id,
      acao: 'ATUALIZACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        sigla: secretaria.sigla,
        nomeCompleto: secretaria.nomeCompleto,
        ativo: secretaria.ativo,
      },
    });

    return secretaria;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prismaService.secretaria.findUnique({
      where: { id },
      select: {
        id: true,
        sigla: true,
        nomeCompleto: true,
        ativo: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Secretaria nao encontrada.');
    }

    if (!existing.ativo) {
      throw new BadRequestException('Secretaria ja esta inativa.');
    }

    const secretaria = await this.prismaService.secretaria.update({
      where: { id },
      data: {
        ativo: false,
      },
      select: secretariaSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Secretaria',
      entidadeId: secretaria.id,
      acao: 'DESATIVACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        ativo: false,
      },
    });

    return secretaria;
  }

  private async ensureSiglaAvailable(sigla: string, ignoreId?: string) {
    const existing = await this.prismaService.secretaria.findFirst({
      where: {
        sigla: {
          equals: sigla,
          mode: 'insensitive',
        },
        ...(ignoreId
          ? {
              NOT: {
                id: ignoreId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ja existe uma secretaria com esta sigla.');
    }
  }

  private normalizeSigla(sigla: string) {
    return sigla.trim().toUpperCase();
  }

  private normalizeNomeCompleto(nomeCompleto: string) {
    return nomeCompleto.trim();
  }

  private validateSigla(sigla: string) {
    if (sigla.length < 2 || sigla.length > 10) {
      throw new BadRequestException(
        'Sigla deve ter entre 2 e 10 caracteres.',
      );
    }
  }

  private validateNomeCompleto(nomeCompleto: string) {
    if (nomeCompleto.length < 3) {
      throw new BadRequestException(
        'Nome completo deve ter ao menos 3 caracteres.',
      );
    }
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['sigla', 'nomeCompleto', 'createdAt', 'updatedAt'];

    return allowedSortFields.includes(sortBy ?? '') ? sortBy ?? 'updatedAt' : 'updatedAt';
  }
}
