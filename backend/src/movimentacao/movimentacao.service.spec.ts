import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Perfil,
  StatusItem,
  StatusMovimentacao,
} from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { MovimentacaoService } from './movimentacao.service';

describe('MovimentacaoService', () => {
  let service: MovimentacaoService;
  let prisma: jest.Mocked<PrismaService>;
  let auditoria: jest.Mocked<AuditoriaService>;

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

  const chefeDestino = {
    id: 'chefe-2',
    nome: 'Chefe Destino',
    email: 'chefe.destino@patrimonio.local',
    perfil: Perfil.CHEFE_SETOR,
    secretariaId: 'sec-2',
  };

  function makePatrimonio() {
    return {
      id: 'pat-1',
      item: 'Notebook Dell',
      tombo: '00025',
      secretariaAtualId: 'sec-1',
      localizacaoAtual: 'Sala 01',
      responsavelAtualId: 'resp-1',
      status: StatusItem.ATIVO,
      secretariaAtual: {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
      responsavelAtual: {
        id: 'resp-1',
        nome: 'Maria',
        setor: 'Coordenacao',
        secretariaId: 'sec-1',
        secretaria: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
      },
    };
  }

  function makeMovimentacao(
    overrides: Partial<Record<string, unknown>> = {},
  ) {
    return {
      id: 'mov-1',
      patrimonioId: 'pat-1',
      secretariaOrigemId: 'sec-1',
      localizacaoOrigem: 'Sala 01',
      secretariaDestinoId: 'sec-2',
      localizacaoDestino: 'Sala 15',
      responsavelOrigemId: 'resp-1',
      responsavelDestinoId: 'resp-2',
      solicitanteId: 'chefe-1',
      motivo: 'Troca de setor',
      observacoes: null,
      status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
      solicitadoEm: new Date(),
      confirmadoEntregaPorId: null,
      confirmadoEntregaEm: null,
      confirmadoRecebimentoPorId: null,
      confirmadoRecebimentoEm: null,
      validadoPorId: null,
      validadoEm: null,
      justificativaRejeicao: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      patrimonio: makePatrimonio(),
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
      responsavelOrigem: {
        id: 'resp-1',
        nome: 'Maria',
        setor: 'Coordenacao',
        secretariaId: 'sec-1',
        secretaria: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
      },
      responsavelDestino: {
        id: 'resp-2',
        nome: 'Joao',
        setor: 'Recepcao',
        secretariaId: 'sec-2',
        secretaria: {
          id: 'sec-2',
          sigla: 'SESAU',
          nomeCompleto: 'Secretaria de Saude',
        },
      },
      solicitante: {
        id: 'chefe-1',
        nome: 'Chefe Origem',
        email: 'chefe.origem@patrimonio.local',
        perfil: Perfil.CHEFE_SETOR,
        secretariaId: 'sec-1',
      },
      confirmadoEntregaPor: null,
      confirmadoRecebimentoPor: null,
      validadoPor: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      patrimonio: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      movimentacao: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      secretaria: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      responsavel: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      historicoPatrimonio: {
        create: jest.fn(),
      },
      auditoria: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new MovimentacaoService(prisma, auditoria);
  });

  it('cria movimentacao e marca o patrimonio como em movimentacao', async () => {
    const patrimonio = makePatrimonio();
    const movimentacaoCriada = makeMovimentacao();
    const tx = {
      movimentacao: {
        create: jest.fn().mockResolvedValue(movimentacaoCriada),
      },
      patrimonio: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      historicoPatrimonio: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
      },
      auditoria: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    prisma.patrimonio.findUnique.mockResolvedValueOnce(patrimonio as never);
    prisma.movimentacao.findFirst.mockResolvedValueOnce(null);
    prisma.secretaria.findUnique.mockResolvedValueOnce({
      id: 'sec-2',
      ativo: true,
    } as never);
    prisma.responsavel.findUnique.mockResolvedValueOnce({
      id: 'resp-2',
      ativo: true,
      secretariaId: 'sec-2',
    } as never);
    prisma.$transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(tx as never);
      }

      return input as never;
    });

    const result = await service.create(
      {
        patrimonioId: 'pat-1',
        secretariaDestinoId: 'sec-2',
        responsavelDestinoId: 'resp-2',
        localizacaoDestino: 'Sala 15',
        motivo: 'Troca de setor',
      },
      chefeOrigem,
    );

    expect(result.id).toBe('mov-1');
    expect(tx.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusItem.EM_MOVIMENTACAO,
        }),
      }),
    );
    expect(tx.historicoPatrimonio.create).toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('bloqueia criacao quando o patrimonio nao esta disponivel', async () => {
    prisma.patrimonio.findUnique.mockResolvedValueOnce({
      ...makePatrimonio(),
      status: StatusItem.EM_MOVIMENTACAO,
    } as never);

    await expect(
      service.create(
        {
          patrimonioId: 'pat-1',
          secretariaDestinoId: 'sec-2',
          responsavelDestinoId: 'resp-2',
          localizacaoDestino: 'Sala 15',
          motivo: 'Troca de setor',
        },
        chefeOrigem,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloqueia confirmacao de entrega fora do escopo do chefe', async () => {
    prisma.movimentacao.findUnique.mockResolvedValueOnce(
      makeMovimentacao() as never,
    );

    await expect(
      service.confirmarEntrega('mov-1', {}, chefeDestino),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aprova a movimentacao e atualiza o patrimonio para o destino', async () => {
    const movimentacaoPendente = makeMovimentacao({
      status: StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
    });
    const movimentacaoConcluida = makeMovimentacao({
      status: StatusMovimentacao.CONCLUIDA,
      validadoPorId: admin.id,
      validadoEm: new Date(),
    });
    const patrimonioAtualizado = {
      ...makePatrimonio(),
      secretariaAtualId: 'sec-2',
      localizacaoAtual: 'Sala 15',
      responsavelAtualId: 'resp-2',
      status: StatusItem.ATIVO,
      secretariaAtual: {
        id: 'sec-2',
        sigla: 'SESAU',
        nomeCompleto: 'Secretaria de Saude',
      },
      responsavelAtual: {
        id: 'resp-2',
        nome: 'Joao',
        setor: 'Recepcao',
        secretariaId: 'sec-2',
        secretaria: {
          id: 'sec-2',
          sigla: 'SESAU',
          nomeCompleto: 'Secretaria de Saude',
        },
      },
    };
    const tx = {
      movimentacao: {
        update: jest.fn().mockResolvedValue(movimentacaoConcluida),
      },
      patrimonio: {
        update: jest.fn().mockResolvedValue(patrimonioAtualizado),
      },
      historicoPatrimonio: {
        create: jest.fn().mockResolvedValue({ id: 'hist-2' }),
      },
      auditoria: {
        create: jest.fn().mockResolvedValue({ id: 'audit-2' }),
      },
    };

    prisma.movimentacao.findUnique.mockResolvedValueOnce(
      movimentacaoPendente as never,
    );
    prisma.$transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(tx as never);
      }

      return input as never;
    });

    const result = await service.analisar(
      'mov-1',
      {
        decisao: 'APROVAR',
      },
      admin,
    );

    expect(result.status).toBe(StatusMovimentacao.CONCLUIDA);
    expect(tx.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          secretariaAtualId: 'sec-2',
          localizacaoAtual: 'Sala 15',
          responsavelAtualId: 'resp-2',
          status: StatusItem.ATIVO,
        }),
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalled();
  });
});
