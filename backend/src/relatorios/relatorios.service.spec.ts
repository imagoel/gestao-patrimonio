import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Perfil,
  StatusItem,
  StatusMovimentacao,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RelatoriosService } from './relatorios.service';

describe('RelatoriosService', () => {
  let service: RelatoriosService;
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
      secretaria: {
        findMany: jest.fn(),
      },
      responsavel: {
        findMany: jest.fn(),
      },
      patrimonio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      movimentacao: {
        findMany: jest.fn(),
      },
      auditoria: {
        findMany: jest.fn(),
      },
      baixaPatrimonial: {
        findMany: jest.fn(),
      },
      historicoPatrimonio: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    service = new RelatoriosService(prisma);
  });

  it('gera PDF de patrimonio para administrador', async () => {
    prisma.patrimonio.findMany.mockResolvedValueOnce([
      {
        id: 'pat-1',
        tombo: '00025',
        item: 'Notebook Dell',
        localizacaoAtual: 'Sala 01',
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
        },
      },
    ] as never);

    const buffer = await service.gerarRelatorioPatrimonio({}, admin);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('gera PDF de movimentacoes para administrador', async () => {
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
        solicitante: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
        },
      },
    ] as never);

    const buffer = await service.gerarRelatorioMovimentacoes({}, admin);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('gera PDF de auditoria de movimentacoes para administrador', async () => {
    prisma.auditoria.findMany.mockResolvedValueOnce([
      {
        id: 'audit-1',
        entidade: 'Movimentacao',
        entidadeId: 'mov-1',
        acao: 'CRIACAO',
        usuarioId: admin.id,
        contexto: {
          patrimonioTombo: '00025',
        },
        createdAt: new Date('2026-04-06T12:00:00Z'),
        usuario: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
        },
      },
    ] as never);
    prisma.movimentacao.findMany.mockResolvedValueOnce([
      {
        id: 'mov-1',
        status: StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
        patrimonio: {
          id: 'pat-1',
          tombo: '00025',
          item: 'Notebook Dell',
        },
        secretariaOrigem: {
          id: 'sec-1',
          sigla: 'SEMED',
        },
        secretariaDestino: {
          id: 'sec-2',
          sigla: 'SESAU',
        },
      },
    ] as never);

    const buffer = await service.gerarRelatorioAuditoriaMovimentacoes(
      {},
      admin,
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('bloqueia emissao de relatorios para usuario sem permissao', async () => {
    await expect(service.gerarRelatorioBaixas({}, consulta)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('falha quando o patrimonio do historico nao existe', async () => {
    prisma.patrimonio.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.gerarRelatorioHistoricoPatrimonio('pat-inexistente', admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
