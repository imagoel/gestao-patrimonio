import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Perfil, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioFilterDto } from './dto/usuario-filter.dto';

interface UsuarioAuthRecord extends AuthenticatedUser {
  ativo: boolean;
  senhaHash: string;
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findByEmailForAuth(email: string): Promise<UsuarioAuthRecord | null> {
    return this.prismaService.usuario.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        secretariaId: true,
        senhaHash: true,
      },
    });
  }

  async findActiveAuthById(id: string): Promise<AuthenticatedUser | null> {
    const usuario = await this.prismaService.usuario.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        secretariaId: true,
      },
    });

    if (!usuario?.ativo) {
      return null;
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil as Perfil,
      secretariaId: usuario.secretariaId,
    };
  }

  async findOptions() {
    const secretarias = await this.prismaService.secretaria.findMany({
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

    return {
      perfis: Object.values(Perfil),
      secretarias,
    };
  }

  async findAll(filters: UsuarioFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UsuarioWhereInput = {
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
                email: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(filters.email
        ? {
            email: {
              contains: filters.email,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(filters.perfil ? { perfil: filters.perfil } : {}),
      ...(typeof filters.ativo === 'boolean' ? { ativo: filters.ativo } : {}),
      ...(filters.secretariaId ? { secretariaId: filters.secretariaId } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filters.sortBy ?? 'updatedAt']: filters.sortOrder ?? 'desc',
        },
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
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
        },
      }),
      this.prismaService.usuario.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const usuario = await this.prismaService.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
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
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    return usuario;
  }

  async create(dto: CreateUsuarioDto, actor: AuthenticatedUser) {
    await this.ensureEmailAvailable(dto.email);
    await this.ensureSecretariaExists(dto.secretariaId);

    const senhaHash = await bcrypt.hash(dto.senha, 12);
    const usuario = await this.prismaService.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        perfil: dto.perfil,
        ativo: dto.ativo ?? true,
        secretariaId: dto.secretariaId ?? null,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
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
      },
    });

    await this.auditoriaService.registrar({
      entidade: 'Usuario',
      entidadeId: usuario.id,
      acao: 'CRIACAO',
      usuarioId: actor.id,
      dadosNovos: {
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        secretariaId: usuario.secretariaId,
      },
    });

    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto, actor: AuthenticatedUser) {
    const existing = await this.prismaService.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        secretariaId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (dto.email && dto.email !== existing.email) {
      await this.ensureEmailAvailable(dto.email);
    }

    await this.ensureSecretariaExists(dto.secretariaId);

    if (actor.id === id && dto.ativo === false) {
      throw new ForbiddenException('Voce nao pode desativar o proprio usuario.');
    }

    const senhaHash = dto.senha ? await bcrypt.hash(dto.senha, 12) : undefined;

    const usuario = await this.prismaService.usuario.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.perfil !== undefined ? { perfil: dto.perfil } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        ...(dto.secretariaId !== undefined
          ? { secretariaId: dto.secretariaId || null }
          : {}),
        ...(senhaHash ? { senhaHash } : {}),
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
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
      },
    });

    await this.auditoriaService.registrar({
      entidade: 'Usuario',
      entidadeId: usuario.id,
      acao: 'ATUALIZACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        secretariaId: usuario.secretariaId,
        senhaAlterada: Boolean(dto.senha),
      },
    });

    return usuario;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    if (actor.id === id) {
      throw new ForbiddenException('Voce nao pode desativar o proprio usuario.');
    }

    const existing = await this.prismaService.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        secretariaId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (!existing.ativo) {
      throw new BadRequestException('Usuario ja esta inativo.');
    }

    const usuario = await this.prismaService.usuario.update({
      where: { id },
      data: {
        ativo: false,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
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
      },
    });

    await this.auditoriaService.registrar({
      entidade: 'Usuario',
      entidadeId: usuario.id,
      acao: 'DESATIVACAO',
      usuarioId: actor.id,
      dadosAnteriores: existing,
      dadosNovos: {
        ativo: false,
      },
    });

    return usuario;
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prismaService.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ja existe um usuario com este e-mail.');
    }
  }

  private async ensureSecretariaExists(secretariaId?: string | null) {
    if (!secretariaId) {
      return;
    }

    const secretaria = await this.prismaService.secretaria.findUnique({
      where: { id: secretariaId },
      select: { id: true },
    });

    if (!secretaria) {
      throw new BadRequestException('Secretaria informada nao foi encontrada.');
    }
  }
}
