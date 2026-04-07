import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MotivoBaixa,
  Prisma,
  StatusItem,
  StatusMovimentacao,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { assertCanEmitRelatorios } from '../common/permissions/relatorios.permissions';
import { formatDateTimePtBr } from '../common/utils/date.utils';
import {
  normalizeDisplayText,
  normalizeOptionalText,
} from '../common/utils/string.utils';
import { PrismaService } from '../prisma/prisma.service';
import { RelatorioAuditoriaMovimentacaoDto } from './dto/relatorio-auditoria-movimentacao.dto';
import { RelatorioBaixaDto } from './dto/relatorio-baixa.dto';
import { RelatorioMovimentacaoDto } from './dto/relatorio-movimentacao.dto';
import { RelatorioPatrimonioDto } from './dto/relatorio-patrimonio.dto';
import { buildAuditoriaMovimentacaoReportDefinition } from './pdf/auditoria-movimentacao-report.builder';
import { buildBaixaReportDefinition } from './pdf/baixa-report.builder';
import {
  buildPatrimonioByLocationReportDefinition,
  buildPatrimonioHistoricoReportDefinition,
  buildPatrimonioReportDefinition,
} from './pdf/patrimonio-report.builder';
import { buildMovimentacaoReportDefinition } from './pdf/movimentacao-report.builder';

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

pdfMake.addVirtualFileSystem(pdfFonts);

type PdfDocumentDefinition = Record<string, unknown>;

const MOVIMENTACAO_PENDENTE_STATUSES = [
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_ENTREGA,
  StatusMovimentacao.AGUARDANDO_CONFIRMACAO_RECEBIMENTO,
  StatusMovimentacao.AGUARDANDO_APROVACAO_PATRIMONIO,
] as const;

const patrimonioReportSelect = {
  id: true,
  tombo: true,
  item: true,
  localizacaoAtual: true,
  status: true,
  secretariaAtual: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  responsavelAtual: {
    select: {
      id: true,
      nome: true,
      setor: true,
    },
  },
} satisfies Prisma.PatrimonioSelect;

const movimentacaoReportSelect = {
  id: true,
  status: true,
  solicitadoEm: true,
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
    },
  },
  secretariaOrigem: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  secretariaDestino: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  solicitante: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
} satisfies Prisma.MovimentacaoSelect;

const baixaReportSelect = {
  id: true,
  motivo: true,
  baixadoEm: true,
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
      secretariaAtual: {
        select: {
          id: true,
          sigla: true,
          nomeCompleto: true,
        },
      },
    },
  },
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
} satisfies Prisma.BaixaPatrimonialSelect;

const patrimonioHistoricoHeaderSelect = {
  id: true,
  tombo: true,
  item: true,
  localizacaoAtual: true,
  status: true,
  secretariaAtualId: true,
  secretariaAtual: {
    select: {
      id: true,
      sigla: true,
      nomeCompleto: true,
    },
  },
  responsavelAtual: {
    select: {
      id: true,
      nome: true,
      setor: true,
    },
  },
} satisfies Prisma.PatrimonioSelect;

const patrimonioHistoricoSelect = {
  id: true,
  evento: true,
  descricao: true,
  criadoEm: true,
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
  movimentacao: {
    select: {
      id: true,
      status: true,
    },
  },
  baixaPatrimonial: {
    select: {
      id: true,
      motivo: true,
      baixadoEm: true,
    },
  },
} satisfies Prisma.HistoricoPatrimonioSelect;

const auditoriaMovimentacaoSelect = {
  id: true,
  entidade: true,
  entidadeId: true,
  acao: true,
  usuarioId: true,
  contexto: true,
  createdAt: true,
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
} satisfies Prisma.AuditoriaSelect;

const auditoriaMovimentacaoItemSelect = {
  id: true,
  status: true,
  patrimonio: {
    select: {
      id: true,
      tombo: true,
      item: true,
    },
  },
  secretariaOrigem: {
    select: {
      id: true,
      sigla: true,
    },
  },
  secretariaDestino: {
    select: {
      id: true,
      sigla: true,
    },
  },
} satisfies Prisma.MovimentacaoSelect;

@Injectable()
export class RelatoriosService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOptions(actor: AuthenticatedUser) {
    assertCanEmitRelatorios(actor);

    const [
      secretarias,
      responsaveis,
      patrimonios,
      acoesAuditoriaMovimentacao,
      usuariosAuditoriaMovimentacao,
    ] = await this.prismaService.$transaction([
      this.prismaService.secretaria.findMany({
        where: {
          ativo: true,
        },
        orderBy: {
          sigla: 'asc',
        },
        select: {
          id: true,
          sigla: true,
          nomeCompleto: true,
        },
      }),
      this.prismaService.responsavel.findMany({
        where: {
          ativo: true,
        },
        orderBy: {
          nome: 'asc',
        },
        select: {
          id: true,
          nome: true,
          setor: true,
          secretariaId: true,
          secretaria: {
            select: {
              id: true,
              sigla: true,
              nomeCompleto: true,
            },
          },
        },
      }),
      this.prismaService.patrimonio.findMany({
        orderBy: {
          tombo: 'asc',
        },
        select: {
          id: true,
          tombo: true,
          item: true,
          status: true,
        },
      }),
      this.prismaService.auditoria.findMany({
        where: {
          entidade: 'Movimentacao',
        },
        distinct: ['acao'],
        orderBy: {
          acao: 'asc',
        },
        select: {
          acao: true,
        },
      }),
      this.prismaService.usuario.findMany({
        where: {
          auditorias: {
            some: {
              entidade: 'Movimentacao',
            },
          },
        },
        orderBy: {
          nome: 'asc',
        },
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
          secretariaId: true,
        },
      }),
    ]);

    return {
      secretarias,
      responsaveis,
      patrimonios,
      statusPatrimonio: Object.values(StatusItem),
      statusMovimentacao: Object.values(StatusMovimentacao),
      motivosBaixa: Object.values(MotivoBaixa),
      acoesAuditoriaMovimentacao: acoesAuditoriaMovimentacao.map(
        (item) => item.acao,
      ),
      usuariosAuditoriaMovimentacao,
    };
  }

  async gerarRelatorioPatrimonio(
    filters: RelatorioPatrimonioDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const where = this.buildPatrimonioWhere(filters);

    const items = await this.prismaService.patrimonio.findMany({
      where,
      orderBy: [{ secretariaAtual: { sigla: 'asc' } }, { tombo: 'asc' }],
      select: patrimonioReportSelect,
    });

    const doc = buildPatrimonioReportDefinition({
      titulo: 'Relatorio de Patrimonio',
      subtitulo: 'Bens patrimoniais conforme os filtros selecionados.',
      filtros: this.buildPatrimonioFiltersSummary(filters),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      rows: items.map((item) => ({
        tombo: item.tombo,
        item: item.item,
        secretaria: item.secretariaAtual.sigla,
        responsavel: `${item.responsavelAtual.nome} - ${item.responsavelAtual.setor}`,
        localizacao: item.localizacaoAtual,
        status: item.status,
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioBensPorLocalizacao(
    filters: RelatorioPatrimonioDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const items = await this.prismaService.patrimonio.findMany({
      where: this.buildPatrimonioWhere(filters),
      orderBy: [
        { localizacaoAtual: 'asc' },
        { secretariaAtual: { sigla: 'asc' } },
        { tombo: 'asc' },
      ],
      select: patrimonioReportSelect,
    });

    const groups = Array.from(
      items.reduce<
        Map<
          string,
          Array<{
            tombo: string;
            item: string;
            secretaria: string;
            responsavel: string;
            status: StatusItem;
          }>
        >
      >((accumulator, item) => {
        const groupKey = normalizeDisplayText(item.localizacaoAtual);
        const current = accumulator.get(groupKey) ?? [];

        current.push({
          tombo: item.tombo,
          item: item.item,
          secretaria: item.secretariaAtual.sigla,
          responsavel: `${item.responsavelAtual.nome} - ${item.responsavelAtual.setor}`,
          status: item.status,
        });
        accumulator.set(groupKey, current);

        return accumulator;
      }, new Map()),
    ).map(([localizacao, rows]) => ({
      localizacao,
      total: rows.length,
      rows,
    }));

    const doc = buildPatrimonioByLocationReportDefinition({
      titulo: 'Relatorio de Bens por Localizacao Fisica',
      subtitulo:
        'Bens patrimoniais agrupados pela localizacao fisica atualmente informada.',
      filtros: this.buildPatrimonioFiltersSummary(filters),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      totalLocalizacoes: groups.length,
      groups,
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioBensInativos(
    filters: RelatorioPatrimonioDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const where = this.buildPatrimonioWhere(filters, {
      status: StatusItem.INATIVO,
    });

    const items = await this.prismaService.patrimonio.findMany({
      where,
      orderBy: [{ secretariaAtual: { sigla: 'asc' } }, { tombo: 'asc' }],
      select: patrimonioReportSelect,
    });

    const doc = buildPatrimonioReportDefinition({
      titulo: 'Relatorio de Bens Inativos',
      subtitulo:
        'Bens patrimoniais atualmente marcados como inativos no sistema.',
      filtros: this.buildPatrimonioFiltersSummary({
        ...filters,
        status: StatusItem.INATIVO,
      }),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      rows: items.map((item) => ({
        tombo: item.tombo,
        item: item.item,
        secretaria: item.secretariaAtual.sigla,
        responsavel: `${item.responsavelAtual.nome} - ${item.responsavelAtual.setor}`,
        localizacao: item.localizacaoAtual,
        status: item.status,
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioMovimentacoes(
    filters: RelatorioMovimentacaoDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const where = this.buildMovimentacaoWhere(filters);

    const items = await this.prismaService.movimentacao.findMany({
      where,
      orderBy: [{ solicitadoEm: 'desc' }],
      select: movimentacaoReportSelect,
    });

    const doc = buildMovimentacaoReportDefinition({
      titulo: 'Relatorio de Movimentacoes',
      subtitulo:
        'Movimentacoes patrimoniais com foco em acompanhamento operacional.',
      filtros: this.buildMovimentacaoFiltersSummary(filters),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      rows: items.map((item) => ({
        tombo: item.patrimonio.tombo,
        item: item.patrimonio.item,
        origem: item.secretariaOrigem.sigla,
        destino: item.secretariaDestino.sigla,
        status: item.status,
        solicitante: item.solicitante.nome,
        solicitadoEm: formatDateTimePtBr(item.solicitadoEm),
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioMovimentacoesPendentes(
    filters: RelatorioMovimentacaoDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const items = await this.prismaService.movimentacao.findMany({
      where: this.buildMovimentacaoWhere(filters, {
        status: {
          in: [...MOVIMENTACAO_PENDENTE_STATUSES],
        },
      }),
      orderBy: [{ solicitadoEm: 'desc' }],
      select: movimentacaoReportSelect,
    });

    const doc = buildMovimentacaoReportDefinition({
      titulo: 'Relatorio de Movimentacoes Pendentes',
      subtitulo:
        'Movimentacoes ainda em andamento no fluxo operacional patrimonial.',
      filtros: this.buildMovimentacaoFiltersSummary(
        {
          secretariaId: filters.secretariaId,
        },
        ['Somente movimentacoes pendentes'],
      ),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      rows: items.map((item) => ({
        tombo: item.patrimonio.tombo,
        item: item.patrimonio.item,
        origem: item.secretariaOrigem.sigla,
        destino: item.secretariaDestino.sigla,
        status: item.status,
        solicitante: item.solicitante.nome,
        solicitadoEm: formatDateTimePtBr(item.solicitadoEm),
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioMovimentacoesConcluidas(
    filters: RelatorioMovimentacaoDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const items = await this.prismaService.movimentacao.findMany({
      where: this.buildMovimentacaoWhere(filters, {
        status: StatusMovimentacao.CONCLUIDA,
      }),
      orderBy: [{ solicitadoEm: 'desc' }],
      select: movimentacaoReportSelect,
    });

    const doc = buildMovimentacaoReportDefinition({
      titulo: 'Relatorio de Movimentacoes Concluidas',
      subtitulo:
        'Movimentacoes patrimoniais finalizadas com aprovacao do patrimonio.',
      filtros: this.buildMovimentacaoFiltersSummary(
        {
          secretariaId: filters.secretariaId,
          status: StatusMovimentacao.CONCLUIDA,
        },
        [],
      ),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      rows: items.map((item) => ({
        tombo: item.patrimonio.tombo,
        item: item.patrimonio.item,
        origem: item.secretariaOrigem.sigla,
        destino: item.secretariaDestino.sigla,
        status: item.status,
        solicitante: item.solicitante.nome,
        solicitadoEm: formatDateTimePtBr(item.solicitadoEm),
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioBaixas(
    filters: RelatorioBaixaDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const where: Prisma.BaixaPatrimonialWhereInput = {
      ...(filters.motivo ? { motivo: filters.motivo } : {}),
      ...(filters.secretariaId
        ? {
            patrimonio: {
              secretariaAtualId: filters.secretariaId,
            },
          }
        : {}),
    };

    const items = await this.prismaService.baixaPatrimonial.findMany({
      where,
      orderBy: [{ baixadoEm: 'desc' }],
      select: baixaReportSelect,
    });

    const doc = buildBaixaReportDefinition({
      titulo: 'Relatorio de Baixas Patrimoniais',
      subtitulo: 'Itens baixados e respectivos motivos registrados no sistema.',
      filtros: this.buildBaixaFiltersSummary(filters),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: items.length,
      rows: items.map((item) => ({
        tombo: item.patrimonio.tombo,
        item: item.patrimonio.item,
        secretaria: item.patrimonio.secretariaAtual.sigla,
        motivo: item.motivo,
        usuario: item.usuario.nome,
        baixadoEm: formatDateTimePtBr(item.baixadoEm),
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioHistoricoPatrimonio(
    patrimonioId: string,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const patrimonio = await this.prismaService.patrimonio.findUnique({
      where: {
        id: patrimonioId,
      },
      select: patrimonioHistoricoHeaderSelect,
    });

    if (!patrimonio) {
      throw new NotFoundException('Patrimonio nao encontrado para relatorio.');
    }

    const historico = await this.prismaService.historicoPatrimonio.findMany({
      where: {
        patrimonioId,
      },
      orderBy: {
        criadoEm: 'desc',
      },
      select: patrimonioHistoricoSelect,
    });

    const doc = buildPatrimonioHistoricoReportDefinition({
      titulo: 'Historico do Patrimonio',
      subtitulo: 'Trajetoria consolidada do bem no sistema.',
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      patrimonio: {
        tombo: patrimonio.tombo,
        item: patrimonio.item,
        secretaria: patrimonio.secretariaAtual.sigla,
        responsavel: `${patrimonio.responsavelAtual.nome} - ${patrimonio.responsavelAtual.setor}`,
        localizacao: patrimonio.localizacaoAtual,
        status: patrimonio.status,
      },
      rows: historico.map((item) => ({
        evento: item.evento,
        descricao: item.descricao,
        usuario: item.usuario?.nome ?? 'Sistema',
        referencia: item.movimentacao
          ? `Movimentacao ${item.movimentacao.status}`
          : item.baixaPatrimonial
            ? `Baixa ${item.baixaPatrimonial.motivo}`
            : 'Atualizacao direta',
        criadoEm: formatDateTimePtBr(item.criadoEm),
      })),
    });

    return this.renderPdfBuffer(doc);
  }

  async gerarRelatorioAuditoriaMovimentacoes(
    filters: RelatorioAuditoriaMovimentacaoDto,
    actor: AuthenticatedUser,
  ) {
    assertCanEmitRelatorios(actor);

    const movimentacaoWhere: Prisma.MovimentacaoWhereInput = {
      ...(filters.patrimonioId ? { patrimonioId: filters.patrimonioId } : {}),
    };

    const movimentacoesFiltradas = filters.patrimonioId
      ? await this.prismaService.movimentacao.findMany({
          where: movimentacaoWhere,
          select: {
            id: true,
          },
        })
      : null;

    const where: Prisma.AuditoriaWhereInput = {
      entidade: 'Movimentacao',
      ...(filters.acao ? { acao: filters.acao } : {}),
      ...(filters.usuarioId ? { usuarioId: filters.usuarioId } : {}),
      ...(movimentacoesFiltradas
        ? {
            entidadeId: {
              in: movimentacoesFiltradas.map((item) => item.id),
            },
          }
        : {}),
    };

    const auditorias = await this.prismaService.auditoria.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: auditoriaMovimentacaoSelect,
    });

    const movimentacaoIds = Array.from(
      new Set(auditorias.map((item) => item.entidadeId)),
    );

    const movimentacoes = movimentacaoIds.length
      ? await this.prismaService.movimentacao.findMany({
          where: {
            id: {
              in: movimentacaoIds,
            },
          },
          select: auditoriaMovimentacaoItemSelect,
        })
      : [];

    const movimentacaoMap = new Map(
      movimentacoes.map((item) => [item.id, item]),
    );

    const doc = buildAuditoriaMovimentacaoReportDefinition({
      titulo: 'Relatorio de Auditoria de Movimentacoes',
      subtitulo:
        'Eventos auditaveis do fluxo de movimentacao patrimonial no sistema.',
      filtros: this.buildAuditoriaMovimentacaoFiltersSummary(filters),
      geradoEm: formatDateTimePtBr(new Date()),
      geradoPor: actor.nome,
      total: auditorias.length,
      rows: auditorias.map((item) => {
        const movimentacao = movimentacaoMap.get(item.entidadeId);

        return {
          dataHora: formatDateTimePtBr(item.createdAt),
          acao: item.acao,
          usuario: item.usuario?.nome ?? 'Sistema',
          tombo: movimentacao?.patrimonio.tombo ?? '--',
          item:
            movimentacao?.patrimonio.item ?? 'Movimentacao sem item vinculado',
          movimentacao: movimentacao
            ? `${movimentacao.secretariaOrigem.sigla} -> ${movimentacao.secretariaDestino.sigla} (${movimentacao.status})`
            : `ID ${item.entidadeId}`,
          resumo: this.buildAuditoriaMovimentacaoResumo(item),
        };
      }),
    });

    return this.renderPdfBuffer(doc);
  }

  private buildPatrimonioWhere(
    filters: RelatorioPatrimonioDto,
    overrides?: Prisma.PatrimonioWhereInput,
  ): Prisma.PatrimonioWhereInput {
    const localizacaoAtual = normalizeOptionalText(filters.localizacaoAtual);

    return {
      ...(filters.secretariaAtualId
        ? { secretariaAtualId: filters.secretariaAtualId }
        : {}),
      ...(filters.responsavelAtualId
        ? { responsavelAtualId: filters.responsavelAtualId }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(localizacaoAtual
        ? {
            localizacaoAtual: {
              contains: localizacaoAtual,
              mode: 'insensitive',
            },
          }
        : {}),
      ...overrides,
    };
  }

  private buildMovimentacaoWhere(
    filters: RelatorioMovimentacaoDto,
    overrides?: Prisma.MovimentacaoWhereInput,
  ): Prisma.MovimentacaoWhereInput {
    return {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.secretariaId
        ? {
            OR: [
              {
                secretariaOrigemId: filters.secretariaId,
              },
              {
                secretariaDestinoId: filters.secretariaId,
              },
            ],
          }
        : {}),
      ...overrides,
    };
  }

  private buildPatrimonioFiltersSummary(
    filters: RelatorioPatrimonioDto,
    extraSummary: string[] = [],
  ) {
    const summary: string[] = [];

    if (filters.secretariaAtualId) {
      summary.push('Secretaria selecionada');
    }

    if (filters.responsavelAtualId) {
      summary.push('Responsavel selecionado');
    }

    if (filters.status) {
      summary.push(`Status ${filters.status}`);
    }

    const localizacaoAtual = normalizeOptionalText(filters.localizacaoAtual);

    if (localizacaoAtual) {
      summary.push(`Localizacao contendo "${localizacaoAtual}"`);
    }

    return [...summary, ...extraSummary];
  }

  private buildMovimentacaoFiltersSummary(
    filters: RelatorioMovimentacaoDto,
    extraSummary: string[] = [],
  ) {
    const summary: string[] = [];

    if (filters.secretariaId) {
      summary.push('Secretaria selecionada');
    }

    if (filters.status) {
      summary.push(`Status ${filters.status}`);
    }

    return [...summary, ...extraSummary];
  }

  private buildBaixaFiltersSummary(filters: RelatorioBaixaDto) {
    const summary: string[] = [];

    if (filters.secretariaId) {
      summary.push('Secretaria selecionada');
    }

    if (filters.motivo) {
      summary.push(`Motivo ${filters.motivo}`);
    }

    return summary;
  }

  private buildAuditoriaMovimentacaoFiltersSummary(
    filters: RelatorioAuditoriaMovimentacaoDto,
  ) {
    const summary: string[] = [];

    if (filters.acao) {
      summary.push(`Acao ${filters.acao}`);
    }

    if (filters.usuarioId) {
      summary.push('Usuario selecionado');
    }

    if (filters.patrimonioId) {
      summary.push('Patrimonio selecionado');
    }

    return summary;
  }

  private buildAuditoriaMovimentacaoResumo(
    auditoria: Prisma.AuditoriaGetPayload<{
      select: typeof auditoriaMovimentacaoSelect;
    }>,
  ) {
    const contexto = auditoria.contexto;

    if (!contexto || typeof contexto !== 'object' || Array.isArray(contexto)) {
      return `Evento ${auditoria.acao} registrado sem contexto adicional.`;
    }

    const contextoMap = contexto as Record<string, unknown>;
    const partes: string[] = [];

    if (typeof contextoMap.patrimonioTombo === 'string') {
      partes.push(`Tombo ${contextoMap.patrimonioTombo}`);
    }

    if (
      typeof contextoMap.observacoes === 'string' &&
      contextoMap.observacoes.trim()
    ) {
      partes.push(contextoMap.observacoes.trim());
    }

    if (typeof contextoMap.justificativaRejeicao === 'string') {
      partes.push(`Justificativa: ${contextoMap.justificativaRejeicao}`);
    }

    if (!partes.length) {
      return `Evento ${auditoria.acao} registrado para a movimentacao ${auditoria.entidadeId}.`;
    }

    return partes.join(' | ');
  }

  private renderPdfBuffer(documentDefinition: PdfDocumentDefinition) {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const pdfDoc = pdfMake.createPdf(documentDefinition);

        pdfDoc.getBuffer((buffer: Uint8Array) => {
          resolve(Buffer.from(buffer));
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
