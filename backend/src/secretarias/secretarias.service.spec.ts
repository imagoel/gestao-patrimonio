import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecretariasService } from './secretarias.service';

describe('SecretariasService', () => {
  let service: SecretariasService;
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
      secretaria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new SecretariasService(prisma, auditoria);
  });

  it('cria secretaria normalizando sigla e registrando auditoria', async () => {
    prisma.secretaria.findFirst.mockResolvedValueOnce(null);
    prisma.secretaria.create.mockResolvedValue({
      id: 'sec-1',
      sigla: 'SEPLA',
      nomeCompleto: 'Secretaria de Planejamento',
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.create(
      {
        sigla: ' sepla ',
        nomeCompleto: '  Secretaria de Planejamento  ',
      },
      actor,
    );

    expect(result.sigla).toBe('SEPLA');
    expect(prisma.secretaria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sigla: 'SEPLA',
          nomeCompleto: 'Secretaria de Planejamento',
        }),
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('nao permite criar secretaria com sigla duplicada', async () => {
    prisma.secretaria.findFirst.mockResolvedValueOnce({ id: 'sec-1' } as never);

    await expect(
      service.create(
        {
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloqueia desativacao de secretaria ja inativa', async () => {
    prisma.secretaria.findUnique.mockResolvedValue({
      id: 'sec-2',
      sigla: 'SEMED',
      nomeCompleto: 'Secretaria de Educacao',
      ativo: false,
    } as never);

    await expect(service.remove('sec-2', actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('falha ao buscar secretaria inexistente', async () => {
    prisma.secretaria.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
