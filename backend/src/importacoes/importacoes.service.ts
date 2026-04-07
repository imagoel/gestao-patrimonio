import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EstadoConservacao,
  StatusItem,
  TipoEntrada,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PatrimonioService } from '../patrimonio/patrimonio.service';
import type { CreatePatrimonioDto } from '../patrimonio/dto/create-patrimonio.dto';

interface UploadedCsvFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface ParsedCsvRow {
  linha: number;
  values: Record<string, string>;
}

export interface ImportacaoPatrimonioErro {
  linha: number;
  item?: string;
  tombo?: string;
  mensagem: string;
}

export interface ImportacaoPatrimonioResultado {
  arquivo: string;
  processadoEm: string;
  totalLinhas: number;
  importados: number;
  falhas: number;
  erros: ImportacaoPatrimonioErro[];
}

type PatrimonioOptions = Awaited<ReturnType<PatrimonioService['findOptions']>>;

const PATRIMONIO_IMPORT_HEADERS = [
  'item',
  'tombo',
  'secretariaSigla',
  'localizacaoAtual',
  'responsavelNome',
  'responsavelSetor',
  'estadoConservacao',
  'status',
  'fornecedorNome',
  'tipoEntrada',
  'valorOriginal',
  'valorAtual',
  'descricao',
  'dataAquisicao',
  'observacoes',
] as const;

const REQUIRED_HEADERS = [
  'item',
  'tombo',
  'secretariaSigla',
  'localizacaoAtual',
  'responsavelNome',
  'responsavelSetor',
  'estadoConservacao',
  'tipoEntrada',
  'valorOriginal',
] as const;

const DIRECT_STATUS_OPTIONS = [
  StatusItem.ATIVO,
  StatusItem.INATIVO,
  StatusItem.EM_MANUTENCAO,
] as const;

const TEMPLATE_SAMPLE = [
  'Notebook Dell',
  '00025',
  'SEMED',
  'Laboratorio de Informatica',
  'Maria das Dores',
  'Patrimonio',
  'BOM',
  'ATIVO',
  'Fornecedor Exemplo',
  'COMPRA',
  '1450,90',
  '',
  'Equipamento administrativo',
  '2026-03-18',
  'Importacao inicial',
] as const;

@Injectable()
export class ImportacoesService {
  constructor(private readonly patrimonioService: PatrimonioService) {}

  buildPatrimoniosTemplate() {
    return `\uFEFF${PATRIMONIO_IMPORT_HEADERS.join(';')}\n${TEMPLATE_SAMPLE.join(';')}\n`;
  }

  async importPatrimonios(
    file: UploadedCsvFile,
    actor: AuthenticatedUser,
  ): Promise<ImportacaoPatrimonioResultado> {
    this.assertCsvFile(file);

    const rows = this.parseCsv(file.buffer);

    if (!rows.length) {
      throw new BadRequestException(
        'A planilha nao possui linhas preenchidas para importacao.',
      );
    }

    const options = await this.patrimonioService.findOptions(actor);
    const lookups = this.buildLookups(options);
    const erros: ImportacaoPatrimonioErro[] = [];
    let importados = 0;

    for (const row of rows) {
      try {
        const payload = this.mapRowToCreateDto(row, lookups);

        await this.patrimonioService.create(payload, actor);
        importados += 1;
      } catch (error) {
        erros.push({
          linha: row.linha,
          item: this.readValue(row.values, 'item') || undefined,
          tombo: this.readValue(row.values, 'tombo') || undefined,
          mensagem: this.resolveErrorMessage(error),
        });
      }
    }

    return {
      arquivo: file.originalname,
      processadoEm: new Date().toISOString(),
      totalLinhas: rows.length,
      importados,
      falhas: erros.length,
      erros,
    };
  }

  private assertCsvFile(file: UploadedCsvFile) {
    if (!file.buffer?.length) {
      throw new BadRequestException('O arquivo enviado esta vazio.');
    }

    const normalizedName = file.originalname.toLowerCase();

    if (!normalizedName.endsWith('.csv')) {
      throw new BadRequestException(
        'A importacao inicial aceita apenas arquivos CSV.',
      );
    }
  }

  private parseCsv(buffer: Buffer) {
    const content = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const rawLines = content
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    if (!rawLines.length) {
      throw new BadRequestException('O arquivo CSV nao possui conteudo.');
    }

    const delimiter = this.detectDelimiter(rawLines[0]);
    const headers = this.parseCsvLine(rawLines[0], delimiter).map((header) =>
      header.trim(),
    );
    const headerIndexMap = this.buildHeaderIndexMap(headers);

    this.assertRequiredHeaders(headerIndexMap);

    return rawLines
      .slice(1)
      .map((line, index) => {
        const values = this.parseCsvLine(line, delimiter);
        const rowValues: Record<string, string> = {};

        PATRIMONIO_IMPORT_HEADERS.forEach((header) => {
          const columnIndex = headerIndexMap.get(this.normalizeHeader(header));
          rowValues[header] = columnIndex !== undefined ? values[columnIndex] ?? '' : '';
        });

        return {
          linha: index + 2,
          values: rowValues,
        };
      })
      .filter((row) =>
        Object.values(row.values).some((value) => value.trim().length > 0),
      );
  }

  private detectDelimiter(headerLine: string) {
    const semicolonCount = (headerLine.match(/;/g) ?? []).length;
    const commaCount = (headerLine.match(/,/g) ?? []).length;

    return semicolonCount >= commaCount ? ';' : ',';
  }

  private parseCsvLine(line: string, delimiter: string) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (character === '"') {
        const nextCharacter = line[index + 1];

        if (inQuotes && nextCharacter === '"') {
          current += '"';
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (character === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += character;
    }

    if (inQuotes) {
      throw new BadRequestException(
        'Foi encontrada uma linha com aspas abertas sem fechamento no CSV.',
      );
    }

    values.push(current.trim());

    return values;
  }

  private buildHeaderIndexMap(headers: string[]) {
    const map = new Map<string, number>();

    headers.forEach((header, index) => {
      map.set(this.normalizeHeader(header), index);
    });

    return map;
  }

  private assertRequiredHeaders(headerIndexMap: Map<string, number>) {
    const missingHeaders = REQUIRED_HEADERS.filter(
      (header) => !headerIndexMap.has(this.normalizeHeader(header)),
    );

    if (missingHeaders.length) {
      throw new BadRequestException(
        `O CSV nao possui as colunas obrigatorias: ${missingHeaders.join(', ')}.`,
      );
    }
  }

  private buildLookups(options: PatrimonioOptions) {
    const secretariasBySigla = new Map(
      options.secretarias.map((secretaria) => [
        this.normalizeToken(secretaria.sigla),
        secretaria,
      ]),
    );

    const responsavelCandidates = new Map<
      string,
      typeof options.responsaveis
    >();
    const fornecedorCandidates = new Map<
      string,
      typeof options.fornecedores
    >();

    options.responsaveis.forEach((responsavel) => {
      const key = this.buildResponsavelLookupKey({
        secretariaId: responsavel.secretariaId,
        nome: responsavel.nome,
        setor: responsavel.setor,
      });
      const current = responsavelCandidates.get(key) ?? [];

      current.push(responsavel);
      responsavelCandidates.set(key, current);
    });

    options.fornecedores.forEach((fornecedor) => {
      const key = this.normalizeLookupText(fornecedor.nome);
      const current = fornecedorCandidates.get(key) ?? [];

      current.push(fornecedor);
      fornecedorCandidates.set(key, current);
    });

    return {
      secretariasBySigla,
      responsavelCandidates,
      fornecedorCandidates,
    };
  }

  private mapRowToCreateDto(
    row: ParsedCsvRow,
    lookups: ReturnType<ImportacoesService['buildLookups']>,
  ): CreatePatrimonioDto {
    const item = this.requireValue(row.values, 'item', 'Item');
    const tombo = this.requireValue(row.values, 'tombo', 'Tombo');
    const secretariaSigla = this.requireValue(
      row.values,
      'secretariaSigla',
      'Secretaria',
    );
    const localizacaoAtual = this.requireValue(
      row.values,
      'localizacaoAtual',
      'Localizacao atual',
    );
    const responsavelNome = this.requireValue(
      row.values,
      'responsavelNome',
      'Responsavel',
    );
    const responsavelSetor = this.requireValue(
      row.values,
      'responsavelSetor',
      'Setor do responsavel',
    );
    const estadoConservacao = this.parseEnumValue(
      row.values,
      'estadoConservacao',
      'Estado de conservacao',
      EstadoConservacao,
    );
    const tipoEntrada = this.parseEnumValue(
      row.values,
      'tipoEntrada',
      'Tipo de entrada',
      TipoEntrada,
    );
    const statusRaw = this.readValue(row.values, 'status');
    const status = statusRaw
      ? this.parseEnumValue(row.values, 'status', 'Status', DIRECT_STATUS_OPTIONS)
      : StatusItem.ATIVO;

    const secretaria = lookups.secretariasBySigla.get(
      this.normalizeToken(secretariaSigla),
    );

    if (!secretaria) {
      throw new BadRequestException(
        `Secretaria ${secretariaSigla} nao encontrada no escopo disponivel.`,
      );
    }

    const responsavelKey = this.buildResponsavelLookupKey({
      secretariaId: secretaria.id,
      nome: responsavelNome,
      setor: responsavelSetor,
    });
    const responsaveis = lookups.responsavelCandidates.get(responsavelKey) ?? [];

    if (!responsaveis.length) {
      throw new BadRequestException(
        `Responsavel ${responsavelNome} / ${responsavelSetor} nao encontrado para a secretaria ${secretaria.sigla}.`,
      );
    }

    if (responsaveis.length > 1) {
      throw new BadRequestException(
        `Responsavel ${responsavelNome} / ${responsavelSetor} esta ambiguo para a secretaria ${secretaria.sigla}.`,
      );
    }

    const fornecedorNome = this.readValue(row.values, 'fornecedorNome');
    let fornecedorId: string | null = null;

    if (fornecedorNome) {
      const fornecedores =
        lookups.fornecedorCandidates.get(
          this.normalizeLookupText(fornecedorNome),
        ) ?? [];

      if (!fornecedores.length) {
        throw new BadRequestException(
          `Fornecedor ${fornecedorNome} nao encontrado.`,
        );
      }

      if (fornecedores.length > 1) {
        throw new BadRequestException(
          `Fornecedor ${fornecedorNome} esta ambiguo no cadastro atual.`,
        );
      }

      fornecedorId = fornecedores[0].id;
    }

    return {
      item,
      tombo,
      secretariaAtualId: secretaria.id,
      localizacaoAtual,
      responsavelAtualId: responsaveis[0].id,
      estadoConservacao,
      status,
      fornecedorId,
      tipoEntrada,
      valorOriginal: this.parseDecimal(row.values, 'valorOriginal', 'Valor original'),
      valorAtual: this.parseOptionalDecimal(row.values, 'valorAtual'),
      descricao: this.readValue(row.values, 'descricao') || null,
      dataAquisicao: this.parseOptionalDate(row.values, 'dataAquisicao'),
      observacoes: this.readValue(row.values, 'observacoes') || null,
    };
  }

  private requireValue(
    values: Record<string, string>,
    field: (typeof PATRIMONIO_IMPORT_HEADERS)[number],
    label: string,
  ) {
    const value = this.readValue(values, field);

    if (!value) {
      throw new BadRequestException(`${label} e obrigatorio na planilha.`);
    }

    return value;
  }

  private readValue(
    values: Record<string, string>,
    field: (typeof PATRIMONIO_IMPORT_HEADERS)[number],
  ) {
    return (values[field] ?? '').trim();
  }

  private parseEnumValue<T extends string>(
    values: Record<string, string>,
    field: (typeof PATRIMONIO_IMPORT_HEADERS)[number],
    label: string,
    enumValues: Record<string, T> | readonly T[],
  ) {
    const rawValue = this.requireValue(values, field, label);
    const normalizedValue = this.normalizeToken(rawValue);
    const availableValues = Array.isArray(enumValues)
      ? [...enumValues]
      : Object.values(enumValues);
    const resolvedValue = availableValues.find(
      (candidate) => this.normalizeToken(candidate) === normalizedValue,
    );

    if (!resolvedValue) {
      throw new BadRequestException(
        `${label} invalido: ${rawValue}. Valores aceitos: ${availableValues.join(', ')}.`,
      );
    }

    return resolvedValue;
  }

  private parseDecimal(
    values: Record<string, string>,
    field: (typeof PATRIMONIO_IMPORT_HEADERS)[number],
    label: string,
  ) {
    const rawValue = this.requireValue(values, field, label);
    const normalized = rawValue.replace(/\s+/g, '');
    let decimalValue = normalized;

    if (normalized.includes(',') && normalized.includes('.')) {
      decimalValue =
        normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
          ? normalized.replace(/\./g, '').replace(',', '.')
          : normalized.replace(/,/g, '');
    } else if (normalized.includes(',')) {
      decimalValue = normalized.replace(',', '.');
    }

    const parsedValue = Number(decimalValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      throw new BadRequestException(
        `${label} invalido: ${rawValue}. Informe um numero positivo.`,
      );
    }

    return parsedValue;
  }

  private parseOptionalDecimal(
    values: Record<string, string>,
    field: (typeof PATRIMONIO_IMPORT_HEADERS)[number],
  ) {
    const rawValue = this.readValue(values, field);

    if (!rawValue) {
      return null;
    }

    return this.parseDecimal(values, field, 'Valor atual');
  }

  private parseOptionalDate(
    values: Record<string, string>,
    field: (typeof PATRIMONIO_IMPORT_HEADERS)[number],
  ) {
    const rawValue = this.readValue(values, field);

    if (!rawValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      return rawValue;
    }

    const brazilianMatch = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (brazilianMatch) {
      const [, day, month, year] = brazilianMatch;

      return `${year}-${month}-${day}`;
    }

    throw new BadRequestException(
      `Data de aquisicao invalida: ${rawValue}. Use YYYY-MM-DD ou DD/MM/YYYY.`,
    );
  }

  private buildResponsavelLookupKey(input: {
    secretariaId: string;
    nome: string;
    setor: string;
  }) {
    return [
      input.secretariaId,
      this.normalizeLookupText(input.nome),
      this.normalizeLookupText(input.setor),
    ].join('::');
  }

  private normalizeHeader(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeLookupText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private normalizeToken(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private resolveErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Falha inesperada ao importar a linha.';
  }
}
