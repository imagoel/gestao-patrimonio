import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Perfil,
  StatusInventario,
  StatusInventarioItem,
  StatusItem,
} from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventariosService } from './inventarios.service';

describe('InventariosService', () => {
  let service: InventariosService;
  let prisma: jest.Mocked<PrismaService>;
  let auditoria: jest.Mocked<AuditoriaService>;

  const admin = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  const chefe = {
    id: 'chefe-1',
    nome: 'Chefe',
    email: 'chefe@patrimonio.local',
    perfil: Perfil.CHEFE_SETOR,
    secretariaId: 'sec-1',
  };

  beforeEach(() => {
    prisma = {
      inventario: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventarioItem: {
        groupBy: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      patrimonio: {
        findMany: jest.fn(),
      },
      secretaria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      auditoria: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new InventariosService(prisma, auditoria);
  });

  it('cria inventario com itens snapshot e auditoria', async () => {
    prisma.$transaction
      .mockResolvedValueOnce([
        {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
          ativo: true,
        },
        null,
        [
          {
            id: 'pat-1',
            tombo: '00025',
            item: 'Notebook',
            localizacaoAtual: 'Sala 01',
            responsavelAtual: {
              nome: 'Maria',
            },
          },
        ],
      ] as never)
      .mockImplementationOnce(async (callback) => callback(prisma));

    prisma.inventario.create.mockResolvedValue({
      id: 'inv-1',
      titulo: 'Inventario 2026',
      secretariaId: 'sec-1',
      status: StatusInventario.ABERTO,
      observacoes: null,
      criadoPorId: admin.id,
      concluidoPorId: null,
      iniciadoEm: new Date(),
      concluidoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      secretaria: {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
      criadoPor: admin,
      concluidoPor: null,
      _count: {
        itens: 1,
      },
    } as never);
    prisma.inventarioItem.createMany.mockResolvedValue({ count: 1 } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.create(
      {
        titulo: 'Inventario 2026',
        secretariaId: 'sec-1',
      },
      admin,
    );

    expect(prisma.inventarioItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            patrimonioId: 'pat-1',
            tomboSnapshot: '00025',
          }),
        ],
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: 'Inventario',
        acao: 'CRIACAO',
      }),
      prisma,
    );
    expect(result.resumo.pendentes).toBe(1);
  });

  it('bloqueia novo inventario aberto para a mesma secretaria', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
        ativo: true,
      },
      {
        id: 'inv-open',
        titulo: 'Inventario em andamento',
      },
      [],
    ] as never);

    await expect(
      service.create(
        {
          titulo: 'Novo inventario',
          secretariaId: 'sec-1',
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite que chefe da mesma secretaria registre um item', async () => {
    prisma.inventario.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      titulo: 'Inventario 2026',
      secretariaId: 'sec-1',
      status: StatusInventario.ABERTO,
    } as never);
    prisma.inventarioItem.findFirst.mockResolvedValueOnce({
      id: 'item-1',
      inventarioId: 'inv-1',
      patrimonioId: 'pat-1',
      tomboSnapshot: '00025',
      itemSnapshot: 'Notebook',
      localizacaoSnapshot: 'Sala 01',
      responsavelSnapshotNome: 'Maria',
      status: StatusInventarioItem.PENDENTE,
      observacoes: null,
      registradoPorId: null,
      registradoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      registradoPor: null,
      patrimonio: {
        id: 'pat-1',
        tombo: '00025',
        item: 'Notebook',
        status: StatusItem.ATIVO,
        secretariaAtualId: 'sec-1',
        localizacaoAtual: 'Sala 01',
        responsavelAtualId: 'resp-1',
        secretariaAtual: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
        responsavelAtual: {
          id: 'resp-1',
          nome: 'Maria',
          setor: 'Patrimonio',
        },
      },
    } as never);
    prisma.$transaction.mockImplementationOnce(async (callback) => callback(prisma));
    prisma.inventarioItem.update.mockResolvedValueOnce({
      id: 'item-1',
      inventarioId: 'inv-1',
      patrimonioId: 'pat-1',
      tomboSnapshot: '00025',
      itemSnapshot: 'Notebook',
      localizacaoSnapshot: 'Sala 01',
      responsavelSnapshotNome: 'Maria',
      status: StatusInventarioItem.LOCALIZADO,
      observacoes: null,
      registradoPorId: chefe.id,
      registradoEm: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      registradoPor: chefe,
      patrimonio: {
        id: 'pat-1',
        tombo: '00025',
        item: 'Notebook',
        status: StatusItem.ATIVO,
        secretariaAtualId: 'sec-1',
        localizacaoAtual: 'Sala 01',
        responsavelAtualId: 'resp-1',
        secretariaAtual: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
        responsavelAtual: {
          id: 'resp-1',
          nome: 'Maria',
          setor: 'Patrimonio',
        },
      },
    } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.registrarItem(
      'inv-1',
      'item-1',
      {
        status: StatusInventarioItem.LOCALIZADO,
      },
      chefe,
    );

    expect(result.status).toBe(StatusInventarioItem.LOCALIZADO);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: 'InventarioItem',
        acao: 'REGISTRO_ITEM',
      }),
      prisma,
    );
  });

  it('bloqueia registro por chefe fora do proprio escopo', async () => {
    prisma.inventario.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      titulo: 'Inventario 2026',
      secretariaId: 'sec-2',
      status: StatusInventario.ABERTO,
    } as never);

    await expect(
      service.registrarItem(
        'inv-1',
        'item-1',
        {
          status: StatusInventarioItem.LOCALIZADO,
        },
        chefe,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia conclusao com itens pendentes', async () => {
    prisma.inventario.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      titulo: 'Inventario 2026',
      secretariaId: 'sec-1',
      status: StatusInventario.ABERTO,
      observacoes: null,
      criadoPorId: admin.id,
      concluidoPorId: null,
      iniciadoEm: new Date(),
      concluidoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      secretaria: {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
      criadoPor: admin,
      concluidoPor: null,
      _count: {
        itens: 2,
      },
    } as never);
    prisma.inventarioItem.groupBy.mockResolvedValueOnce([
      {
        inventarioId: 'inv-1',
        status: StatusInventarioItem.PENDENTE,
        _count: {
          _all: 1,
        },
      },
      {
        inventarioId: 'inv-1',
        status: StatusInventarioItem.LOCALIZADO,
        _count: {
          _all: 1,
        },
      },
    ] as never);

    await expect(service.concluir('inv-1', admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
