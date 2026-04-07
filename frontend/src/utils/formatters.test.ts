import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
} from './formatters'

describe('formatters', () => {
  it('formata moeda em pt-BR', () => {
    expect(formatCurrency(1500.5).replace(/\s/g, ' ')).toBe('R$ 1.500,50')
  })

  it('formata data simples', () => {
    expect(formatDate('2026-04-06T12:30:15.000Z')).toBe('06/04/2026')
  })

  it('formata data e hora', () => {
    expect(formatDateTime('2026-04-06T12:30:15.000Z')).toMatch(
      /^06\/04\/2026 \d{2}:\d{2}$/,
    )
  })

  it('formata data e hora com segundos', () => {
    expect(formatDateTimeWithSeconds('2026-04-06T12:30:15.000Z')).toMatch(
      /^06\/04\/2026 \d{2}:\d{2}:\d{2}$/,
    )
  })
})
