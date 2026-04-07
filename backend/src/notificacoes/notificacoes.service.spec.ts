import { Perfil, StatusMovimentacao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from './notificacoes.service';

describe('NotificacoesService', () => {
  let service: NotificacoesService;
  let prisma: jest.Mocked<PrismaService>;

  const admin = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  const chefeOrigem = {
    id: 'chefe-1',
    nome: 'Chefe Origem',
    email: 'chefe.origem@patrimonio.local',
    perfil: Perfil.CHEFE_SETOR,
    secretariaId: 'sec-1',
  };

  function makeMovimentacao(status: StatusMovimentacao) {
    return {
      id: 'mov-1',
      status,
      solicitadoEm: new Date('2026-04-06T12:00:00Z'),
      confirmadoEntregaEm:
        status !== StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA
          ? new Date('2026-04-06T13:00:00Z')
          : null,
      confirmadoRecebimentoEm:
        status === StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO
          ? new Date('2026-04-06T14:00:00Z')
          : null,
      updatedAt: new Date('2026-04-06T14:30:00Z'),
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
    };
  }

  beforeEach(() => {
    prisma = {
      movimentacao: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new NotificacoesService(prisma);
  });

  it('retorna notificacao acionavel de analise para administrador', async () => {
    prisma.movimentacao.findMany.mockResolvedValueOnce([
      makeMovimentacao(StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO),
    ] as never);
    prisma.movimentacao.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const result = await service.findAll({}, admin);

    expect(result.summary.actionRequired).toBe(1);
    expect(result.items[0]).toMatchObject({
      tipo: 'ANALISE_PENDENTE',
      requiresAction: true,
      route: '/movimentacoes/mov-1',
    });
  });

  it('retorna notificacao de entrega com acao requerida para chefe da origem', async () => {
    prisma.movimentacao.findMany.mockResolvedValueOnce([
      makeMovimentacao(StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA),
    ] as never);
    prisma.movimentacao.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const result = await service.findAll({}, chefeOrigem);

    expect(result.summary.total).toBe(1);
    expect(result.summary.actionRequired).toBe(1);
    expect(result.items[0]).toMatchObject({
      tipo: 'ENTREGA_PENDENTE',
      requiresAction: true,
      titulo: 'Confirme a entrega do item',
    });
  });
});
