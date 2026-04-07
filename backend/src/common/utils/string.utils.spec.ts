import {
  normalizeDisplayText,
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeUppercaseText,
} from './string.utils';

describe('string.utils', () => {
  it('normaliza texto opcional com trim', () => {
    expect(normalizeOptionalText('  Sala 01  ')).toBe('Sala 01');
  });

  it('retorna undefined para texto vazio opcional', () => {
    expect(normalizeOptionalText('   ')).toBeUndefined();
  });

  it('normaliza texto obrigatorio', () => {
    expect(normalizeRequiredText('  teste  ')).toBe('teste');
  });

  it('normaliza texto em caixa alta', () => {
    expect(normalizeUppercaseText('  secad  ')).toBe('SECAD');
  });

  it('usa fallback para exibicao', () => {
    expect(normalizeDisplayText(undefined)).toBe('Nao informado');
  });
});
