import {
  EstadoConservacao,
  Perfil,
  StatusItem,
  TipoEntrada,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PatrimonioService } from '../patrimonio/patrimonio.service';
import { ImportacoesService } from './importacoes.service';

describe('ImportacoesService', () => {
  let service: ImportacoesService;
  let patrimonioService: jest.Mocked<PatrimonioService>;

  const actor: AuthenticatedUser = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  beforeEach(() => {
    patrimonioService = {
      findOptions: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<PatrimonioService>;

    service = new ImportacoesService(patrimonioService);
  });

  it('gera template CSV de patrimonio', () => {
    const template = service.buildPatrimoniosTemplate();

    expect(template.startsWith('\uFEFFitem;tombo;secretariaSigla;')).toBe(true);
    expect(template).toContain('Notebook Dell;00025;SEMED;');
  });

  it('importa linhas validas e reporta falhas por linha', async () => {
    patrimonioService.findOptions.mockResolvedValue({
      secretarias: [
        {
          id: 'sec-1',
          sigla: 'SEMED',
          nomeCompleto: 'Secretaria de Educacao',
        },
      ],
      responsaveis: [
        {
          id: 'resp-1',
          nome: 'Maria das Dores',
          setor: 'Patrimonio',
          secretariaId: 'sec-1',
          secretaria: {
            id: 'sec-1',
            sigla: 'SEMED',
            nomeCompleto: 'Secretaria de Educacao',
          },
        },
      ],
      fornecedores: [
        {
          id: 'forn-1',
          nome: 'Fornecedor Exemplo',
          cpfCnpj: null,
        },
      ],
      status: [StatusItem.ATIVO, StatusItem.INATIVO, StatusItem.EM_MANUTENCAO],
      estadosConservacao: Object.values(EstadoConservacao),
      tiposEntrada: Object.values(TipoEntrada),
    });

    patrimonioService.create.mockResolvedValueOnce({ id: 'pat-1' } as never);
    patrimonioService.create.mockRejectedValueOnce(
      new Error('Tombo ja cadastrado.'),
    );

    const file = {
      originalname: 'patrimonios.csv',
      mimetype: 'text/csv',
      size: 512,
      buffer: Buffer.from(
        [
          'item;tombo;secretariaSigla;localizacaoAtual;responsavelNome;responsavelSetor;estadoConservacao;status;fornecedorNome;tipoEntrada;valorOriginal;valorAtual;descricao;dataAquisicao;observacoes',
          'Notebook Dell;00025;SEMED;Laboratorio;Maria das Dores;Patrimonio;BOM;ATIVO;Fornecedor Exemplo;COMPRA;1450,90;;Equipamento;2026-03-18;Importacao inicial',
          'Notebook Reserva;00025;SEMED;Sala 02;Maria das Dores;Patrimonio;REGULAR;ATIVO;Fornecedor Exemplo;COMPRA;980,00;;;;Observacao',
        ].join('\n'),
        'utf-8',
      ),
    };

    const result = await service.importPatrimonios(file, actor);

    expect(result.totalLinhas).toBe(2);
    expect(result.importados).toBe(1);
    expect(result.falhas).toBe(1);
    expect(result.erros[0]).toMatchObject({
      linha: 3,
      tombo: '00025',
      mensagem: 'Tombo ja cadastrado.',
    });
    expect(patrimonioService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        item: 'Notebook Dell',
        tombo: '00025',
        secretariaAtualId: 'sec-1',
        responsavelAtualId: 'resp-1',
        estadoConservacao: EstadoConservacao.BOM,
        tipoEntrada: TipoEntrada.COMPRA,
        valorOriginal: 1450.9,
        dataAquisicao: '2026-03-18',
      }),
      actor,
    );
  });
});
