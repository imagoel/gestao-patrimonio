import { EstadoConservacao } from '@prisma/client';
import { calcularValorAtualEstimado } from './valor-atual-estimate.util';

describe('calcularValorAtualEstimado', () => {
  it('retorna indisponivel quando nao ha data de aquisicao', () => {
    const result = calcularValorAtualEstimado({
      valorOriginal: 1000,
      estadoConservacao: EstadoConservacao.BOM,
      dataAquisicao: null,
    });

    expect(result.disponivel).toBe(false);
    expect(result.valorSugerido).toBeNull();
  });

  it('calcula a estimativa com depreciacao linear e fator de conservacao', () => {
    const result = calcularValorAtualEstimado({
      valorOriginal: 1000,
      estadoConservacao: EstadoConservacao.BOM,
      dataAquisicao: new Date('2025-01-01T00:00:00Z'),
      referenceDate: new Date('2026-01-01T00:00:00Z'),
    });

    expect(result.disponivel).toBe(true);
    expect(result.idadeMeses).toBe(12);
    expect(result.percentualAplicado).toBe(85.5);
    expect(result.valorSugerido).toBe(855);
  });

  it('respeita o piso residual minimo', () => {
    const result = calcularValorAtualEstimado({
      valorOriginal: 1000,
      estadoConservacao: EstadoConservacao.PESSIMO,
      dataAquisicao: new Date('2000-01-01T00:00:00Z'),
      referenceDate: new Date('2026-01-01T00:00:00Z'),
    });

    expect(result.disponivel).toBe(true);
    expect(result.percentualAplicado).toBe(10);
    expect(result.valorSugerido).toBe(100);
  });
});
