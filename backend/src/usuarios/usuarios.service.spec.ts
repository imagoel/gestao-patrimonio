import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: jest.Mocked<PrismaService>;
  let auditoria: jest.Mocked<AuditoriaService>;

  const actor = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  beforeEach(() => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      secretaria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new UsuariosService(prisma, auditoria);
  });

  it('cria usuario com senha hash e auditoria', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    prisma.secretaria.findUnique.mockResolvedValueOnce({
      id: 'sec-1',
    } as never);
    prisma.usuario.create.mockResolvedValue({
      id: 'user-1',
      nome: 'Maria',
      email: 'maria@prefeitura.local',
      perfil: Perfil.CHEFE_SETOR,
      ativo: true,
      secretariaId: 'sec-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      secretaria: {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
    } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.create(
      {
        nome: 'Maria',
        email: 'maria@prefeitura.local',
        senha: 'Senha@123',
        perfil: Perfil.CHEFE_SETOR,
        secretariaId: 'sec-1',
      },
      actor,
    );

    expect(result.email).toBe('maria@prefeitura.local');
    expect(prisma.usuario.create).toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('nao permite criar usuario com e-mail duplicado', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'existing' } as never);

    await expect(
      service.create(
        {
          nome: 'Duplicado',
          email: 'admin@patrimonio.local',
          senha: 'Senha@123',
          perfil: Perfil.ADMINISTRADOR,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('nao permite desativar o proprio usuario', async () => {
    await expect(service.remove(actor.id, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('bloqueia desativacao de usuario ja inativo', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-2',
      nome: 'Inativo',
      email: 'inativo@prefeitura.local',
      perfil: Perfil.USUARIO_CONSULTA,
      ativo: false,
      secretariaId: null,
    } as never);

    await expect(service.remove('user-2', actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
