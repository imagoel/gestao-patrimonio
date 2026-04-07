import { ForbiddenException } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let prisma: jest.Mocked<PrismaService>;

  const admin = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  const consulta = {
    id: 'consulta-1',
    nome: 'Consulta',
    email: 'consulta@patrimonio.local',
    perfil: Perfil.USUARIO_CONSULTA,
    secretariaId: 'sec-1',
  };

  beforeEach(() => {
    prisma = {
      auditoria: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      usuario: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    service = new AuditoriaService(prisma);
  });

  it('lista auditorias para administrador', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      [
        {
          id: 'audit-1',
          entidade: 'Patrimonio',
          entidadeId: 'pat-1',
          acao: 'CRIACAO',
          usuarioId: admin.id,
          dadosAnteriores: null,
          dadosNovos: { tombo: '00025' },
          contexto: { patrimonioTombo: '00025' },
          createdAt: new Date(),
          usuario: {
            id: admin.id,
            nome: admin.nome,
            email: admin.email,
            perfil: admin.perfil,
            secretariaId: admin.secretariaId,
          },
        },
      ],
      1,
    ] as never);

    const result = await service.findAll(
      {
        search: '00025',
      },
      admin,
    );

    expect(prisma.auditoria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array),
        }),
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('retorna opcoes de filtro da auditoria', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      [{ entidade: 'Patrimonio' }],
      [{ acao: 'CRIACAO' }],
      [
        {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          perfil: admin.perfil,
          secretariaId: admin.secretariaId,
        },
      ],
    ] as never);

    const result = await service.findOptions(admin);

    expect(result.entidades).toEqual(['Patrimonio']);
    expect(result.acoes).toEqual(['CRIACAO']);
    expect(result.usuarios).toHaveLength(1);
  });

  it('bloqueia consulta de auditoria para usuario sem permissao', async () => {
    await expect(service.findAll({}, consulta)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
