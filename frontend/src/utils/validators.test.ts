import { describe, expect, it } from 'vitest'
import { emailRule, normalizeTomboInput } from './validators'

describe('validators', () => {
  it('normaliza o tombo para cinco digitos numericos', () => {
    expect(normalizeTomboInput('12a34-567')).toBe('12345')
  })

  it('mantem a regra padrao de e-mail', () => {
    expect(emailRule).toEqual({
      type: 'email',
      message: 'Informe um e-mail valido.',
    })
  })
})
