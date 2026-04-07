import {
  MotivoBaixa,
  Perfil,
  StatusItem,
  StatusMovimentacao,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
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
      patrimonio: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      movimentacao: {
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      baixaPatrimonial: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      secretaria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new DashboardService(prisma);
  });

  it('retorna indicadores globais para administrador', async () => {
    prisma.patrimonio.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    prisma.movimentacao.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    prisma.baixaPatrimonial.count.mockResolvedValueOnce(1);
    prisma.patrimonio.groupBy
      .mockResolvedValueOnce([
        {
          status: StatusItem.ATIVO,
          _count: {
            _all: 8,
          },
        },
        {
          status: StatusItem.EM_MOVIMENTACAO,
          _count: {
            _all: 2,
          },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          secretariaAtualId: 'sec-1',
          _count: {
            _all: 7,
          },
        },
        {
          secretariaAtualId: 'sec-2',
          _count: {
            _all: 5,
          },
        },
      ] as never);
    prisma.movimentacao.groupBy.mockResolvedValueOnce([
      {
        status: StatusMovimentacao.CONCLUIDA,
        _count: {
          _all: 4,
        },
      },
      {
        status: StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
        _count: {
          _all: 3,
        },
      },
    ] as never);
    prisma.movimentacao.findMany.mockResolvedValueOnce([
      {
        id: 'mov-1',
        status: StatusMovimentacao.CONCLUIDA,
        solicitadoEm: new Date('2026-04-06T12:00:00Z'),
        patrimonio: {
          id: 'pat-1',
          tombo: '00025',
          item: 'Notebook Dell',
        },
        secretariaOrigem: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
        secretariaDestino: {
          id: 'sec-2',
          sigla: 'SESAU',
          nomeCompleto: 'Secretaria de Saude',
        },
      },
    ] as never);
    prisma.baixaPatrimonial.findMany.mockResolvedValueOnce([
      {
        id: 'baixa-1',
        motivo: MotivoBaixa.INSERVIVEL,
        baixadoEm: new Date('2026-04-06T12:30:00Z'),
        patrimonio: {
          id: 'pat-2',
          tombo: '00026',
          item: 'Impressora',
          secretariaAtual: {
            id: 'sec-1',
            sigla: 'SEMED',
            nomeCompleto: 'Secretaria de Educacao',
          },
        },
        usuario: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
        },
      },
    ] as never);
    prisma.secretaria.findMany.mockResolvedValueOnce([
      {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
      {
        id: 'sec-2',
        sigla: 'SESAU',
        nomeCompleto: 'Secretaria de Saude',
      },
    ] as never);

    const overview = await service.findOverview(admin);

    expect(overview.escopo.tipo).toBe('GLOBAL');
    expect(overview.escopo.secretaria).toBeNull();
    expect(overview.indicadores.patrimonioTotal).toBe(12);
    expect(overview.indicadores.movimentacoesPendentes).toBe(3);
    expect(overview.patrimonioPorSecretaria[0]).toMatchObject({
      id: 'sec-1',
      sigla: 'SEMED',
      total: 7,
    });
    expect(overview.movimentacoesRecentes).toHaveLength(1);
    expect(overview.baixasRecentes).toHaveLength(1);
  });

  it('retorna escopo de secretaria para usuario de consulta', async () => {
    prisma.patrimonio.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.movimentacao.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    prisma.baixaPatrimonial.count.mockResolvedValueOnce(0);
    prisma.patrimonio.groupBy
      .mockResolvedValueOnce([
        {
          status: StatusItem.ATIVO,
          _count: {
            _all: 4,
          },
        },
        {
          status: StatusItem.EM_MOVIMENTACAO,
          _count: {
            _all: 1,
          },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          secretariaAtualId: 'sec-1',
          _count: {
            _all: 5,
          },
        },
      ] as never);
    prisma.movimentacao.groupBy.mockResolvedValueOnce([
      {
        status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
        _count: {
          _all: 2,
        },
      },
      {
        status: StatusMovimentacao.CONCLUIDA,
        _count: {
          _all: 1,
        },
      },
    ] as never);
    prisma.movimentacao.findMany.mockResolvedValueOnce([] as never);
    prisma.baixaPatrimonial.findMany.mockResolvedValueOnce([] as never);
    prisma.secretaria.findUnique.mockResolvedValueOnce({
      id: 'sec-1',
      sigla: 'SEMED',
      nomeCompleto: 'Secretaria de Educacao',
    } as never);
    prisma.secretaria.findMany.mockResolvedValueOnce([
      {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
    ] as never);

    const overview = await service.findOverview(consulta);

    expect(overview.escopo.tipo).toBe('SECRETARIA');
    expect(overview.escopo.secretaria).toMatchObject({
      id: 'sec-1',
      sigla: 'SEMED',
    });
    expect(overview.indicadores.patrimoniosAtivos).toBe(4);
    expect(overview.patrimonioPorSecretaria).toEqual([
      expect.objectContaining({
        id: 'sec-1',
        total: 5,
      }),
    ]);
  });
});
