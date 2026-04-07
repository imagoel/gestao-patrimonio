import { EstadoConservacao } from '@prisma/client';

const DEPRECIACAO_ANUAL_PERCENTUAL = 10;
const VALOR_RESIDUAL_PERCENTUAL = 10;

const ESTADO_CONSERVACAO_FACTORS: Record<EstadoConservacao, number> = {
  [EstadoConservacao.EXCELENTE]: 1,
  [EstadoConservacao.BOM]: 0.95,
  [EstadoConservacao.REGULAR]: 0.85,
  [EstadoConservacao.RUIM]: 0.7,
  [EstadoConservacao.PESSIMO]: 0.5,
};

export interface CalcularValorAtualEstimadoInput {
  valorOriginal: number;
  estadoConservacao: EstadoConservacao;
  dataAquisicao?: Date | string | null;
  referenceDate?: Date;
}

export interface ValorAtualEstimadoResultado {
  disponivel: boolean;
  valorSugerido: number | null;
  idadeMeses: number | null;
  fatorConservacao: number;
  fatorTempo: number | null;
  percentualAplicado: number | null;
  taxaDepreciacaoAnualPercentual: number;
  valorResidualPercentual: number;
  regra: string;
  observacao: string;
}

export function calcularValorAtualEstimado(
  input: CalcularValorAtualEstimadoInput,
): ValorAtualEstimadoResultado {
  const regra =
    'Estimativa inicial com depreciacao linear de 10% ao ano, piso residual de 10% do valor original e ajuste pelo estado de conservacao.';
  const fatorConservacao =
    ESTADO_CONSERVACAO_FACTORS[input.estadoConservacao] ?? 1;

  if (!input.dataAquisicao) {
    return {
      disponivel: false,
      valorSugerido: null,
      idadeMeses: null,
      fatorConservacao,
      fatorTempo: null,
      percentualAplicado: null,
      taxaDepreciacaoAnualPercentual: DEPRECIACAO_ANUAL_PERCENTUAL,
      valorResidualPercentual: VALOR_RESIDUAL_PERCENTUAL,
      regra,
      observacao:
        'A estimativa depende da data de aquisicao. Informe esse campo para habilitar o calculo automatico.',
    };
  }

  const dataAquisicao =
    input.dataAquisicao instanceof Date
      ? input.dataAquisicao
      : new Date(input.dataAquisicao);

  if (Number.isNaN(dataAquisicao.getTime())) {
    return {
      disponivel: false,
      valorSugerido: null,
      idadeMeses: null,
      fatorConservacao,
      fatorTempo: null,
      percentualAplicado: null,
      taxaDepreciacaoAnualPercentual: DEPRECIACAO_ANUAL_PERCENTUAL,
      valorResidualPercentual: VALOR_RESIDUAL_PERCENTUAL,
      regra,
      observacao:
        'A data de aquisicao informada nao e valida para gerar a estimativa.',
    };
  }

  const referenceDate = input.referenceDate ?? new Date();
  const idadeMeses = calculateMonthDifference(dataAquisicao, referenceDate);
  const depreciacaoMensal = DEPRECIACAO_ANUAL_PERCENTUAL / 100 / 12;
  const fatorTempoBase = 1 - idadeMeses * depreciacaoMensal;
  const fatorTempo = Math.max(
    VALOR_RESIDUAL_PERCENTUAL / 100,
    Number(fatorTempoBase.toFixed(4)),
  );
  const percentualAplicado = Math.max(
    VALOR_RESIDUAL_PERCENTUAL,
    Number((fatorTempo * fatorConservacao * 100).toFixed(2)),
  );
  const valorSugerido = roundCurrency(
    input.valorOriginal * (percentualAplicado / 100),
  );

  return {
    disponivel: true,
    valorSugerido,
    idadeMeses,
    fatorConservacao,
    fatorTempo,
    percentualAplicado,
    taxaDepreciacaoAnualPercentual: DEPRECIACAO_ANUAL_PERCENTUAL,
    valorResidualPercentual: VALOR_RESIDUAL_PERCENTUAL,
    regra,
    observacao:
      'Essa e uma regra inicial assistiva, implementada enquanto a prefeitura nao formaliza a politica definitiva de valor atual e depreciacao.',
  };
}

function calculateMonthDifference(from: Date, to: Date) {
  if (to <= from) {
    return 0;
  }

  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());

  if (to.getDate() < from.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}
