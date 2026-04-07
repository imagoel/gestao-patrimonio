import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsaveisService } from './responsaveis.service';

describe('ResponsaveisService', () => {
  let service: ResponsaveisService;
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
      responsavel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      secretaria: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new ResponsaveisService(prisma, auditoria);
  });

  it('cria responsavel com secretaria valida e auditoria', async () => {
    prisma.secretaria.findUnique.mockResolvedValueOnce({ id: 'sec-1' } as never);
    prisma.responsavel.create.mockResolvedValue({
      id: 'resp-1',
      nome: 'Maria de Souza',
      cargo: 'Coordenadora',
      setor: 'Almoxarifado',
      contato: 'maria@prefeitura.local',
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
        nome: '  Maria de Souza  ',
        cargo: ' Coordenadora ',
        setor: ' Almoxarifado ',
        contato: ' maria@prefeitura.local ',
        secretariaId: 'sec-1',
      },
      actor,
    );

    expect(result.nome).toBe('Maria de Souza');
    expect(prisma.responsavel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: 'Maria de Souza',
          cargo: 'Coordenadora',
          setor: 'Almoxarifado',
          contato: 'maria@prefeitura.local',
          secretariaId: 'sec-1',
        }),
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('nao permite criar responsavel com secretaria inexistente', async () => {
    prisma.secretaria.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          nome: 'Fulano',
          setor: 'Patrimonio',
          secretariaId: 'missing',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloqueia desativacao de responsavel ja inativo', async () => {
    prisma.responsavel.findUnique.mockResolvedValue({
      id: 'resp-2',
      nome: 'Inativo',
      cargo: null,
      setor: 'Arquivo',
      contato: null,
      ativo: false,
      secretariaId: 'sec-1',
    } as never);

    await expect(service.remove('resp-2', actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('falha ao buscar responsavel inexistente', async () => {
    prisma.responsavel.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
