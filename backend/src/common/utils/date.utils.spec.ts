import {
  buildIsoDateStamp,
  formatDatePtBr,
  formatDateTimePtBr,
} from './date.utils';

describe('date.utils', () => {
  it('formata data em pt-BR', () => {
    expect(formatDatePtBr('2026-04-06T12:34:56.000Z')).toBe('06/04/2026');
  });

  it('formata data e hora em pt-BR', () => {
    expect(formatDateTimePtBr('2026-04-06T12:34:56.000Z')).toContain(
      '06/04/2026',
    );
  });

  it('gera carimbo ISO de data', () => {
    expect(buildIsoDateStamp('2026-04-06T12:34:56.000Z')).toBe('2026-04-06');
  });
});
