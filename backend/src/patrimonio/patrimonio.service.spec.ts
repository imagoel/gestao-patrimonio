import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EstadoConservacao,
  Perfil,
  StatusItem,
  TipoEntrada,
} from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatrimonioService } from './patrimonio.service';

describe('PatrimonioService', () => {
  let service: PatrimonioService;
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

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    prisma = {
      patrimonio: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
      fornecedor: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      historicoPatrimonio: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new PatrimonioService(prisma, auditoria);
  });

  it('cria patrimonio com historico e auditoria', async () => {
    prisma.secretaria.findUnique.mockResolvedValueOnce({ id: 'sec-1' } as never);
    prisma.responsavel.findUnique.mockResolvedValueOnce({
      id: 'resp-1',
      secretariaId: 'sec-1',
    } as never);
    prisma.patrimonio.findUnique.mockResolvedValueOnce(null);
    prisma.patrimonio.create.mockResolvedValue({
      id: 'pat-1',
      item: 'Notebook Dell',
      tombo: '00025',
      secretariaAtualId: 'sec-1',
      localizacaoAtual: 'Sala 01',
      responsavelAtualId: 'resp-1',
      estadoConservacao: EstadoConservacao.BOM,
      status: StatusItem.ATIVO,
      fornecedorId: null,
      tipoEntrada: TipoEntrada.COMPRA,
      valorOriginal: '3500.00',
      valorAtual: null,
      descricao: null,
      dataAquisicao: null,
      observacoes: null,
      createdById: admin.id,
      updatedById: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      fornecedor: null,
    } as never);
    prisma.historicoPatrimonio.create.mockResolvedValue({ id: 'hist-1' } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.create(
      {
        item: ' Notebook Dell ',
        tombo: '00025',
        secretariaAtualId: 'sec-1',
        localizacaoAtual: ' Sala 01 ',
        responsavelAtualId: 'resp-1',
        estadoConservacao: EstadoConservacao.BOM,
        tipoEntrada: TipoEntrada.COMPRA,
        valorOriginal: 3500,
      },
      admin,
    );

    expect(result.tombo).toBe('00025');
    expect(prisma.patrimonio.create).toHaveBeenCalled();
    expect(prisma.historicoPatrimonio.create).toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('nao permite criar patrimonio com tombo duplicado', async () => {
    prisma.secretaria.findUnique.mockResolvedValueOnce({ id: 'sec-1' } as never);
    prisma.responsavel.findUnique.mockResolvedValueOnce({
      id: 'resp-1',
      secretariaId: 'sec-1',
    } as never);
    prisma.patrimonio.findUnique.mockResolvedValueOnce({ id: 'pat-1' } as never);

    await expect(
      service.create(
        {
          item: 'Notebook',
          tombo: '00025',
          secretariaAtualId: 'sec-1',
          localizacaoAtual: 'Sala 01',
          responsavelAtualId: 'resp-1',
          estadoConservacao: EstadoConservacao.BOM,
          tipoEntrada: TipoEntrada.COMPRA,
          valorOriginal: 3500,
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('nao permite definir status baixado diretamente no cadastro', async () => {
    await expect(
      service.create(
        {
          item: 'Notebook',
          tombo: '00025',
          secretariaAtualId: 'sec-1',
          localizacaoAtual: 'Sala 01',
          responsavelAtualId: 'resp-1',
          estadoConservacao: EstadoConservacao.BOM,
          status: StatusItem.BAIXADO,
          tipoEntrada: TipoEntrada.COMPRA,
          valorOriginal: 3500,
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aplica escopo de secretaria para chefe de setor na listagem', async () => {
    prisma.$transaction.mockResolvedValueOnce([[], 0] as never);

    await service.findAll({}, chefeSetor);

    expect(prisma.patrimonio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          secretariaAtualId: 'sec-1',
        }),
      }),
    );
  });

  it('bloqueia consulta fora do escopo do chefe de setor', async () => {
    prisma.patrimonio.findUnique.mockResolvedValue({
      id: 'pat-1',
      item: 'Notebook Dell',
      tombo: '00025',
      secretariaAtualId: 'sec-2',
      localizacaoAtual: 'Sala 01',
      responsavelAtualId: 'resp-1',
      estadoConservacao: EstadoConservacao.BOM,
      status: StatusItem.ATIVO,
      fornecedorId: null,
      tipoEntrada: TipoEntrada.COMPRA,
      valorOriginal: '3500.00',
      valorAtual: null,
      descricao: null,
      dataAquisicao: null,
      observacoes: null,
      createdById: admin.id,
      updatedById: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      secretariaAtual: {
        id: 'sec-2',
        sigla: 'SESAU',
        nomeCompleto: 'Secretaria de Saude',
      },
      responsavelAtual: {
        id: 'resp-1',
        nome: 'Maria',
        setor: 'Patrimonio',
        secretariaId: 'sec-2',
        secretaria: {
          id: 'sec-2',
          sigla: 'SESAU',
          nomeCompleto: 'Secretaria de Saude',
        },
      },
      fornecedor: null,
    } as never);

    await expect(service.findOne('pat-1', chefeSetor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('retorna historico do patrimonio dentro do escopo', async () => {
    prisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'pat-1',
      secretariaAtualId: 'sec-1',
    } as never);
    prisma.historicoPatrimonio.findMany.mockResolvedValueOnce([
      {
        id: 'hist-1',
        patrimonioId: 'pat-1',
        usuarioId: admin.id,
        movimentacaoId: null,
        baixaPatrimonialId: null,
        evento: 'CRIACAO',
        descricao: 'Patrimonio cadastrado.',
        dadosAnteriores: null,
        dadosNovos: { tombo: '00025' },
        criadoEm: new Date(),
        usuario: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          perfil: admin.perfil,
          secretariaId: admin.secretariaId,
        },
        movimentacao: null,
        baixaPatrimonial: null,
      },
    ] as never);

    const result = await service.findHistorico('pat-1', chefeSetor);

    expect(prisma.historicoPatrimonio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patrimonioId: 'pat-1',
        },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('bloqueia historico fora do escopo do chefe de setor', async () => {
    prisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'pat-1',
      secretariaAtualId: 'sec-2',
    } as never);

    await expect(
      service.findHistorico('pat-1', chefeSetor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('retorna avaliacao de valor atual com estimativa quando houver data de aquisicao', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-06T12:00:00Z').getTime());
    prisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'pat-1',
      item: 'Notebook Dell',
      tombo: '00025',
      secretariaAtualId: 'sec-1',
      localizacaoAtual: 'Sala 01',
      responsavelAtualId: 'resp-1',
      estadoConservacao: EstadoConservacao.BOM,
      status: StatusItem.ATIVO,
      fornecedorId: null,
      tipoEntrada: TipoEntrada.COMPRA,
      valorOriginal: '3500.00',
      valorAtual: null,
      descricao: null,
      dataAquisicao: new Date('2025-04-06T00:00:00Z'),
      observacoes: null,
      createdById: admin.id,
      updatedById: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      fornecedor: null,
    } as never);

    const result = await service.findAvaliacaoValorAtual('pat-1', admin);

    expect(result.modoAtual).toBe('ESTIMADO');
    expect(result.valorAtualSugerido).toBe('2992.50');
  });

  it('aplica o valor atual estimado com historico e auditoria', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-06T12:00:00Z').getTime());
    const existing = {
      id: 'pat-1',
      item: 'Notebook Dell',
      tombo: '00025',
      secretariaAtualId: 'sec-1',
      localizacaoAtual: 'Sala 01',
      responsavelAtualId: 'resp-1',
      estadoConservacao: EstadoConservacao.BOM,
      status: StatusItem.ATIVO,
      fornecedorId: null,
      tipoEntrada: TipoEntrada.COMPRA,
      valorOriginal: '3500.00',
      valorAtual: null,
      descricao: null,
      dataAquisicao: new Date('2025-04-06T00:00:00Z'),
      observacoes: null,
      createdById: admin.id,
      updatedById: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      fornecedor: null,
    };

    prisma.patrimonio.findUnique.mockResolvedValueOnce(existing as never);
    prisma.patrimonio.update.mockResolvedValueOnce({
      ...existing,
      valorAtual: '2992.50',
      updatedById: admin.id,
    } as never);
    prisma.historicoPatrimonio.create.mockResolvedValue({ id: 'hist-1' } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.aplicarValorAtualEstimado('pat-1', admin);

    expect(result.valorAtual).toBe('2992.50');
    expect(prisma.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAtual: 2992.5,
        }),
      }),
    );
    expect(prisma.historicoPatrimonio.create).toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'APLICACAO_VALOR_ESTIMADO',
      }),
    );
  });

  it('retorna options completas para administrador', async () => {
    prisma.secretaria.findMany.mockResolvedValueOnce([
      {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
    ] as never);
    prisma.responsavel.findMany.mockResolvedValueOnce([
      {
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
    ] as never);
    prisma.fornecedor.findMany.mockResolvedValueOnce([
      {
        id: 'forn-1',
        nome: 'Fornecedor Teste',
        cpfCnpj: '12345678901234',
      },
    ] as never);
    prisma.$transaction.mockResolvedValueOnce([
      [
        {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
      ],
      [
        {
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
      ],
      [
        {
          id: 'forn-1',
          nome: 'Fornecedor Teste',
          cpfCnpj: '12345678901234',
        },
      ],
    ] as never);

    const result = await service.findOptions(admin);

    expect(prisma.secretaria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
        },
      }),
    );
    expect(prisma.responsavel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
        },
      }),
    );
    expect(prisma.fornecedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
        },
      }),
    );
    expect(result.status).toContain(StatusItem.ATIVO);
    expect(result.estadosConservacao).toContain(EstadoConservacao.BOM);
    expect(result.tiposEntrada).toContain(TipoEntrada.COMPRA);
  });

  it('restringe options ao escopo do chefe de setor', async () => {
    prisma.secretaria.findMany.mockResolvedValueOnce([
      {
        id: 'sec-1',
        sigla: 'SEMED',
        nomeCompleto: 'Secretaria de Educacao',
      },
    ] as never);
    prisma.responsavel.findMany.mockResolvedValueOnce([
      {
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
    ] as never);
    prisma.fornecedor.findMany.mockResolvedValueOnce([] as never);
    prisma.$transaction.mockResolvedValueOnce([
      [
        {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
      ],
      [
        {
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
      ],
      [],
    ] as never);

    const result = await service.findOptions(chefeSetor);

    expect(prisma.secretaria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          id: 'sec-1',
        },
      }),
    );
    expect(prisma.responsavel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          secretariaId: 'sec-1',
        },
      }),
    );
    expect(result.secretarias).toHaveLength(1);
    expect(result.secretarias[0].id).toBe('sec-1');
  });
});
