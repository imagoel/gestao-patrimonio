import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  MotivoBaixa,
  Perfil,
  StatusItem,
} from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { BaixaService } from './baixa.service';

describe('BaixaService', () => {
  let service: BaixaService;
  let prisma: jest.Mocked<PrismaService>;
  let auditoria: jest.Mocked<AuditoriaService>;

  const admin = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  const chefeSetor = {
    id: 'chefe-1',
    nome: 'Chefe',
    email: 'chefe@patrimonio.local',
    perfil: Perfil.CHEFE_SETOR,
    secretariaId: 'sec-1',
  };

  function makePatrimonio(overrides: Partial<Record<string, unknown>> = {}) {
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
        setor: 'Patrimonio',
        secretariaId: 'sec-1',
        secretaria: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
      },
      baixa: null,
      ...overrides,
    };
  }

  function makeBaixa(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'baixa-1',
      patrimonioId: 'pat-1',
      usuarioId: admin.id,
      motivo: MotivoBaixa.INSERVIVEL,
      observacoes: 'Equipamento sem recuperacao.',
      baixadoEm: new Date(),
      patrimonio: {
        id: 'pat-1',
        item: 'Notebook Dell',
        tombo: '00025',
        secretariaAtualId: 'sec-1',
        localizacaoAtual: 'Sala 01',
        responsavelAtualId: 'resp-1',
        status: StatusItem.BAIXADO,
        secretariaAtual: {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
        responsavelAtual: {
          id: 'resp-1',
          nome: 'Maria',
          setor: 'Patrimonio',
          secretariaId: 'sec-1',
          secretaria: {
            id: 'sec-1',
            sigla: 'SEMED',
            nomeCompleto: 'Secretaria de Educacao',
          },
        },
      },
      usuario: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        perfil: admin.perfil,
        secretariaId: admin.secretariaId,
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      patrimonio: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      baixaPatrimonial: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      secretaria: {
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

    service = new BaixaService(prisma, auditoria);
  });

  it('registra baixa e atualiza o patrimonio para BAIXADO', async () => {
    const patrimonio = makePatrimonio();
    const patrimonioBaixado = makePatrimonio({ status: StatusItem.BAIXADO });
    const baixaCompleta = makeBaixa();
    const tx = {
      baixaPatrimonial: {
        create: jest.fn().mockResolvedValue({ id: 'baixa-1' }),
        findUnique: jest.fn().mockResolvedValue(baixaCompleta),
      },
      patrimonio: {
        update: jest.fn().mockResolvedValue(patrimonioBaixado),
      },
      historicoPatrimonio: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
      },
      auditoria: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    prisma.patrimonio.findUnique.mockResolvedValueOnce(patrimonio as never);
    prisma.$transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(tx as never);
      }

      return input as never;
    });

    const result = await service.create(
      {
        patrimonioId: 'pat-1',
        motivo: MotivoBaixa.INSERVIVEL,
        observacoes: 'Equipamento sem recuperacao.',
      },
      admin,
    );

    expect(result.id).toBe('baixa-1');
    expect(tx.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusItem.BAIXADO,
        }),
      }),
    );
    expect(tx.historicoPatrimonio.create).toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('nao permite baixar patrimonio em movimentacao', async () => {
    prisma.patrimonio.findUnique.mockResolvedValueOnce(
      makePatrimonio({ status: StatusItem.EM_MOVIMENTACAO }) as never,
    );

    await expect(
      service.create(
        {
          patrimonioId: 'pat-1',
          motivo: MotivoBaixa.INSERVIVEL,
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aplica escopo de secretaria na listagem para chefe de setor', async () => {
    prisma.$transaction.mockResolvedValueOnce([[], 0] as never);

    await service.findAll({}, chefeSetor);

    expect(prisma.baixaPatrimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              patrimonio: {
                secretariaAtualId: 'sec-1',
              },
            }),
          ]),
        }),
      }),
    );
  });

  it('bloqueia consulta fora do escopo do chefe de setor', async () => {
    prisma.baixaPatrimonial.findUnique.mockResolvedValueOnce(
      makeBaixa({
        patrimonio: {
          ...makeBaixa().patrimonio,
          secretariaAtualId: 'sec-2',
        },
      }) as never,
    );

    await expect(service.findOne('baixa-1', chefeSetor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
