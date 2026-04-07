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
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { FornecedorFilterDto } from './dto/fornecedor-filter.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';

const fornecedorSelect = {
  id: true,
  nome: true,
  cpfCnpj: true,
  telefone: true,
  email: true,
  observacoes: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FornecedorSelect;

@Injectable()
export class FornecedoresService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findOptions() {
    return this.prismaService.fornecedor.findMany({
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
    });
  }

  async findAll(filters: FornecedorFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const normalizedCpfCnpj = this.normalizeCpfCnpj(filters.cpfCnpj);
    const normalizedEmail = this.normalizeOptionalEmail(filters.email);
    const normalizedSearch = filters.search?.trim();
    const normalizedSearchDigits = this.normalizeCpfCnpj(filters.search);
    const normalizedSearchEmail = normalizedSearch?.toLowerCase();

    const where: Prisma.FornecedorWhereInput = {
      ...(normalizedSearch
        ? {
            OR: [
              {
                nome: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              ...(normalizedSearchDigits
                ? [
                    {
                      cpfCnpj: {
                        contains: normalizedSearchDigits,
                      },
                    },
                  ]
                : []),
              {
                email: {
                  contains: normalizedSearchEmail ?? normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                telefone: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(normalizedCpfCnpj ? { cpfCnpj: { contains: normalizedCpfCnpj } } : {}),
      ...(normalizedEmail
        ? {
            email: {
              contains: normalizedEmail,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(typeof filters.ativo === 'boolean' ? { ativo: filters.ativo } : {}),
    };

    const sortBy = this.resolveSortBy(filters.sortBy);
    const sortOrder = filters.sortOrder ?? 'desc';

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.fornecedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: fornecedorSelect,
      }),
      this.prismaService.fornecedor.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const fornecedor = await this.prismaService.fornecedor.findUnique({
      where: { id },
      select: fornecedorSelect,
    });

    if (!fornecedor) {
      throw new NotFoundException('Fornecedor nao encontrado.');
    }

    return fornecedor;
  }

  async create(dto: CreateFornecedorDto, actor: AuthenticatedUser) {
    const data = this.resolveCreateOrUpdateData(dto);

    await this.ensureCpfCnpjAvailable(data.cpfCnpj);

    const fornecedor = await this.prismaService.fornecedor.create({
      data: {
        ...data,
        ativo: dto.ativo ?? true,
      },
      select: fornecedorSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Fornecedor',
      entidadeId: fornecedor.id,
      acao: 'CRIACAO',
      usuarioId: actor.id,
      dadosNovos: {
        nome: fornecedor.nome,
        cpfCnpj: fornecedor.cpfCnpj,
        telefone: fornecedor.telefone,
        email: fornecedor.email,
        observacoes: fornecedor.observacoes,
        ativo: fornecedor.ativo,
      },
    });

    return fornecedor;
  }

  async update(id: string, dto: UpdateFornecedorDto, actor: AuthenticatedUser) {
    const existing = await this.prismaService.fornecedor.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        email: true,
        observacoes: true,
        ativo: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Fornecedor nao encontrado.');
    }

    const data = this.resolveCreateOrUpdateData({
      nome: dto.nome ?? existing.nome,
      cpfCnpj:
        dto.cpfCnpj !== undefined ? dto.cpfCnpj : (existing.cpfCnpj ?? undefined),
      telefone:
        dto.telefone !== undefined ? dto.telefone : (existing.telefone ?? undefined),
      email: dto.email !== undefined ? dto.email : (existing.email ?? undefined),
      observacoes:
        dto.observacoes !== undefined
          ? dto.observacoes
          : (existing.observacoes ?? undefined),
    });

    if (data.cpfCnpj !== existing.cpfCnpj) {
      await this.ensureCpfCnpjAvailable(data.cpfCnpj, id);
    }

    const fornecedor = await this.prismaService.fornecedor.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: data.nome } : {}),
        ...(dto.cpfCnpj !== undefined ? { cpfCnpj: data.cpfCnpj } : {}),
        ...(dto.telefone !== undefined ? { telefone: data.telefone } : {}),
        ...(dto.email !== undefined ? { email: data.email } : {}),
        ...(dto.observacoes !== undefined
          ? { observacoes: data.observacoes }
          : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
      select: fornecedorSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Fornecedor',
      entidadeId: fornecedor.id,
      acao: 'ATUALIZACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        nome: fornecedor.nome,
        cpfCnpj: fornecedor.cpfCnpj,
        telefone: fornecedor.telefone,
        email: fornecedor.email,
        observacoes: fornecedor.observacoes,
        ativo: fornecedor.ativo,
      },
    });

    return fornecedor;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prismaService.fornecedor.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        email: true,
        observacoes: true,
        ativo: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Fornecedor nao encontrado.');
    }

    if (!existing.ativo) {
      throw new BadRequestException('Fornecedor ja esta inativo.');
    }

    const fornecedor = await this.prismaService.fornecedor.update({
      where: { id },
      data: {
        ativo: false,
      },
      select: fornecedorSelect,
    });

    await this.auditoriaService.registrar({
      entidade: 'Fornecedor',
      entidadeId: fornecedor.id,
      acao: 'DESATIVACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        ativo: false,
      },
    });

    return fornecedor;
  }

  private resolveCreateOrUpdateData(input: {
    nome: string;
    cpfCnpj?: string | null;
    telefone?: string | null;
    email?: string | null;
    observacoes?: string | null;
  }) {
    const nome = this.normalizeRequiredText(input.nome, 'Nome');
    const cpfCnpj = this.normalizeCpfCnpj(input.cpfCnpj);
    const telefone = this.normalizeOptionalText(input.telefone);
    const email = this.normalizeOptionalEmail(input.email);
    const observacoes = this.normalizeOptionalText(input.observacoes);

    if (cpfCnpj && ![11, 14].includes(cpfCnpj.length)) {
      throw new BadRequestException(
        'CPF/CNPJ deve conter 11 ou 14 digitos.',
      );
    }

    return {
      nome,
      cpfCnpj,
      telefone,
      email,
      observacoes,
    };
  }

  private normalizeRequiredText(value: string, fieldName: string) {
    const normalizedValue = value.trim();

    if (normalizedValue.length < 3) {
      throw new BadRequestException(
        `${fieldName} deve ter ao menos 3 caracteres.`,
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

  private normalizeOptionalEmail(value?: string | null) {
    const normalizedValue = this.normalizeOptionalText(value);

    return normalizedValue ? normalizedValue.toLowerCase() : null;
  }

  private normalizeCpfCnpj(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const digitsOnly = value.replace(/\D/g, '');

    return digitsOnly.length ? digitsOnly : null;
  }

  private async ensureCpfCnpjAvailable(
    cpfCnpj?: string | null,
    ignoreId?: string,
  ) {
    if (!cpfCnpj) {
      return;
    }

    const existing = await this.prismaService.fornecedor.findFirst({
      where: {
        cpfCnpj,
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
      throw new ConflictException('Ja existe um fornecedor com este CPF/CNPJ.');
    }
  }

  private resolveSortBy(sortBy?: string) {
    const allowedSortFields = ['nome', 'cpfCnpj', 'createdAt', 'updatedAt'];

    return allowedSortFields.includes(sortBy ?? '')
      ? sortBy ?? 'updatedAt'
      : 'updatedAt';
  }
}
